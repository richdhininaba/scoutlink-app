'use strict';
/**
 * ScoutLink Seed Script v2.0
 * Creates test accounts + demo players
 * Run: node backend/seed.js
 */
require('dotenv').config({ path: 'backend/.env' });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function hash(p) { return bcrypt.hash(p, 12); }

async function seed() {
  console.log('🌱 ScoutLink Seed v2.0');
  console.log('======================\n');

  // ── Stratex Admins ───────────────────────────────────────────────────────
  console.log('Creating Stratex admins...');
  const stratexAccounts = [
    { stratex_id:'STX-001', first_name:'Rich', last_name:'Dhin', email:'richdhin@stratexanalytics.co.uk', password:'Stratex2026!' },
    { stratex_id:'STX-002', first_name:'Lucy', last_name:'Ali',  email:'lucy.ali@stratexanalytics.co.uk', password:'Stratex2026!' },
  ];
  for (const acc of stratexAccounts) {
    const { password, ...rest } = acc;
    const { error } = await supabase.from('stratex').upsert({ ...rest, password_hash: await hash(password), role:'admin', is_active:true }, { onConflict:'email' });
    if (error) console.error('  ❌', acc.email, error.message);
    else console.log('  ✅', acc.email, '(password:', password, ')');
  }

  // ── Test Coach ────────────────────────────────────────────────────────────
  console.log('\nCreating test coach...');
  const { error: coachErr } = await supabase.from('coaches').upsert({
    coach_id:'CHC-TEST01', first_name:'James', last_name:'Wilson',
    email:'coach.test@scoutlink.app', phone:'+44 7700 100001',
    team_name:'Manchester City U18 Academy', role_at_club:'Head Coach',
    password_hash: await hash('Coach2026!'), is_active:true, data_policy_agreed:true
  }, { onConflict:'email' });
  if (coachErr) console.error('  ❌', coachErr.message);
  else console.log('  ✅ coach.test@scoutlink.app (password: Coach2026!)');

  // ── Test Scout ────────────────────────────────────────────────────────────
  console.log('\nCreating test scout...');
  const { error: scoutErr } = await supabase.from('scouts').upsert({
    scout_id:'SCT-TEST01', first_name:'David', last_name:'Thompson',
    email:'scout.test@scoutlink.app', phone:'+44 7700 100002',
    club_name:'Arsenal FC', club_league:'Premier League',
    password_hash: await hash('Scout2026!'), is_active:true,
    preferences_set: true,
    scout_preferences: {
      preferredPositions:['ST','LW','RW'], formationFocus:'4-3-3',
      playingStyle:'pressing', buildPreference:'athletic',
      ageRangeMin:14, ageRangeMax:21, footPreference:'any'
    }
  }, { onConflict:'email' });
  if (scoutErr) console.error('  ❌', scoutErr.message);
  else console.log('  ✅ scout.test@scoutlink.app (password: Scout2026!)');

  // ── Test Players ──────────────────────────────────────────────────────────
  console.log('\nCreating test players...');
  const testPlayers = [
    { player_id:'PLY-TEST01', first_name:'Marcus', last_name:'Johnson', email:'player.test@scoutlink.app',
      date_of_birth:'2007-03-15', nationality:'England', nationality_code:'gb-eng',
      position_group:'Forward', specific_position:'ST', positions:['ST'],
      primary_position:'ST', foot:'Right',
      height_category:'tall', height_range_cm:'178-185 cm', height_min_cm:178, height_max_cm:185,
      build_category:'athletic', weight_range_kg:'72-80 kg', weight_min_kg:72, weight_max_kg:80,
      team_name:'Manchester City U18 Academy',
      pace:92, agility:88, strength:74, stamina:82, jumping:80, composure:78,
      shooting:85, passing:72, dribbling:88, defending:42, crossing:68, vision:75,
      positioning:84, heading:78, tackling:38,
      appearances:18, goals:14, assists:8,
      password_hash: await hash('Player2026!'), is_active:true },
    { player_id:'PLY-TEST02', first_name:'Aisha', last_name:'Okonkwo', email:'player2.test@scoutlink.app',
      date_of_birth:'2006-08-22', nationality:'Nigeria', nationality_code:'ng',
      position_group:'Midfielder', specific_position:'CAM', positions:['CAM','CM'],
      primary_position:'CAM', foot:'Both',
      height_category:'average', height_range_cm:'170-178 cm', height_min_cm:170, height_max_cm:178,
      build_category:'lean', weight_range_kg:'65-72 kg', weight_min_kg:65, weight_max_kg:72,
      team_name:'Manchester City U18 Academy',
      pace:84, agility:90, strength:65, stamina:88, jumping:72, composure:85,
      shooting:76, passing:90, dribbling:86, defending:64, crossing:82, vision:92,
      positioning:80, heading:60, tackling:68,
      appearances:20, goals:6, assists:14,
      password_hash: await hash('Player2026!'), is_active:true },
    { player_id:'PLY-TEST03', first_name:'Tyler', last_name:'Brooks', email:'gk.test@scoutlink.app',
      date_of_birth:'2005-11-10', nationality:'England', nationality_code:'gb-eng',
      position_group:'Goalkeeper', specific_position:'GK', positions:['GK'],
      primary_position:'GK', foot:'Right',
      height_category:'very_tall', height_range_cm:'185-200 cm', height_min_cm:185, height_max_cm:200,
      build_category:'powerful', weight_range_kg:'88-96 kg', weight_min_kg:88, weight_max_kg:96,
      team_name:'Manchester City U18 Academy',
      pace:55, agility:78, strength:82, stamina:75, jumping:88, composure:82,
      gk_diving:86, gk_reflexes:88, gk_handling:82, gk_kicking:74, gk_positioning:80,
      gk_distribution:72, gk_communication:78, gk_sweeping:76,
      appearances:15, clean_sheets:7,
      password_hash: await hash('Player2026!'), is_active:true },
  ];

  for (const p of testPlayers) {
    const { error } = await supabase.from('players').upsert(p, { onConflict:'email' });
    if (error) console.error('  ❌', p.first_name, p.last_name, error.message);
    else console.log('  ✅', p.first_name, p.last_name, '(', p.specific_position, ')');
  }

  console.log('\n✅ Seed complete!');
  console.log('\n📋 TEST CREDENTIALS:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('STRATEX ADMIN 1: richdhin@stratexanalytics.co.uk / Stratex2026!');
  console.log('STRATEX ADMIN 2: lucy.ali@stratexanalytics.co.uk / Stratex2026!');
  console.log('COACH:           coach.test@scoutlink.app / Coach2026!');
  console.log('SCOUT:           scout.test@scoutlink.app / Scout2026!');
  console.log('PLAYER (FWD):    player.test@scoutlink.app / Player2026!');
  console.log('PLAYER (MID):    player2.test@scoutlink.app / Player2026!');
  console.log('PLAYER (GK):     gk.test@scoutlink.app / Player2026!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });