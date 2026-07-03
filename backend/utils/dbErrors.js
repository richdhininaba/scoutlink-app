'use strict';

const DUPLICATE_CONSTRAINT_MESSAGES = {
  players_email_unique: 'A player with this email already exists.',
  coaches_email_unique: 'A coach with this email already exists.',
  coaches_email_key: 'A coach with this email already exists.',
  coaches_phone_unique: 'A coach with this phone number already exists.',
  scouts_email_key: 'A scout with this email already exists.',
  players_login_code_unique: 'This player login code already exists.',
  coaches_login_code_unique: 'This coach login code already exists.',
  players_player_id_key: 'This player ID already exists.',
  coaches_coach_id_key: 'This coach ID already exists.',
  scouts_scout_id_key: 'This scout ID already exists.',
  stratex_email_key: 'A Stratex user with this email already exists.',
  stratex_login_code_key: 'This Stratex login code already exists.',
  job_posts_slug_key: 'A job post with this title already exists. Open the existing job and edit it instead.'
};

function duplicateMessage(err) {
  if (!err || err.code !== '23505') return null;
  const haystack = [err.constraint, err.message, err.details, err.hint]
    .filter(Boolean)
    .join(' ');
  const key = Object.keys(DUPLICATE_CONSTRAINT_MESSAGES).find(name => haystack.includes(name));
  return key ? DUPLICATE_CONSTRAINT_MESSAGES[key] : 'This record already exists.';
}

function sendDbError(res, err, fallbackMessage) {
  const duplicate = duplicateMessage(err);
  if (duplicate) return res.status(409).json({ error: duplicate });
  const status = err && err.status ? err.status : 500;
  return res.status(status).json({
    error: status === 500 ? (fallbackMessage || 'Internal server error') : err.message
  });
}

module.exports = {
  DUPLICATE_CONSTRAINT_MESSAGES,
  duplicateMessage,
  sendDbError
};
