'use strict';
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('video/')) return cb(new Error('Only video files can be uploaded'));
    cb(null, true);
  }
});

async function getCoachTeam(userId) {
  const { data: coachData, error: coachErr } = await supabase
    .from('coaches')
    .select('id,team_id,is_super_user')
    .eq('id', userId)
    .maybeSingle();
  if (coachErr) console.error('[Videos] coach lookup error:', coachErr.message);
  return coachData || null;
}

// Get videos for a player or coach
router.get('/', requireAuth, requireRole('Player','Coach','Scout','Stratex'), async (req, res) => {
  try {
    const { playerId, coachId } = req.query;
    let q = supabase.from('player_videos').select('*, players(first_name,last_name)', { count:'exact' });
    if (playerId) {
      q = q.eq('player_id', playerId);
    } else if (req.user.accountType === 'Player') {
      q = q.eq('player_id', req.user.id);
    } else if (req.user.accountType === 'Coach') {
      const coach = await getCoachTeam(req.user.id);
      if (coach?.is_super_user && coach.team_id) q = q.eq('team_id', coach.team_id);
      else q = q.eq('coach_id', req.user.id);
    }
    q = q.order('created_at', { ascending: false });
    const { data, error, count } = await q;
    if (error) throw error;
    res.json({ data: data || [], total: count || 0 });
  } catch(err) {
    console.error('[Videos GET] Error:', err.message, err.code, err.details);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// Add video (URL-based) for coaches
router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, title, videoUrl, videoType, category, description, filePath } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

    const coachData = req.user.accountType === 'Coach' ? await getCoachTeam(req.user.id) : null;
    const coachTeamId = coachData ? coachData.team_id : null;

    const insertData = {
      player_id: playerId || null,
      coach_id: req.user.accountType === 'Coach' ? req.user.id : null,
      team_id: coachTeamId,
      title,
      video_url: videoUrl,
      url: videoUrl,
      file_path: filePath || null,
      category: category || videoType || 'Highlight',
      description: description || null,
      video_type: category || videoType || 'Highlight',
      uploaded_by: req.user.id,
      uploaded_by_type: req.user.accountType
    };

    console.log('[Videos POST] inserting:', JSON.stringify(insertData));

    const { data, error } = await supabase
      .from('player_videos')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[Videos POST] insert error:', error.message, error.code, error.details, error.hint);
      throw error;
    }

    res.status(201).json({ message: 'Video added', video: data });
  } catch(err) {
    console.error('[Videos POST] catch error:', err.message, err.code, err.details);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
});

// Upload video file to Supabase Storage and save the reel metadata.
router.post('/upload', requireAuth, requireRole('Coach','Stratex'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const { title, category, description, playerId } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    const coachData = req.user.accountType === 'Coach' ? await getCoachTeam(req.user.id) : null;
    const coachTeamId = coachData ? coachData.team_id : null;
    const ext = (path.extname(req.file.originalname || '').toLowerCase() || '.mp4').replace(/[^a-z0-9.]/g, '');
    const filePath = [
      req.user.accountType.toLowerCase(),
      req.user.id,
      Date.now() + '-' + crypto.randomUUID() + ext
    ].join('/');

    await supabase.storage.createBucket('player-videos', {
      public: true,
      fileSizeLimit: 100 * 1024 * 1024,
      allowedMimeTypes: ['video/mp4','video/webm','video/quicktime','video/x-msvideo']
    }).catch(() => {});

    const { error: uploadErr } = await supabase.storage
      .from('player-videos')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype || 'video/mp4',
        upsert: false
      });
    if (uploadErr) throw uploadErr;

    const { data: publicData } = supabase.storage.from('player-videos').getPublicUrl(filePath);
    const publicUrl = publicData?.publicUrl;
    if (!publicUrl) throw new Error('Could not create public video URL');

    const { data, error } = await supabase
      .from('player_videos')
      .insert({
        player_id: playerId || null,
        coach_id: req.user.accountType === 'Coach' ? req.user.id : null,
        team_id: coachTeamId,
        title,
        url: publicUrl,
        video_url: publicUrl,
        file_path: filePath,
        category: category || 'Highlight',
        description: description || null,
        video_type: category || 'Highlight',
        uploaded_by: req.user.id,
        uploaded_by_type: req.user.accountType
      })
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ message: 'Video uploaded', video: data });
  } catch(err) {
    console.error('[Videos UPLOAD] Error:', err.message, err.code, err.details);
    res.status(500).json({ error: err.message || 'Video upload failed' });
  }
});

// Delete a video
router.delete('/:id', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const { data: video, error: loadErr } = await supabase
      .from('player_videos')
      .select('id,file_path')
      .eq('id', req.params.id)
      .maybeSingle();
    if (loadErr) throw loadErr;
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.file_path) {
      await supabase.storage.from('player-videos').remove([video.file_path]).catch(() => {});
    }
    const { error } = await supabase.from('player_videos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Video deleted' });
  } catch(err) {
    console.error('[Videos DELETE] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
