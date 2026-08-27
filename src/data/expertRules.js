const STORAGE_KEY = 'football_dashboard_expert_rules'

// ── Metrics actually captured by the wearable tracker (GPS + MPU6050) ──
// Same fields as sessionStats/sensor/zoneStats in PlayerPerformance.jsx
export const TRACKING_METRICS = [
  { value: 'vitesse',       label: 'Vitesse GPS',          unit: 'km/h' },
  { value: 'distance',      label: 'Distance parcourue',   unit: 'km'   },
  { value: 'altitude',      label: 'Altitude',              unit: 'm'    },
  { value: 'satellites',    label: 'Satellites GPS',        unit: ''     },
  { value: 'acceleration_x', label: 'Accélération X',       unit: 'm/s²' },
  { value: 'acceleration_y', label: 'Accélération Y',       unit: 'm/s²' },
  { value: 'acceleration_z', label: 'Accélération Z',       unit: 'm/s²' },
  { value: 'gyro_x',        label: 'Gyroscope X',           unit: 'rad/s' },
  { value: 'gyro_y',        label: 'Gyroscope Y',           unit: 'rad/s' },
  { value: 'gyro_z',        label: 'Gyroscope Z',           unit: 'rad/s' },
  { value: 'temperature',   label: 'Température capteur',   unit: '°C'   },
  { value: 'zone_own',      label: 'Temps en camp propre',  unit: '%'    },
  { value: 'zone_mid',      label: 'Temps au milieu',       unit: '%'    },
  { value: 'zone_opp',      label: 'Temps en camp adverse', unit: '%'    },
]

// ── Actions actually captured by the Tagger (ACTION_CATEGORIES in Tagger.jsx) ──
// Count of each tagged action during the session
export const TAG_METRICS = [
  { value: 'tag_short_pass',   label: 'Passes courtes (nombre)',   unit: '' },
  { value: 'tag_long_pass',    label: 'Passes longues (nombre)',   unit: '' },
  { value: 'tag_cross',        label: 'Centres (nombre)',          unit: '' },
  { value: 'tag_shot',         label: 'Tirs (nombre)',             unit: '' },
  { value: 'tag_header',       label: 'Jeux de tête (nombre)',     unit: '' },
  { value: 'tag_dribble',      label: 'Dribbles (nombre)',         unit: '' },
  { value: 'tag_first_touch',  label: 'Premières touches (nombre)', unit: '' },
  { value: 'tag_tackle',       label: 'Tacles (nombre)',           unit: '' },
  { value: 'tag_interception', label: 'Interceptions (nombre)',    unit: '' },
  { value: 'tag_block',        label: 'Contres (nombre)',          unit: '' },
  { value: 'tag_clearance',    label: 'Dégagements (nombre)',      unit: '' },
  { value: 'tag_pressing',     label: 'Pressings (nombre)',        unit: '' },
  { value: 'tag_goal',         label: 'Buts (nombre)',             unit: '' },
  { value: 'tag_assist',       label: 'Passes décisives (nombre)', unit: '' },
  { value: 'tag_foul',         label: 'Fautes (nombre)',           unit: '' },
  { value: 'tag_yellow_card',  label: 'Cartons jaunes (nombre)',   unit: '' },
  { value: 'tag_corner',       label: 'Corners (nombre)',          unit: '' },
  { value: 'tag_free_kick',    label: 'Coups francs (nombre)',     unit: '' },
]

export const METRIC_GROUPS = [
  { label: 'Données du Tracker (GPS / MPU6050)', options: TRACKING_METRICS },
  { label: 'Actions Taguées (Tagger)', options: TAG_METRICS },
]

export const ALL_METRICS = [...TRACKING_METRICS, ...TAG_METRICS]

export const OPERATORS = [
  { value: '>',  label: '>' },
  { value: '>=', label: '>=' },
  { value: '<',  label: '<' },
  { value: '<=', label: '<=' },
  { value: '=',  label: '=' },
  { value: '!=', label: '≠' },
]

