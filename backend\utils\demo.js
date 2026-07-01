'use strict';

function isDemoSession(req) {
  return !!(req && req.user && req.user.demoMode);
}

function applyRealDataFilter(query, req) {
  if (isDemoSession(req)) return query;
  return query.eq('is_demo', false);
}

function demoWriteFields(req) {
  return isDemoSession(req) ? { is_demo: true } : {};
}

module.exports = { isDemoSession, applyRealDataFilter, demoWriteFields };
