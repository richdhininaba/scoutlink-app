'use strict';

/**
 * Target path: backend/services/predictionAi.js
 * Server-only OpenAI enrichment for ScoutLink predictions.
 *
 * The model never receives contact, guardian, address or date-of-birth fields.
 * It is not permitted to change ScoutLink numeric scores, ranges, currency
 * values or ROI calculations. Its job is to make the football interpretation
 * and executive summary materially stronger.
 */

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6-sol';
const DEFAULT_TIMEOUT_MS = 15000;

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    recruitmentImplication: { type: 'string' },
    keyDrivers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['title', 'explanation']
      }
    },
    risks: {
      type: 'array',
      items: { type: 'string' }
    },
    liveChecks: {
      type: 'array',
      items: { type: 'string' }
    },
    predictedBehaviour: { type: ['string', 'null'] },
    tacticalNote: { type: ['string', 'null'] },
    roleProjection: { type: ['string', 'null'] },
    valueOutlook: { type: ['string', 'null'] },
    attributeNarratives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          attribute: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['attribute', 'explanation']
      }
    },
    roleNarratives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          role: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['role', 'explanation']
      }
    },
    valueDriverNarratives: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          driver: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['driver', 'explanation']
      }
    }
  },
  required: [
    'summary',
    'recruitmentImplication',
    'keyDrivers',
    'risks',
    'liveChecks',
    'predictedBehaviour',
    'tacticalNote',
    'roleProjection',
    'valueOutlook',
    'attributeNarratives',
    'roleNarratives',
    'valueDriverNarratives'
  ]
};

function cleanString(value, max = 4000) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function compactObject(value, depth = 0) {
  if (depth > 6) return null;
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return cleanString(value, 1500);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 30).map(item => compactObject(item, depth + 1));
  if (typeof value !== 'object') return null;

  return Object.entries(value).reduce((out, [key, child]) => {
    const compacted = compactObject(child, depth + 1);
    if (compacted !== undefined) out[key] = compacted;
    return out;
  }, {});
}

function extractOutputText(response = {}) {
  return (response.output || [])
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .filter(part => part && part.type === 'output_text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('')
    .trim();
}

function validateAnalysis(value) {
  if (!value || typeof value !== 'object') throw new Error('OpenAI returned an invalid analysis object.');
  const summary = cleanString(value.summary, 2000);
  const implication = cleanString(value.recruitmentImplication, 1000);
  if (summary.length < 450) throw new Error('OpenAI returned a prediction summary that was too short.');
  if (implication.length < 100) throw new Error('OpenAI returned an incomplete recruitment implication.');
  if (!Array.isArray(value.keyDrivers) || value.keyDrivers.length < 3) throw new Error('OpenAI returned incomplete key drivers.');
  if (!Array.isArray(value.liveChecks) || value.liveChecks.length < 3) throw new Error('OpenAI returned incomplete live checks.');
  return value;
}

function systemInstructions(predictionType) {
  return [
    'You are the AI football-analysis layer inside ScoutLink, a youth-football scouting decision-support product.',
    `You are analysing a ${predictionType} result that has already been calculated by ScoutLink's deterministic scoring engine.`,
    'Your analysis must have a major impact on the quality and specificity of the executive summary and football interpretation, but it must never alter, invent, recalculate or contradict any numeric score, range, value, ROI, match count or attribute supplied in the input.',
    'Treat the completed assessed player profile as sufficient baseline football evidence for a prediction. Match evidence is additional calibration: it can strengthen confidence, tighten interpretation and reveal trend, but a small match sample must never be described as not enough evidence, insufficient evidence, or a reason the prediction cannot exist.',
    'The executive summary must be one coherent, specific paragraph of roughly 110 to 170 words. It should connect the strongest attributes, development or role demands, relevant weaknesses/headroom, the numeric ScoutLink result, and the recruitment consequence. Avoid generic filler.',
    'If match evidence is light, say the projection is profile-led and that future matches can tighten the range or verify repeatability. Do not imply the player has no evidence.',
    'For Attribute Development, explain why the projected movements matter together and which qualities create the development ceiling or headroom.',
    'For Position Fit Projection, explain the tactical logic of the target role, the transferability of current qualities, and the most important conversion risk.',
    'For Match Scenario Prediction, describe expected behaviour under the named repeated tactical demand and identify what a scout should verify live.',
    'For ROI Analysis / Football Value Outlook, treat Football Value Index as decision support, not a transfer fee. Discuss currency or ROI only when the supplied deterministic result explicitly contains verified/anchored currency outputs.',
    'These are U7-U16 players. Use cautious development language, never make guarantees about future professional success, maturation, health or market value.',
    'Use only the supplied football data. Do not infer private characteristics or personal information.',
    'Return the requested structured JSON only.'
  ].join('\n');
}

async function analysePredictionWithAi(payload, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('OPENAI_API_KEY is not configured.');
    error.code = 'OPENAI_NOT_CONFIGURED';
    throw error;
  }

  const model = process.env.OPENAI_PREDICTION_MODEL || DEFAULT_MODEL;
  const timeoutMs = Math.max(5000, Number(process.env.OPENAI_PREDICTION_TIMEOUT_MS || options.timeoutMs || DEFAULT_TIMEOUT_MS));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        store: false,
        instructions: systemInstructions(payload.predictionType || 'ScoutLink prediction'),
        input: JSON.stringify(compactObject(payload)),
        max_output_tokens: 1800,
        text: {
          format: {
            type: 'json_schema',
            name: 'scoutlink_prediction_analysis',
            strict: true,
            schema: ANALYSIS_SCHEMA
          }
        },
        metadata: {
          feature: 'scoutlink_prediction_analysis',
          prediction_type: cleanString(payload.predictionType || 'prediction', 64)
        }
      })
    });

    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch (_) {
      body = {};
    }

    if (!response.ok) {
      const message = cleanString(body?.error?.message || `OpenAI request failed with status ${response.status}.`, 500);
      const error = new Error(message || 'OpenAI prediction analysis failed.');
      error.code = 'OPENAI_REQUEST_FAILED';
      error.status = response.status;
      throw error;
    }

    const outputText = extractOutputText(body);
    if (!outputText) {
      const error = new Error('OpenAI returned no structured prediction analysis.');
      error.code = 'OPENAI_EMPTY_OUTPUT';
      throw error;
    }

    let analysis;
    try {
      analysis = JSON.parse(outputText);
    } catch (_) {
      const error = new Error('OpenAI returned prediction analysis that could not be parsed.');
      error.code = 'OPENAI_INVALID_JSON';
      throw error;
    }

    validateAnalysis(analysis);

    return {
      analysis,
      model,
      responseId: body.id || null,
      usage: body.usage || null
    };
  } catch (error) {
    if (error && error.name === 'AbortError') {
      const timeoutError = new Error('OpenAI prediction analysis timed out.');
      timeoutError.code = 'OPENAI_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  analysePredictionWithAi,
  extractOutputText,
  ANALYSIS_SCHEMA,
  DEFAULT_MODEL
};
