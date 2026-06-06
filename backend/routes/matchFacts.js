'use strict';
const express = require('express');
const router  = express.Router();
const { supabase } = require('../db/supabase');
const { requireAuth, requireRole } = require('../utils/auth');

router.post('/', requireAuth, requireRole('Coach','Stratex'), async (req, res) => {
  try {
    const b = req.body;
    if (!b.playerId) return res.status(400).json({ error: 'playerId required' });
    const mins = b.minutesPlayed||0;
    let perf = 50;
    if (mins > 0) {
      const g = (b.goals||0)*15, a = (b.assists||0)*10, sv = (b.saves||0)*8;
      const sol = b.shotsOnTarget&&b.shots ? (b.shotsOnTarget/Math.max(b.shots,1))*10 : 0;
      const pa = b.passAccuracy ? (b.passAccuracy/100)*10 : 0;
      const cards = (b.yellowCards||0)*-8 + (b.redCards||0)*-20;
      perf = Math.max(0, Math.min(100, 50+g+a+sv+sol+pa+cards));
    }
    const { data: mf, error } = await supabase.from('match_facts').insert({
      player_id: b.playerId, match_date: b.matchDate, opponent: b.opponent, result: b.result,
      minutes_played: mins, goals: b.goals||0, assists: b.assists||0,
      shots: b.shots||0, shots_on_target: b.shotsOnTarget||0,
      passes: b.passes||0, pass_accuracy: b.passAccuracy||null,
      dribbles: b.dribbles||0, tackles: b.tackles||0, interceptions: b.interceptions||0,
      fouls: b.fouls||0, yellow_cards: b.yellowCards||0, red_cards: b.redCards||0,
      saves: b.saves||0, goals_conceded: b.goalsConceded||0,
      high_claims: b.highClaims||0, punches: b.punches||0,
      clean_sheet: b.cleanSheet||false, performance_score: perf, created_by: req.user.id,
    }).select().single();
    if (error) throw error;
    const { data: all } = await supabase.from('match_facts').select('goals,assists,yellow_cards,red_cards,clean_sheet').eq('player_id', b.playerId);
    if (all) {
      const t = all.reduce((acc,f) => ({
        goals: acc.goals+(f.goals||0), assists: acc.assists+(f.assists||0),
        yc: acc.yc+(f.yellow_cards||0), rc: acc.rc+(f.red_cards||0), cs: acc.cs+(f.clean_sheet?1:0)
      }), { goals:0,assists:0,yc:0,rc:0,cs:0 });
      await supabase.from('players').update({ appearances: all.length, goals: t.goals, assists: t.assists, yellow_cards: t.yc, red_cards: t.rc, clean_sheets: t.cs }).eq('id', b.playerId);
    }
    await supabase.from('notifications').insert({
      recipient_id: b.playerId, recipient_type: 'Player', notification_type: 'match_fact',
      title: 'Match stats added', body: 'Your coach has added your stats for the match vs ' + (b.opponent||'Unknown') + '.',
      data: { matchFactId: mf.id, performanceScore: perf }
    });
    res.status(201).json({ matchFact: mf, performanceScore: perf });
  } catch(err) { console.error(err); res.status(500).json({ error: 'Internal server error' }); }
});

router.get('/:playerId', requireAuth, async (req, res) => {
  try {
    if (req.user.accountType==='Player'&&req.user.id!==req.params.playerId) return res.status(403).json({ error: 'Forbidden' });
    const { data, error } = await supabase.from('match_facts').select('*').eq('player_id', req.params.playerId).order('match_date',{ascending:false});
    if (error) throw error;
    res.json({ data });
  } catch(err) { res.status(500).json({ error: 'Internal server error' }); }
});

module.exports = router;