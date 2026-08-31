import { Router } from 'express'
import { db } from '../db.js'

export const playersRouter = Router()

playersRouter.get('/', (req, res) => {
  const { team } = req.query
  const rows = team
    ? db.prepare('SELECT * FROM players WHERE team = ? ORDER BY is_builtin DESC, id ASC').all(team)
    : db.prepare('SELECT * FROM players ORDER BY team ASC, is_builtin DESC, id ASC').all()
  res.json(rows.map(toPlayer))
})

playersRouter.post('/', (req, res) => {
  const { name, position, jersey, club, nationality, age, height, weight, photo, team } = req.body
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' })
  if (!team || !['morocco', 'opponent'].includes(team)) return res.status(400).json({ error: 'team must be "morocco" or "opponent"' })

  const info = db.prepare(`
    INSERT INTO players (name, position, jersey, club, nationality, age, height, weight, photo, team, is_builtin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(name, position || '', jersey || '#-', club || '', nationality || '', age || '', height || '', weight || '', photo || '', team)

  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(toPlayer(row))
})

playersRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.is_builtin) return res.status(403).json({ error: 'cannot delete a built-in player' })
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

function toPlayer(row) {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    jersey: row.jersey,
    club: row.club,
    nationality: row.nationality,
    age: row.age,
    height: row.height,
    weight: row.weight,
    photo: row.photo,
    team: row.team,
    isBuiltin: !!row.is_builtin,
  }
}
