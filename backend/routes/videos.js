'use strict';

const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');

const MAX_VIDEO_UPLOAD_BYTES = 4 * 1024 * 1024;
const VIDEO_TOO_LARGE_MESSAGE = 'This video is too large to upload. Please choose a smaller file.';
const MODERATION = new Set(['pending','approved','rejected']);
const PUBLIC_SCOUTLINK_ORIGIN = 'https://scoutlink.app';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_UPLOAD_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('video/')) return cb(new Error('Only video files can be uploaded'));
    cb(null, true);
  }
});

function uploadSingleVideo(req, res, next) {
  upload.single('file')(req, res, err => {
    if (!err) return next();
    const isTooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(isTooLarge ? 413 : 400).json({ error: isTooLarge ? VIDEO_TOO_LARGE_MESSAGE : err.message });
  });
}

function accountType(req) {
  return String(req.user?.accountType || req.user?.role || '');
}

function isStratexAccount(user) {
  const type = String(user?.accountType || user?.role || '').toLowerCase();
  return type === 'stratex' || type === 'stratex admin' || type === 'stratex_admin';
}

async function getCoachTeam(userId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('id,first_name,last_name,team_id,team_name,is_super_user')
    .eq('id', userId)
    .maybeSingle();
  if (error) console.error('[Videos] coach lookup error:', error.message);
  return data || null;
}

function storageRef(filePath) {
  return filePath ? 'storage://player-videos/' + filePath : null;
}

function externalVideoMeta(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text || text.length > 2048) {
    const error = new Error('Enter a valid video share URL.');
    error.status = 400;
    throw error;
  }
  let parsed;
  try { parsed = new URL(text); } catch (_) {
    const error = new Error('Enter a valid video share URL.');
    error.status = 400;
    throw error;
  }
  if (parsed.protocol !== 'https:') {
    const error = new Error('Video share links must use https://');
    error.status = 400;
    throw error;
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let provider = 'External video';
  if (host === 'youtu.be' || host.endsWith('youtube.com')) provider = 'YouTube';
  else if (host.endsWith('drive.google.com') || host.endsWith('docs.google.com')) provider = 'Google Drive';
  else if (host.endsWith('dropbox.com') || host.endsWith('dropboxusercontent.com')) provider = 'Dropbox';
  else if (host.endsWith('veo.co') || host.endsWith('veo.live')) provider = 'Veo';
  else if (host.endsWith('wyscout.com')) provider = 'Wyscout';
  else if (host.endsWith('tonsser.com')) provider = 'Tonsser';
  else if (host.endsWith('vimeo.com')) provider = 'Vimeo';
  return { url: parsed.toString(), provider };
}

