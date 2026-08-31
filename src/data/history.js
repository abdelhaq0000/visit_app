// ── Sessions (tagging + wearable) are served by the backend API ──
// (server/routes/sessions.js)

export async function getAllSessions() {
  const res = await fetch('/api/sessions')
  if (!res.ok) throw new Error('Failed to load sessions')
  return res.json()
}

export async function getSessionsForPlayer(playerName) {
  const res = await fetch(`/api/sessions?player=${encodeURIComponent(playerName)}`)
  if (!res.ok) throw new Error('Failed to load sessions')
  return res.json()
}

export async function saveSession({ player, teamKey, events }) {
  if (!events.length) return null
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'tagging', player, teamKey, events }),
  })
  if (!res.ok) throw new Error('Failed to save session')
  return res.json()
}

// ── Incremental tagging save — creates the session on the first tagged
// action, then appends each subsequent action to it, so every tap persists
// immediately instead of waiting for a batch save at the end. ──
export async function createSessionWithEvent({ player, teamKey, event }) {
  return saveSession({ player, teamKey, events: [event] })
}

export async function appendEventToSession(sessionId, event) {
  const res = await fetch(`/api/sessions/${sessionId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  })
  if (!res.ok) throw new Error('Failed to append event')
  return res.json()
}

// Replace the full events list — keeps a saved session in sync after a
// local edit, delete, or clear of tagged events.
export async function replaceSessionEvents(sessionId, events) {
  const res = await fetch(`/api/sessions/${sessionId}/events`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  })
  if (!res.ok) throw new Error('Failed to update events')
  return res.json()
}

// ── Wearable device (GPS + MPU6050) sessions — captured from Player Performance ──
export async function saveWearableSession({ player, sessionStats, accHistory, fieldPositions, zoneStats, alertsLog, tagHistory }) {
  if (!accHistory.length && !fieldPositions.length) return null
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'wearable', player, sessionStats, accHistory, fieldPositions, zoneStats, alertsLog, tagHistory }),
  })
  if (!res.ok) throw new Error('Failed to save session')
  return res.json()
}

export async function deleteSession(id) {
  const res = await fetch(`/api/sessions/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete session')
}

export function buildSummary(events) {
  const counts = {}
  events.forEach((e) => { counts[e.action] = (counts[e.action] || 0) + 1 })
  return {
    totalEvents: events.length,
    counts,
    goals: counts['Goal'] || 0,
    assists: counts['Assist'] || 0,
    fouls: counts['Foul'] || 0,
    yellowCards: counts['Yellow Card'] || 0,
    tackles: counts['Tackle'] || 0,
    interceptions: counts['Interception'] || 0,
    shots: counts['Shot'] || 0,
  }
}
