'use strict';

const { supabase } = require('../db/supabase');
const { createNotification } = require('./notifications');

const AGE_GROUPS = ['U7','U8','U9','U10','U11','U12','U13','U14','U15','U16'];
let lastCheckedYear = null;

function activeRolloverYear(now = new Date()) {
  const month = now.getMonth();
  const day = now.getDate();
  if (month > 4 || (month === 4 && day >= 15)) return now.getFullYear();
  return null;
}

function nextAgeGroup(group) {
  const idx = AGE_GROUPS.indexOf(String(group || '').toUpperCase());
  if (idx < 0) return null;
  return idx === AGE_GROUPS.length - 1 ? null : AGE_GROUPS[idx + 1];
}

function ageFromGroup(group) {
  const m = String(group || '').match(/^U(\d+)$/);
  return m ? Number(m[1]) : null;
}

async function maybeRunSeasonalAgeGroupRollover(now = new Date()) {
  const year = activeRolloverYear(now);
  if (!year || lastCheckedYear === year) return { ran: false, year };

  const { data: players, error } = await supabase
    .from('players')
    .select('id,first_name,last_name,age_group,assigned_coach_id,team_name,age_group_rollover_year')
    .eq('is_active', true)
    .in('age_group', AGE_GROUPS)
    .limit(2000);
  if (error) {
    console.error('[AgeGroupRollover] load error:', error.message);
    return { ran: false, year, error: error.message };
  }

  let advanced = 0;
  let archived = 0;
  for (const player of players || []) {
    if (Number(player.age_group_rollover_year) === year) continue;
    const current = String(player.age_group || '').toUpperCase();
    const next = nextAgeGroup(current);
    if (!next) {
      const { error: updateErr } = await supabase
        .from('players')
        .update({
          is_active: false,
          archived_at: now.toISOString(),
          archived_reason: 'Aged out of ScoutLink U7-U16 active range at seasonal rollover',
          age_group_rollover_year: year
        })
        .eq('id', player.id);
      if (updateErr) {
        console.error('[AgeGroupRollover] archive error:', updateErr.message);
        continue;
      }
      archived++;
      if (player.assigned_coach_id) {
        createNotification({
          recipient_id: player.assigned_coach_id,
          recipient_type: 'Coach',
          notification_type: 'system',
          title: 'Player archived after age-group rollover',
          body: (player.first_name || 'A player') + ' ' + (player.last_name || '') + ' is no longer within the supported U7 to U16 age range and has been removed from active ScoutLink visibility.',
          data: {
            targetType: 'player',
            targetId: player.id,
            playerId: player.id,
            playerName: ((player.first_name || '') + ' ' + (player.last_name || '')).trim(),
            teamName: player.team_name || '',
            source: 'age_group_rollover',
            rolloverYear: year
          }
        }).catch(e => console.warn('[AgeGroupRollover] notification skipped:', e.message));
      }
      continue;
    }

    const { error: updateErr } = await supabase
      .from('players')
      .update({ age_group: next, age: ageFromGroup(next), age_group_rollover_year: year })
      .eq('id', player.id);
    if (updateErr) {
      console.error('[AgeGroupRollover] advance error:', updateErr.message);
      continue;
    }
    advanced++;
  }

  lastCheckedYear = year;
  return { ran: true, year, advanced, archived };
}

module.exports = {
  maybeRunSeasonalAgeGroupRollover,
  activeRolloverYear,
  nextAgeGroup
};
