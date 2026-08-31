import { Router } from 'express'
import { db } from '../db.js'

export const matchesRouter = Router()

matchesRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM matches ORDER BY updated_at DESC').all()
  res.json(rows.map(toMatch))
})

// Must come before '/:id' so 'active' isn't parsed as an id
matchesRouter.get('/active', (req, res) => {
  const row = db.prepare("SELECT * FROM matches WHERE status = 'live' ORDER BY updated_at DESC LIMIT 1").get()
  res.json(row ? toMatch(row) : null)
})

matchesRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json(toMatch(row))
})

matchesRouter.post('/', (req, res) => {
  const { matchInfo, corners, formation, assignments } = req.body
  const now = new Date().toISOString()
  const info = db.prepare(`
    INSERT INTO matches (name, opponent, date, venue, corners_json, formation, assignments_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    matchInfo?.name || '', matchInfo?.opponent || '', matchInfo?.date || '', matchInfo?.venue || '',
    JSON.stringify(corners || {}), formation || '', JSON.stringify(assignments || []), now, now,
  )
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(toMatch(row))
})

matchesRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const { matchInfo, corners, formation, assignments } = req.body
  const now = new Date().toISOString()
  db.prepare(`
    UPDATE matches SET name = ?, opponent = ?, date = ?, venue = ?, corners_json = ?, formation = ?, assignments_json = ?, updated_at = ?
    WHERE id = ?
  `).run(
    matchInfo?.name || '', matchInfo?.opponent || '', matchInfo?.date || '', matchInfo?.venue || '',
    JSON.stringify(corners || {}), formation || '', JSON.stringify(assignments || []), now, req.params.id,
  )
  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  res.json(toMatch(row))
})

matchesRouter.post('/:id/start', (req, res) => {
  const existing = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  const now = new Date().toISOString()
  const demoteAndStart = db.transaction(() => {
    db.prepare("UPDATE matches SET status = 'ended', updated_at = ? WHERE status = 'live' AND id != ?")
      .run(now, req.params.id)
    db.prepare("UPDATE matches SET status = 'live', updated_at = ? WHERE id = ?")
      .run(now, req.params.id)
  })
  demoteAndStart()

  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  res.json(toMatch(row))
})

matchesRouter.post('/:id/end', (req, res) => {
  const existing = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })

  db.prepare("UPDATE matches SET status = 'ended', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), req.params.id)

  const row = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id)
  res.json(toMatch(row))
})

function toMatch(row) {
  return {
    id: row.id,
    matchInfo: { name: row.name, opponent: row.opponent, date: row.date, venue: row.venue },
    corners: JSON.parse(row.corners_json || '{}'),
    formation: row.formation,
    assignments: JSON.parse(row.assignments_json || '[]'),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
