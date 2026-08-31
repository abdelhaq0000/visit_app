export const FALLBACK_PHOTO =
  'https://store.frmf.ma/cdn/shop/files/2_ACHRAF_HAKIMI_Away_2048x2048.webp?v=1781021899'

// ── Players are served by the backend API (server/routes/players.js) ──
// Built-in squads are seeded into the database on first run; custom
// players added from "Ajouter un joueur" are stored alongside them.

export async function getAllPlayers(team) {
  const res = await fetch(`/api/players?team=${encodeURIComponent(team)}`)
  if (!res.ok) throw new Error('Failed to load players')
  return res.json()
}

export async function addCustomPlayer(player) {
  const res = await fetch('/api/players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(player),
  })
  if (!res.ok) throw new Error('Failed to add player')
  return res.json()
}

export async function removeCustomPlayer(id) {
  const res = await fetch(`/api/players/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete player')
}
