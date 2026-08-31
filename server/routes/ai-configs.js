import { Router } from 'express'
import { db } from '../db.js'

export const aiConfigsRouter = Router()

aiConfigsRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM ai_configs ORDER BY rowid ASC').all()
  res.json(rows.map(toConfig))
})

aiConfigsRouter.post('/', (req, res) => {
  const { name, modelType, modelFile, outputDescription, classes } = req.body
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' })
  if (!modelFile) return res.status(400).json({ error: 'modelFile is required' })

  const id = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const now = new Date().toISOString()
  db.prepare(`
    INSERT INTO ai_configs (id, name, model_type, model_file_json, output_description, classes_json, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, name, modelType || 'classification', JSON.stringify(modelFile), outputDescription || '', JSON.stringify(classes || []), now)

  const row = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(id)
  res.status(201).json(toConfig(row))
})

aiConfigsRouter.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  db.prepare('UPDATE ai_configs SET active = ? WHERE id = ?').run(row.active ? 0 : 1, req.params.id)
  const updated = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(req.params.id)
  res.json(toConfig(updated))
})

aiConfigsRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM ai_configs WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  db.prepare('DELETE FROM ai_configs WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

function toConfig(row) {
  return {
    id: row.id,
    name: row.name,
    modelType: row.model_type,
    modelFile: JSON.parse(row.model_file_json || 'null'),
    outputDescription: row.output_description,
    classes: JSON.parse(row.classes_json || '[]'),
    active: !!row.active,
    createdAt: row.created_at,
  }
}
