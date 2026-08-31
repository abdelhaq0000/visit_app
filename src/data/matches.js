// ── Matches are served by the backend API (server/routes/matches.js) ──

export async function getAllMatches() {
  const res = await fetch('/api/matches')
  if (!res.ok) throw new Error('Failed to load matches')
  return res.json()
}

export async function getMatch(id) {
  const res = await fetch(`/api/matches/${id}`)
  if (!res.ok) throw new Error('Failed to load match')
  return res.json()
}

export async function createMatch({ matchInfo, corners, formation, assignments }) {
  const res = await fetch('/api/matches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchInfo, corners, formation, assignments }),
  })
  if (!res.ok) throw new Error('Failed to create match')
  return res.json()
}

export async function updateMatch(id, { matchInfo, corners, formation, assignments }) {
  const res = await fetch(`/api/matches/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchInfo, corners, formation, assignments }),
  })
  if (!res.ok) throw new Error('Failed to update match')
  return res.json()
}

export async function getActiveMatch() {
  const res = await fetch('/api/matches/active')
  if (!res.ok) throw new Error('Failed to load active match')
  return res.json()
}

export async function startMatch(id) {
  const res = await fetch(`/api/matches/${id}/start`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to start match')
  return res.json()
}

export async function endMatch(id) {
  const res = await fetch(`/api/matches/${id}/end`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to end match')
  return res.json()
}
