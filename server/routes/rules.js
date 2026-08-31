import { Router } from 'express'
import { db } from '../db.js'

export const rulesRouter = Router()

rulesRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM expert_rules ORDER BY rowid ASC').all()
  res.json(rows.map(toRule))
})

rulesRouter.post('/', (req, res) => {
  const { conditions, logic, recommendation } = req.body
  if (!conditions?.length) return res.status(400).json({ error: 'conditions are required' })
  if (!recommendation || !String(recommendation).trim()) return res.status(400).json({ error: 'recommendation is required' })

  const id = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  db.prepare(`
    INSERT INTO expert_rules (id, conditions_json, logic, recommendation, enabled)
    VALUES (?, ?, ?, ?, 1)
  `).run(id, JSON.stringify(conditions), logic || 'AND', recommendation)

  const row = db.prepare('SELECT * FROM expert_rules WHERE id = ?').get(id)
  res.status(201).json(toRule(row))
})

rulesRouter.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM expert_rules WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  db.prepare('UPDATE expert_rules SET enabled = ? WHERE id = ?').run(row.enabled ? 0 : 1, req.params.id)
  const updated = db.prepare('SELECT * FROM expert_rules WHERE id = ?').get(req.params.id)
  res.json(toRule(updated))
})

rulesRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM expert_rules WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  db.prepare('DELETE FROM expert_rules WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

function toRule(row) {
  return {
    id: row.id,
    conditions: JSON.parse(row.conditions_json),
    logic: row.logic,
    recommendation: row.recommendation,
    enabled: !!row.enabled,
  }
}
