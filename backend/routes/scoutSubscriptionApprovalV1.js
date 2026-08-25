'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const { requireStratexAdminPermission } = require('../utils/stratexPermissions');
const email = require('../services/email');
const { normalizePlan, createCheckoutForRegistration } = require('../services/scoutSubscriptionBilling');

const requireRegistrationsAdmin = requireStratexAdminPermission(
  'registrations',
  'Registration review is restricted to authorised Stratex admins.'
);

function uploadedDocuments(row) {
  return Array.isArray(row && row.safeguarding_documents) ? row.safeguarding_documents : [];
}

function validateScoutSafeguardingReview(review) {
  review = review || {};
  const checklist = review.checklist || {};
  const required = [
    'identity',
    'dbs',
    'faCredentials',
    'clubAssociation',
    'contactDetails',
    'noSafeguardingFlags',
    'termsAccepted'
  ];
  const missing = required.filter(key => checklist[key] !== true);
  const docs = Array.isArray(review.documents) ? review.documents : [];
  const dbsDate = review.dbsIssueDate ? new Date(review.dbsIssueDate) : null;
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);

  if (missing.length) {
    return { ok: false, error: 'Scout approval blocked. Complete every safeguarding gate: ' + missing.join(', ') };
  }
  if (!review.dbsCertificateNumber) return { ok: false, error: 'DBS certificate number is required.' };
  if (!dbsDate || Number.isNaN(dbsDate.getTime())) return { ok: false, error: 'DBS issue date is required.' };
  if (dbsDate < threeYearsAgo) return { ok: false, error: 'Enhanced DBS issue date must be within the last three years.' };
  if (String(review.dbsLevel || '').toLowerCase() !== 'enhanced') return { ok: false, error: 'DBS level must be enhanced.' };
  if (!docs.length) return { ok: false, error: 'Attach at least one safeguarding document before approving a scout.' };
  return { ok: true };
}

async function requestById(id) {
  const { data, error } = await supabase
    .from('registration_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function insertVerificationReview(request, review, reviewerId) {
  const insert = await supabase.from('scout_verification_reviews').insert({
    registration_request_id: request.id,
    scout_id: null,
    reviewed_by: reviewerId || null,
    checklist: review.checklist || {},
    documents: review.documents || [],
    dbs_certificate_number: review.dbsCertificateNumber || null,
    dbs_issue_date: review.dbsIssueDate || null,
    dbs_level: review.dbsLevel || null,
    status: 'verified_awaiting_payment',
    notes: review.notes || null
  });
  if (insert.error) throw insert.error;
}

router.post('/:id/approve', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req, res, next) => {
  try {
    const request = await requestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Registration request not found' });

    if (String(request.account_type || '').toLowerCase() !== 'scout') {
      return next();
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Registration is not pending.' });
    }
    if (request.verification_status !== 'documents_submitted') {
      return res.status(400).json({ error: 'Scout verification documents must be submitted before review.' });
    }

    const uploadedDocs = uploadedDocuments(request);
    const review = Object.assign({}, req.body && req.body.safeguardingReview || {}, {
      documents: uploadedDocs
    });
    const validation = validateScoutSafeguardingReview(review);
    if (!validation.ok) return res.status(400).json({ error: validation.error });

    const plan = normalizePlan(request.preferred_scout_plan || 'Core');
    const checkout = await createCheckoutForRegistration(
      Object.assign({}, request, { preferred_scout_plan: plan }),
      { replaceExisting: true }
    );

    const paymentResult = await email.sendScoutPaymentRequired({
      to: request.email,
      firstName: request.first_name,
      planName: plan,
      paymentLink: checkout.session.url
    }).catch(error => ({ success: false, error: error.message }));

    if (!paymentResult || !paymentResult.success) {
      try {
        if (checkout.session.status === 'open') {
          await require('../services/scoutSubscriptionBilling').stripe().checkout.sessions.expire(checkout.session.id);
        }
      } catch (_) {}
      return res.status(502).json({
        error: 'SendGrid did not accept the Scout payment email. No active payment link has been left behind.',
        details: paymentResult && (paymentResult.error || paymentResult.details) || 'Unknown email error'
      });
    }

    const update = await supabase.from('registration_requests').update({
      status: 'pending',
      verification_status: 'verified_awaiting_payment',
      payment_plan: plan,
      payment_link: checkout.session.url,
      payment_email_sent_at: new Date().toISOString(),
      safeguarding_review: review,
      safeguarding_documents: uploadedDocs,
      reviewed_by: req.user.email || 'stratex',
      reviewed_at: new Date().toISOString(),
      stripe_checkout_session_id: checkout.session.id,
      stripe_price_id: checkout.price.id,
      stripe_product_id: typeof checkout.price.product === 'string'
        ? checkout.price.product
        : checkout.price.product && checkout.price.product.id || null,
      stripe_customer_id: typeof checkout.session.customer === 'string'
        ? checkout.session.customer
        : checkout.session.customer && checkout.session.customer.id || null,
      stripe_payment_status: checkout.session.payment_status || checkout.session.status || 'unpaid',
      stripe_checkout_created_at: checkout.session.created
        ? new Date(checkout.session.created * 1000).toISOString()
        : new Date().toISOString(),
      stripe_checkout_expires_at: checkout.session.expires_at
        ? new Date(checkout.session.expires_at * 1000).toISOString()
        : null,
      stripe_amount_total: checkout.session.amount_total == null ? null : Number(checkout.session.amount_total),
      stripe_currency: String(checkout.session.currency || checkout.price.currency || 'gbp').toLowerCase()
    }).eq('id', request.id);
    if (update.error) throw update.error;

    await insertVerificationReview(request, review, req.user.id || null);

    return res.json({
      message: 'Scout verified. A Stripe Checkout link for the Scout-selected plan has been emailed automatically.',
      paymentEmailSent: true,
      plan,
      checkoutSessionId: checkout.session.id,
      checkoutUrl: checkout.session.url,
      expiresAt: checkout.session.expires_at
        ? new Date(checkout.session.expires_at * 1000).toISOString()
        : null,
      emailTemplate: paymentResult.template || null
    });
  } catch (error) {
    console.error('[Stripe Scout approval]', error);
    return res.status(500).json({ error: error.message || 'Scout approval could not be completed.' });
  }
});

