'use strict';
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

const storage = multer.memoryStorage();
const upload  = multer({ storage, limits: { fileSize: 200*1024*1024 }, fileFilter: (req,file,cb) => {
  const allowed = ['.mp4','.mov','.avi','.webm','.mkv'];
  cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
}});

// Add video by URL
router.post('/url', requireAuth, requireRole('Player','Coach','Stratex'), async (req, res) => {
  try {
    const { playerId, url, title, videoType='highlight' } = req.body;
    if (!playerId||!url) return res.status(400).json({ error: 'playerId and url required' });
    const { data, error } = await supabase.from('player_videos').insert({
      player_id: playerId, url, title: title||'Video', video_type: videoType,
      uploaded_by: req.user.id, uploaded_by_type: req.user.accountType
    }).select().single();
    if (error) throw error;
    await supabase.from('players').update({ video_urls: supabase.rpc('array_append_safe', { arr_col: 'video_urls', val: url }) }).eq('id', playerId);
    res.status(201).json({ video: data });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

// Upload video file -> Supabase Storage
router.post('/upload', requireAuth, requireRole('Player','Coach','Stratex'), upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file uploaded' });
    const { playerId, title, videoType='highlight' } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const ext  = path.extname(req.file.originalname);
    const name = 'players/' + playerId + '/' + Date.now() + ext;
    const { error: upErr } = await supabase.storage.from('player-videos').upload(name, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('player-videos').getPublicUrl(name);
    const { data, error } = await supabase.from('player_videos').insert({
      player_id: playerId, url: urlData.publicUrl, title: title||req.file.originalname,
      video_type: videoType, uploaded_by: req.user.id, uploaded_by_type: req.user.accountType
    }).select().single();
    if (error) throw error;
    res.status(201).json({ video: data, url: urlData.publicUrl });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:playerId', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('player_videos').select('*').eq('player_id', req.params.playerId).order('created_at',{ascending:false});
    if (error) throw error;
    res.json({ data });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;