async function markUploadLinkUsed(link) {
  if (!link?.id) return;
  const { error } = await supabase
    .from('player_video_upload_links')
    .update({ used_at: new Date().toISOString() })
    .eq('id', link.id);
  if (error) console.warn('[Videos] upload-link usage update skipped:', error.message);
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function uploadTokenSecret() {
  return config.jwtSecret || config.secretKey || null;
}

function signUploadPayload(payload) {
  const secret = uploadTokenSecret();
  if (!secret) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return 'slv1.' + encoded + '.' + signature;
}

function verifyUploadPayload(rawToken) {
  try {
    if (!String(rawToken || '').startsWith('slv1.')) return null;
    const secret = uploadTokenSecret();
    if (!secret) return null;
    const parts = String(rawToken).split('.');
    if (parts.length !== 3) return null;
    const expected = crypto.createHmac('sha256', secret).update(parts[1]).digest('base64url');
    const given = Buffer.from(parts[2]);
    const want = Buffer.from(expected);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.exp || Number(payload.exp) < Date.now()) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

async function loadPlayerForUploadLink(playerId) {
  const { data, error } = await supabase
    .from('players')
    .select('id,first_name,last_name,team_id,team_name,assigned_coach_id,is_active')
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function assertCanManagePlayerVideo(req, playerId) {
  const player = await loadPlayerForUploadLink(playerId);
  if (!player || player.is_active === false) {
    const e = new Error('Player not found');
    e.status = 404;
    throw e;
  }
  if (isStratexAccount(req.user)) return { player, coach: null };
  const coach = await getCoachTeam(req.user.id);
  const sameTeamId = coach && coach.team_id && player.team_id === coach.team_id;
  const sameTeam = coach && (
    player.assigned_coach_id === req.user.id ||
    (!player.assigned_coach_id && sameTeamId) ||
    (coach.is_super_user && sameTeamId)
  );
  if (!sameTeam) {
    const e = new Error('You can only manage video for players in your workspace.');
    e.status = 403;
    throw e;
  }
  return { player, coach };
}

async function assertCanManageVideo(req, video) {
  if (isStratexAccount(req.user)) return true;
  if (accountType(req) !== 'Coach') return false;
  const coach = await getCoachTeam(req.user.id);
  if (!coach || !video) return false;
  if (coach.is_super_user && coach.team_id && video.team_id === coach.team_id) return true;
  if (video.coach_id === coach.id) return true;
  if (video.player_id) {
    const player = await loadPlayerForUploadLink(video.player_id);
    return !!(player && (
      player.assigned_coach_id === coach.id ||
      (coach.is_super_user && coach.team_id && player.team_id === coach.team_id)
    ));
  }
  return false;
}

async function getActiveUploadLink(rawToken) {
  const stateless = verifyUploadPayload(rawToken);
  if (stateless) {
    const player = await loadPlayerForUploadLink(stateless.playerId);
    if (!player || player.is_active === false) return null;
    return {
      id: null,
      player_id: player.id,
      coach_id: stateless.coachId || null,
      team_id: stateless.teamId || player.team_id || null,
      created_by: stateless.createdBy || null,
      created_by_type: stateless.createdByType || 'Coach',
      expires_at: new Date(Number(stateless.exp)).toISOString(),
      is_active: true,
      players: player
    };
  }

  const hash = tokenHash(rawToken);
  const { data, error } = await supabase
    .from('player_video_upload_links')
    .select('*, players(id,first_name,last_name,team_name,is_active)')
    .eq('token_hash', hash)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.expires_at && new Date(data.expires_at) < new Date()) || data.players?.is_active === false) return null;
  return data;
}

async function ensurePrivateVideoBucket() {
  const options = {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024,
    allowedMimeTypes: ['video/mp4','video/webm','video/quicktime','video/x-msvideo']
  };
  await supabase.storage.createBucket('player-videos', options).catch(() => {});
  await supabase.storage.updateBucket('player-videos', options).catch(() => {});
}

async function attachSignedVideoUrls(rows) {
  const list = Array.isArray(rows) ? rows : [];
  await Promise.all(list.map(async video => {
    if (!video || !video.file_path) return;
    const { data, error } = await supabase.storage
      .from('player-videos')
      .createSignedUrl(video.file_path, 60 * 30);
    if (!error && data?.signedUrl) {
      video.signed_url = data.signedUrl;
      video.video_url = data.signedUrl;
      video.url = data.signedUrl;
    } else {
      video.signed_url = null;
      video.video_url = storageRef(video.file_path);
      video.url = storageRef(video.file_path);
    }
  }));
  return list;
}

async function requesterForLink(link) {
  if (!link?.coach_id) return null;
  const { data } = await supabase
    .from('coaches')
    .select('id,first_name,last_name,team_name')
    .eq('id', link.coach_id)
    .maybeSingle();
  return data || null;
}

router.post('/upload-link', requireAuth, requireRole('Coach','Stratex','Stratex Admin'), async (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const { player, coach } = await assertCanManagePlayerVideo(req, playerId);
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const createdByType = isStratexAccount(req.user) ? 'Stratex' : 'Coach';
    const linkPayload = {
      player_id: player.id,
      coach_id: createdByType === 'Coach' ? req.user.id : null,
      team_id: player.team_id || coach?.team_id || null,
      token_hash: tokenHash(rawToken),
      expires_at: expiresAt,
      created_by: req.user.id,
      created_by_type: createdByType,
      is_active: true
    };

    const { data, error } = await supabase
      .from('player_video_upload_links')
      .insert(linkPayload)
      .select('id,expires_at')
      .single();

    let uploadToken = rawToken;
    let uploadLinkId = data?.id || null;
    let responseExpiresAt = data?.expires_at || expiresAt;
    let linkMode = 'database';

    if (error) {
      const fallback = signUploadPayload({
        playerId: player.id,
        coachId: linkPayload.coach_id,
        teamId: linkPayload.team_id,
        createdBy: req.user.id,
        createdByType,
        exp: new Date(expiresAt).getTime()
      });
      if (!fallback) throw error;
      console.warn('[Videos upload-link] database insert failed; using signed fallback', { code: error.code, message: error.message });
      uploadToken = fallback;
      linkMode = 'signed-token';
    }

    const cleanPath = '/video-upload?token=' + encodeURIComponent(uploadToken);

    res.status(201).json({
      uploadLinkId,
      uploadPath: cleanPath,
      uploadUrl: PUBLIC_SCOUTLINK_ORIGIN + cleanPath,
      cleanUploadUrl: PUBLIC_SCOUTLINK_ORIGIN + cleanPath,
      staticUploadUrl: PUBLIC_SCOUTLINK_ORIGIN + cleanPath,
      expiresAt: responseExpiresAt,
      mode: linkMode,
      player: { id: player.id, firstName: player.first_name, lastName: player.last_name, teamName: player.team_name }
    });
  } catch (err) {
    console.error('[Videos upload-link]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not generate video upload link' });
  }
});