export const LOGIC_OPS = [
  { value: 'AND', label: 'ET (AND)' },
  { value: 'OR',  label: 'OU (OR)' },
]

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

function writeAll(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export function getAllRules() {
  return readAll()
}

// rule = { conditions: [{ metric, op, value }, ...], logic: 'AND' | 'OR', recommendation: '...' }
export function addRule(rule) {
  const rules = readAll()
  rules.push({ ...rule, id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`, enabled: true })
  writeAll(rules)
  return rules
}

export function deleteRule(id) {
  const rules = readAll().filter(r => r.id !== id)
  writeAll(rules)
  return rules
}

export function toggleRule(id) {
  const rules = readAll().map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
  writeAll(rules)
  return rules
}

export function metricLabel(value) {
  return ALL_METRICS.find(m => m.value === value)?.label ?? value
}

export function metricUnit(value) {
  return ALL_METRICS.find(m => m.value === value)?.unit ?? ''
}

export function conditionLabel(cond) {
  const unit = metricUnit(cond.metric)
  return `${metricLabel(cond.metric)} ${cond.op} ${cond.value}${unit ? ' ' + unit : ''}`
}

function evaluateCondition(cond, metrics) {
  const raw = metrics[cond.metric]
  if (raw === undefined || raw === null) return false
  const current = parseFloat(raw)
  const target = parseFloat(cond.value)
  switch (cond.op) {
    case '>':  return current > target
    case '>=': return current >= target
    case '<':  return current < target
    case '<=': return current <= target
    case '=':  return current === target
    case '!=': return current !== target
    default:   return false
  }
}

// Evaluate a rule (multiple conditions combined with AND/OR) against a flat metrics object
export function evaluateRule(rule, metrics) {
  if (!rule.conditions || rule.conditions.length === 0) return false
  if (rule.logic === 'OR') return rule.conditions.some(c => evaluateCondition(c, metrics))
  return rule.conditions.every(c => evaluateCondition(c, metrics))
}

// Returns the list of triggered rules (their written recommendations) for the given metrics
export function evaluateRules(metrics) {
  return readAll().filter(r => r.enabled).filter(r => evaluateRule(r, metrics))
}

// Build a flat metrics object from a saved wearable/tagging session (data/history.js shape)
export function metricsFromSession(session) {
  const metrics = {}
  if (session?.sessionStats) {
    metrics.vitesse = parseFloat(session.sessionStats.maxSpeed)
    metrics.distance = parseFloat(session.sessionStats.dist)
    metrics.temperature = parseFloat(session.sessionStats.temp)
    metrics.satellites = parseFloat(session.sessionStats.sats)
  }
  if (session?.zoneStats) {
    const total = (session.zoneStats.ownHalf || 0) + (session.zoneStats.midfield || 0) + (session.zoneStats.oppHalf || 0) || 1
    metrics.zone_own = Math.round((session.zoneStats.ownHalf / total) * 100)
    metrics.zone_mid = Math.round((session.zoneStats.midfield / total) * 100)
    metrics.zone_opp = Math.round((session.zoneStats.oppHalf / total) * 100)
  }
  if (session?.summary?.counts) {
    const map = {
      'Short Pass': 'tag_short_pass', 'Long Pass': 'tag_long_pass', Cross: 'tag_cross', Shot: 'tag_shot',
      Header: 'tag_header', Dribble: 'tag_dribble', 'First Touch': 'tag_first_touch', Tackle: 'tag_tackle',
      Interception: 'tag_interception', Block: 'tag_block', Clearance: 'tag_clearance', Pressing: 'tag_pressing',
      Goal: 'tag_goal', Assist: 'tag_assist', Foul: 'tag_foul', 'Yellow Card': 'tag_yellow_card',
      Corner: 'tag_corner', 'Free Kick': 'tag_free_kick',
    }
    Object.entries(session.summary.counts).forEach(([action, count]) => {
      if (map[action]) metrics[map[action]] = count
    })
  }
  return metrics
}