router.post('/:id/resend-payment', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req, res, next) => {
  try {
    const request = await requestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Registration request not found' });
    if (String(request.account_type || '').toLowerCase() !== 'scout' || !request.stripe_checkout_session_id) {
      return next();
    }
    if (request.status !== 'pending' || request.verification_status !== 'verified_awaiting_payment') {
      return res.status(400).json({ error: 'The Scout must be verified and awaiting payment.' });
    }

    const checkout = await createCheckoutForRegistration(request, { replaceExisting: true });
    const result = await email.sendScoutPaymentRequired({
      to: request.email,
      firstName: request.first_name,
      planName: checkout.plan,
      paymentLink: checkout.session.url
    }).catch(error => ({ success: false, error: error.message }));

    if (!result || !result.success) {
      return res.status(502).json({
        error: 'The Stripe payment email was not accepted.',
        details: result && (result.error || result.details) || 'Unknown email error'
      });
    }

    const update = await supabase.from('registration_requests').update({
      payment_plan: checkout.plan,
      payment_link: checkout.session.url,
      payment_email_sent_at: new Date().toISOString(),
      payment_email_resent_at: new Date().toISOString(),
      reviewed_by: req.user.email || 'stratex',
      reviewed_at: new Date().toISOString(),
      stripe_checkout_session_id: checkout.session.id,
      stripe_price_id: checkout.price.id,
      stripe_product_id: typeof checkout.price.product === 'string'
        ? checkout.price.product
        : checkout.price.product && checkout.price.product.id || null,
      stripe_payment_status: checkout.session.payment_status || checkout.session.status || 'unpaid',
      stripe_checkout_created_at: checkout.session.created
        ? new Date(checkout.session.created * 1000).toISOString()
        : new Date().toISOString(),
      stripe_checkout_expires_at: checkout.session.expires_at
        ? new Date(checkout.session.expires_at * 1000).toISOString()
        : null
    }).eq('id', request.id);
    if (update.error) throw update.error;

    return res.json({
      message: 'A fresh Stripe Checkout link has been generated and emailed.',
      checkoutUrl: checkout.session.url,
      checkoutSessionId: checkout.session.id,
      plan: checkout.plan
    });
  } catch (error) {
    console.error('[Resend Stripe Scout payment]', error);
    return res.status(500).json({ error: error.message || 'Could not resend the Scout payment link.' });
  }
});

router.post('/:id/payment-received', requireAuth, requireRole('Stratex'), requireRegistrationsAdmin, async (req, res, next) => {
  try {
    const request = await requestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Registration request not found' });

    if (String(request.account_type || '').toLowerCase() !== 'scout' || !request.stripe_checkout_session_id) {
      return next();
    }

    return res.status(409).json({
      error: 'This Scout uses Stripe Checkout. Payment is confirmed automatically by the verified Stripe webhook; manual payment activation is disabled.'
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Could not inspect Scout payment state.' });
  }
});

module.exports = router;