router.get('/upload-link/:token', async (req, res) => {
  try {
    const link = await getActiveUploadLink(req.params.token);
    if (!link) return res.status(404).json({ error: 'This upload link is invalid or has expired.' });
    res.json({
      player: {
        id: link.players.id,
        firstName: link.players.first_name,
        lastName: link.players.last_name,
        teamName: link.players.team_name
      },
      requestedBy: await requesterForLink(link),
      expiresAt: link.expires_at,
      safeguarding: 'Nothing uploaded through this link is visible to scouts until a coach approves it.'
    });
  } catch (err) {
    console.error('[Videos upload-link GET]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Could not load upload link' });
  }
});

router.post('/public-upload', uploadSingleVideo, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { token, title, category, description, fixtureId } = req.body;
    if (!token) return res.status(400).json({ error: 'upload token required' });
    if (!title) return res.status(400).json({ error: 'title required' });

    const link = await getActiveUploadLink(token);
    if (!link) return res.status(404).json({ error: 'This upload link is invalid or has expired.' });

    const ext = (path.extname(req.file.originalname || '').toLowerCase() || '.mp4').replace(/[^a-z0-9.]/g, '');
    const filePath = ['upload-links', link.player_id, Date.now() + '-' + crypto.randomUUID() + ext].join('/');

    await ensurePrivateVideoBucket();
    const { error: uploadErr } = await supabase.storage
      .from('player-videos')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype || 'video/mp4', upsert: false });
    if (uploadErr) throw uploadErr;

    const uploaderId = link.coach_id || link.created_by || null;
    const uploaderType = link.coach_id ? 'Coach' : (link.created_by_type || 'Stratex');
    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: link.player_id,
        coach_id: link.coach_id || null,
        team_id: link.team_id || null,
        title,
        url: storageRef(filePath),
        video_url: storageRef(filePath),
        file_path: filePath,
        category: category || 'Highlight',
        description: description || null,
        video_type: category || 'Highlight',
        uploaded_by: uploaderId,
        uploaded_by_type: uploaderType,
        fixture_id: fixtureId || null,
        moderation_status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;

    await markUploadLinkUsed(link);

    const [video] = await attachSignedVideoUrls([data]);
    res.status(201).json({
      message: 'Video uploaded for coach review. It is not visible to scouts yet.',
      video
    });
  } catch (err) {
    console.error('[Videos public-upload]', { code: err.code, message: err.message });
    res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)
      .json({ error: err.code === 'LIMIT_FILE_SIZE' ? VIDEO_TOO_LARGE_MESSAGE : (err.message || 'Video upload failed') });
  }
});

