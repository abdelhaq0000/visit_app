const STORAGE_KEY = 'football_dashboard_player_history'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

function writeAll(sessions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

export function getAllSessions() {
  return readAll().sort((a, b) => new Date(b.date) - new Date(a.date))
}

export function getSessionsForPlayer(playerName) {
  return getAllSessions().filter((s) => s.player.name === playerName)
}

export function saveSession({ player, teamKey, events }) {
  if (!events.length) return null
  const session = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'tagging',
    date: new Date().toISOString(),
    teamKey,
    player: {
      name: player.name,
      jersey: player.jersey,
      club: player.club,
      nationality: player.nationality,
      position: player.position,
      photo: player.photo,
    },
    events,
    summary: buildSummary(events),
  }
  const all = readAll()
  all.push(session)
  writeAll(all)
  return session
}

// ── Wearable device (GPS + MPU6050) sessions — captured from Player Performance ──
export function saveWearableSession({ player, sessionStats, accHistory, fieldPositions, zoneStats, alertsLog, tagHistory }) {
  if (!accHistory.length && !fieldPositions.length) return null
  const session = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    kind: 'wearable',
    date: new Date().toISOString(),
    player: {
      name: player.name,
      jersey: player.jersey,
      club: player.club,
      nationality: player.nationality,
      position: player.position,
      photo: player.photo,
    },
    sessionStats,
    accHistory,
    fieldPositions,
    zoneStats,
    alertsLog,
    tagHistory,
  }
  const all = readAll()
  all.push(session)
  writeAll(all)
  return session
}

export function deleteSession(id) {
  writeAll(readAll().filter((s) => s.id !== id))
}

export function clearHistory() {
  writeAll([])
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
