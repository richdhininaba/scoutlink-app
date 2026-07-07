'use strict';

const { supabase } = require('../db/supabase');
const email = require('./email');
const config = require('../config');

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'messages', label: 'Messages' },
  { key: 'scout_interest', label: 'Scout interest' },
  { key: 'match_fact', label: 'Match facts' },
  { key: 'recruitment', label: 'Recruitment' },
  { key: 'fixtures_events', label: 'Fixtures / Events' },
  { key: 'system', label: 'System' }
];

const ENUM_TYPES = new Set([
  'scout_interest',
  'match_fact',
  'recruitment',
  'system',
  'chat_started',
  'chat_message',
  'fixture_attendance',
  'admin_message',
  'showcase_event'
]);

function safeString(value, max = 1200) {
  return String(value == null ? '' : value)
    .replace(/[<>]/g, '')
    .replace(/\r\n/g, '\n')
    .slice(0, max)
    .trim();
}

function stripLoginCodesFromText(value) {
  return safeString(value, 3000)
    .replace(/\b(login code|code)\s*[:\-]?\s*[A-Z0-9-]{4,16}\b/ig, 'setup email')
    .replace(/\bLogin codes\s*:\s*[^.]+/ig, 'Setup emails');
}

function safeData(data) {
  if (!data || typeof data !== 'object') return {};
  if (Array.isArray(data)) return data.map(safeData);
  const out = {};
  Object.keys(data).forEach((key) => {
    if (/^(login_code|loginCode|login_code_expires|loginCodeExpires|password|temporaryPassword|tempPassword)$/i.test(key)) return;
    const value = data[key];
    if (value && typeof value === 'object') out[key] = safeData(value);
    else out[key] = typeof value === 'string' ? stripLoginCodesFromText(value) : value;
  });
  return out;
}

function rolePath(role, target) {
  const r = String(role || '').toLowerCase();
  if (target === 'chat') {
    if (r === 'coach') return '/coach/chat';
    if (r === 'scout') return '/scout/chat';
    if (r === 'stratex') return '/stratex/messages';
  }
  if (target === 'fixture') {
    if (r === 'coach') return '/coach/fixtures';
    if (r === 'scout') return '/scout/fixtures';
  }
  if (target === 'player') {
    if (r === 'coach') return '/coach/my-players';
    if (r === 'scout') return '/scout/player-search';
    if (r === 'player') return '/player/profile';
    if (r === 'stratex') return '/stratex/players';
  }
  if (target === 'match_fact') {
    if (r === 'coach') return '/coach/match-facts';
    if (r === 'player') return '/player/profile';
  }
  if (target === 'pipeline') return r === 'scout' ? '/scout/pipeline' : '/coach/my-players';
  if (target === 'showcase_event') return r === 'stratex' ? '/stratex/showcase-events' : '/scout/events';
  return r === 'stratex' ? '/stratex/notifications' : '/' + r + '/notifications';
}

function withParam(path, key, value) {
  if (!value) return path;
  return path + (path.indexOf('?') >= 0 ? '&' : '?') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
}

function deriveAction(row) {
  const type = row.notification_type || row.notificationType || 'system';
  const data = safeData(row.data || {});
  const role = row.recipient_type || row.recipientType;
  const explicit = typeof data.actionUrl === 'string' && data.actionUrl.startsWith('/') ? data.actionUrl : '';
  const lowered = String(type || '').toLowerCase();
  const source = String(data.source || data.type || '').toLowerCase();
  let filterGroup = 'system';
  let typeLabel = 'System';
  let targetType = data.targetType || 'system';
  let targetId = data.targetId || null;
  let actionLabel = 'View notification';
  let actionUrl = explicit;

  if (lowered === 'chat_message' || lowered === 'chat_started' || lowered === 'admin_message') {
    filterGroup = 'messages';
    typeLabel = lowered === 'chat_started' ? 'Chat started' : 'Message';
    targetType = 'chat_thread';
    targetId = data.threadId || data.thread_id || data.targetId || null;
    actionLabel = 'Open chat';
    actionUrl = actionUrl || withParam(rolePath(role, 'chat'), 'threadId', targetId);
  } else if (lowered === 'fixture_attendance') {
    filterGroup = 'fixtures_events';
    typeLabel = 'Fixture';
    targetType = 'fixture';
    targetId = data.fixtureId || data.fixture_id || data.targetId || null;
    actionLabel = 'View fixture';
    actionUrl = actionUrl || withParam(rolePath(role, 'fixture'), 'fixtureId', targetId);
  } else if (lowered === 'scout_interest') {
    filterGroup = 'scout_interest';
    typeLabel = 'Scout interest';
    targetType = 'player';
    targetId = data.playerId || data.player_id || data.targetId || row.recipient_id;
    actionLabel = 'View player interest';
    actionUrl = actionUrl || withParam(rolePath(role, 'player'), 'playerId', targetId);
  } else if (lowered === 'match_fact') {
    filterGroup = 'match_fact';
    typeLabel = 'Match facts';
    targetType = 'match_fact';
    targetId = data.matchFactId || data.match_fact_id || data.targetId || null;
    actionLabel = 'View match facts';
    actionUrl = actionUrl || withParam(withParam(rolePath(role, 'match_fact'), 'matchFactId', targetId), 'playerId', data.playerId || data.player_id || '');
  } else if (lowered === 'recruitment') {
    filterGroup = 'recruitment';
    typeLabel = 'Recruitment';
    targetType = 'pipeline';
    targetId = data.pipelineId || data.pipeline_id || data.targetId || null;
    actionLabel = 'View pipeline';
    actionUrl = actionUrl || withParam(withParam(rolePath(role, 'pipeline'), 'pipelineId', targetId), 'playerId', data.playerId || data.player_id || '');
  } else if (lowered === 'showcase_event' || source.indexOf('showcase') >= 0 || data.eventId || data.event_id) {
    filterGroup = 'fixtures_events';
    typeLabel = 'Event';
    targetType = 'showcase_event';
    targetId = data.eventId || data.event_id || data.targetId || null;
    actionLabel = 'View event';
    actionUrl = actionUrl || withParam(rolePath(role, 'showcase_event'), 'eventId', targetId);
  }

  if (actionUrl && actionUrl.indexOf('=') >= 0 && /=$/.test(actionUrl)) actionUrl = '';

  return { filterGroup, typeLabel, targetType, targetId, actionLabel, actionUrl };
}