// Add an external video link from an authenticated Coach/Stratex workspace.
// ScoutLink stores the share URL; it never attempts to bypass the provider's own access controls.
router.post('/link', requireAuth, requireRole('Coach','Stratex','Stratex Admin'), async (req, res) => {
  try {
    const { playerId, title, category, description, fixtureId, url, videoUrl } = req.body || {};
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    if (!title) return res.status(400).json({ error: 'title required' });
    const external = externalVideoMeta(url || videoUrl);
    const { player, coach } = await assertCanManagePlayerVideo(req, playerId);
    const uploadedByType = isStratexAccount(req.user) ? 'Stratex' : 'Coach';

    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: player.id,
        coach_id: uploadedByType === 'Coach' ? req.user.id : null,
        team_id: player.team_id || coach?.team_id || null,
        title: String(title).trim(),
        url: external.url,
        video_url: external.url,
        file_path: null,
        category: category || 'Highlight',
        description: description || null,
        video_type: external.provider,
        uploaded_by: req.user.id,
        uploaded_by_type: uploadedByType,
        fixture_id: fixtureId || null,
        moderation_status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      message: external.provider + ' link added for coach review.',
      provider: external.provider,
      video: data
    });
  } catch (err) {
    console.error('[Videos external link]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not add video link' });
  }
});

// Add an external share URL through a token-protected parent/player upload link.
router.post('/public-link', async (req, res) => {
  try {
    const { token, title, category, description, fixtureId, url } = req.body || {};
    if (!token) return res.status(400).json({ error: 'upload token required' });
    if (!title) return res.status(400).json({ error: 'title required' });
    const external = externalVideoMeta(url);
    const link = await getActiveUploadLink(token);
    if (!link) return res.status(404).json({ error: 'This upload link is invalid or has expired.' });

    const uploaderId = link.coach_id || link.created_by || null;
    const uploaderType = link.coach_id ? 'Coach' : (link.created_by_type || 'Stratex');
    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: link.player_id,
        coach_id: link.coach_id || null,
        team_id: link.team_id || null,
        title: String(title).trim(),
        url: external.url,
        video_url: external.url,
        file_path: null,
        category: category || 'Highlight',
        description: description || null,
        video_type: external.provider,
        uploaded_by: uploaderId,
        uploaded_by_type: uploaderType,
        fixture_id: fixtureId || null,
        moderation_status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;
    await markUploadLinkUsed(link);

    res.status(201).json({
      message: external.provider + ' link submitted for coach review. It is not visible to scouts yet.',
      provider: external.provider,
      video: data
    });
  } catch (err) {
    console.error('[Videos public external link]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not add video link' });
  }
});

// Get videos. Scouts can only ever receive approved videos.
router.get('/', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    const { playerId } = req.query;
    let q = supabase
      .from('player_videos')
      .select('*, players(first_name,last_name,age_group,specific_position)', { count:'exact' });

    if (playerId) q = q.eq('player_id', playerId);

    if (accountType(req) === 'Player') {
      q = q.eq('player_id', req.user.id);
    } else if (accountType(req) === 'Coach') {
      const coach = await getCoachTeam(req.user.id);
      if (coach?.is_super_user && coach.team_id) q = q.eq('team_id', coach.team_id);
      else q = q.eq('coach_id', req.user.id);
    } else if (accountType(req) === 'Scout') {
      q = q.eq('moderation_status', 'approved');
    }

    q = q.order('created_at', { ascending: false });
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: await attachSignedVideoUrls(data || []), total: count || 0 });
  } catch (err) {
    console.error('[Videos GET]', { code: err.code, message: err.message });
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// Add metadata after a storage upload. New videos always enter review.
router.post('/', requireAuth, requireRole('Player','Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, title, videoType, category, description, filePath, fixtureId } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!filePath) return res.status(400).json({ error: 'Only file uploads are supported for video reels.' });

    const coachData = accountType(req) === 'Coach' ? await getCoachTeam(req.user.id) : null;
    const coachTeamId = coachData?.team_id || null;
    const effectivePlayerId = accountType(req) === 'Player' ? req.user.id : (playerId || null);

    if (accountType(req) === 'Coach' && effectivePlayerId) await assertCanManagePlayerVideo(req, effectivePlayerId);

    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: effectivePlayerId,
        coach_id: accountType(req) === 'Coach' ? req.user.id : null,
        team_id: coachTeamId,
        title,
        video_url: storageRef(filePath),
        url: storageRef(filePath),
        file_path: filePath,
        category: category || videoType || 'Highlight',
        description: description || null,
        video_type: category || videoType || 'Highlight',
        uploaded_by: req.user.id,
        uploaded_by_type: accountType(req),
        fixture_id: fixtureId || null,
        moderation_status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;

    const [video] = await attachSignedVideoUrls([data]);
    res.status(201).json({ message: 'Video added for coach review', video });
  } catch (err) {
    console.error('[Videos POST]', { code: err.code, message: err.message });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error', detail: err.message });
  }
});

router.get('/upload', (req, res) => {
  res.status(405).json({ error: 'Video uploads must use POST with a file.' });
});

router.post('/upload', requireAuth, requireRole('Player','Coach','Stratex'), uploadSingleVideo, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { title, category, description, playerId, fixtureId } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const coachData = accountType(req) === 'Coach' ? await getCoachTeam(req.user.id) : null;
    const coachTeamId = coachData?.team_id || null;
    const effectivePlayerId = accountType(req) === 'Player' ? req.user.id : (playerId || null);
    if (accountType(req) === 'Coach' && effectivePlayerId) await assertCanManagePlayerVideo(req, effectivePlayerId);

    const ext = (path.extname(req.file.originalname || '').toLowerCase() || '.mp4').replace(/[^a-z0-9.]/g, '');
    const filePath = [accountType(req).toLowerCase(), req.user.id, Date.now() + '-' + crypto.randomUUID() + ext].join('/');

    await ensurePrivateVideoBucket();
    const { error: uploadErr } = await supabase.storage
      .from('player-videos')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype || 'video/mp4', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: effectivePlayerId,
        coach_id: accountType(req) === 'Coach' ? req.user.id : null,
        team_id: coachTeamId,
        title,
        url: storageRef(filePath),
        video_url: storageRef(filePath),
        file_path: filePath,
        category: category || 'Highlight',
        description: description || null,
        video_type: category || 'Highlight',
        uploaded_by: req.user.id,
        uploaded_by_type: accountType(req),
        fixture_id: fixtureId || null,
        moderation_status: 'pending'
      })
      .select()
      .single();
    if (error) throw error;

    const [video] = await attachSignedVideoUrls([data]);
    res.status(201).json({ message: 'Video uploaded for coach review', video });
  } catch (err) {
    console.error('[Videos UPLOAD]', { code: err.code, message: err.message });
    res.status(err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500))
      .json({ error: err.code === 'LIMIT_FILE_SIZE' ? VIDEO_TOO_LARGE_MESSAGE : (err.message || 'Video upload failed') });
  }
});

router.patch('/:id/moderation', requireAuth, requireRole('Coach','Stratex','Stratex Admin'), async (req, res) => {
  try {
    const status = String(req.body?.status || '').toLowerCase();
    if (!MODERATION.has(status) || status === 'pending') {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const { data: video, error: loadErr } = await supabase
      .from('player_videos')
      .select('id,player_id,team_id,coach_id,moderation_status')
      .eq('id', req.params.id)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!(await assertCanManageVideo(req, video))) return res.status(403).json({ error: 'Video is not in your workspace' });

    const patch = {
      moderation_status: status,
      moderation_reason: status === 'rejected' ? String(req.body?.reason || '').trim() || null : null,
      moderated_at: new Date().toISOString(),
      moderated_by: req.user.id
    };

    const { data, error } = await supabase
      .from('player_videos')
      .update(patch)
      .eq('id', video.id)
      .select()
      .single();
    if (error) throw error;

    const [result] = await attachSignedVideoUrls([data]);
    res.json({ message: status === 'approved' ? 'Video approved and now visible to scouts.' : 'Video rejected and remains hidden from scouts.', video: result });
  } catch (err) {
    console.error('[Videos moderation]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not update video review status' });
  }
});

router.delete('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { data: video, error: loadErr } = await supabase
      .from('player_videos')
      .select('id,player_id,team_id,coach_id,file_path')
      .eq('id', req.params.id)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!(await assertCanManageVideo(req, video))) return res.status(403).json({ error: 'Video is not in your workspace' });

    if (video.file_path) await supabase.storage.from('player-videos').remove([video.file_path]).catch(() => {});
    const { error } = await supabase.from('player_videos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error('[Videos DELETE]', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
  }
});

module.exports = router;