function formatNotification(row) {
  const action = deriveAction(row);
  const data = safeData(row.data || {});
  return {
    ...row,
    data,
    notificationType: row.notification_type || 'system',
    filterGroup: action.filterGroup,
    typeLabel: action.typeLabel,
    isRead: !!row.is_read,
    is_read: !!row.is_read,
    read: !!row.is_read,
    createdAt: row.created_at,
    actionUrl: action.actionUrl,
    actionLabel: action.actionLabel,
    targetType: action.targetType,
    targetId: action.targetId,
    canOpen: !!(action.actionUrl || row.title || row.body),
    canAct: !!action.actionUrl,
    emailSent: !!row.email_sent,
    email_sent: !!row.email_sent,
    emailSentAt: row.email_sent_at || null,
    sendgridTemplateId: row.sendgrid_template_id || null,
    title: stripLoginCodesFromText(row.title || 'Notification'),
    body: stripLoginCodesFromText(row.body || '')
  };
}

async function loadRecipient(role, id) {
  const table = role === 'Coach' ? 'coaches' : role === 'Scout' ? 'scouts' : role === 'Player' ? 'players' : role === 'Stratex' ? 'stratex' : null;
  if (!table || !id) return null;
  const select = table === 'scouts'
    ? 'id,first_name,last_name,email,club_name,scout_team_id'
    : table === 'coaches'
      ? 'id,first_name,last_name,email,team_name,team_id'
      : 'id,first_name,last_name,email';
  const { data, error } = await supabase.from(table).select(select).eq('id', id).maybeSingle();
  if (error) throw error;
  return data || null;
}

function absoluteActionUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return String(config.brandUrl || 'https://scoutlink.app').replace(/\/+$/, '') + path;
}

function safeError(err) {
  const message = String(err?.message || err || 'SendGrid send failed').replace(/[<>]/g, '').slice(0, 240);
  return message || 'SendGrid send failed';
}

async function sendCoachScoutEmail(notification) {
  if (!['Coach', 'Scout'].includes(notification.recipient_type)) return null;
  const recipient = await loadRecipient(notification.recipient_type, notification.recipient_id);
  if (!recipient || !recipient.email) return { success: false, error: 'Recipient email unavailable' };
  const formatted = formatNotification(notification);
  const data = formatted.data || {};
  const playerName = data.playerName || data.player_name || '';
  const teamName = data.teamName || data.team_name || recipient.team_name || recipient.club_name || '';
  const result = await email.sendNotification({
    to: recipient.email,
    firstName: recipient.first_name || 'there',
    notificationTitle: formatted.title,
    notificationBody: formatted.body,
    notificationTypeLabel: formatted.typeLabel,
    playerName,
    teamName,
    submittedAt: email.prettyDate(notification.created_at),
    actionLabel: formatted.actionLabel,
    actionUrl: absoluteActionUrl(formatted.actionUrl),
    notification_id: notification.id,
    notificationId: notification.id,
    year: String(new Date().getFullYear())
  });
  const update = {
    email_sent: !!result?.success,
    email_sent_at: result?.success ? new Date().toISOString() : null,
    email_error_safe: result?.success ? null : safeError(result?.error || 'SendGrid did not accept notification email'),
    sendgrid_template_id: result?.templateId || config.sendgrid.templates.notification || null
  };
  try {
    await supabase.from('notifications').update(update).eq('id', notification.id);
  } catch (err) {
    console.warn('[Notification email audit update skipped]', safeError(err));
  }
  return result;
}

async function createNotification(payload, options = {}) {
  const type = ENUM_TYPES.has(payload.notification_type || payload.notificationType) ? (payload.notification_type || payload.notificationType) : 'system';
  const data = safeData(payload.data || {});
  const rowPayload = {
    recipient_id: payload.recipient_id || payload.recipientId,
    recipient_type: payload.recipient_type || payload.recipientType,
    notification_type: type,
    title: stripLoginCodesFromText(payload.title || 'ScoutLink notification'),
    body: stripLoginCodesFromText(payload.body || ''),
    data,
    is_read: false,
    email_sent: false
  };
  const { data: row, error } = await supabase.from('notifications').insert(rowPayload).select().single();
  if (error) throw error;
  if (options.sendEmail !== false && ['Coach', 'Scout'].includes(row.recipient_type)) {
    try {
      await sendCoachScoutEmail(row);
    } catch (err) {
      try {
        await supabase.from('notifications').update({ email_error_safe: safeError(err) }).eq('id', row.id);
      } catch (_) {}
      console.warn('[Notification email skipped]', safeError(err));
    }
  }
  return row;
}

async function createNotifications(rows, options = {}) {
  const created = [];
  for (const row of rows || []) {
    created.push(await createNotification(row, options));
  }
  return created;
}

module.exports = {
  FILTERS,
  deriveAction,
  formatNotification,
  createNotification,
  createNotifications,
  sendCoachScoutEmail,
  safeData,
  stripLoginCodesFromText
};
