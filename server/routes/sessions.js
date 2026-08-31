import { Router } from 'express'
import { db } from '../db.js'

export const sessionsRouter = Router()

sessionsRouter.get('/', (req, res) => {
  const { player } = req.query
  const rows = db.prepare('SELECT * FROM sessions ORDER BY date DESC').all()
  const sessions = rows.map(toSession)
  res.json(player ? sessions.filter((s) => s.player.name === player) : sessions)
})

sessionsRouter.post('/', (req, res) => {
  const body = req.body
  if (!body.player) return res.status(400).json({ error: 'player is required' })

  const id = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
  const date = new Date().toISOString()

  if (body.kind === 'wearable') {
    if (!body.accHistory?.length && !body.fieldPositions?.length) {
      return res.status(400).json({ error: 'no sensor data to save' })
    }
    db.prepare(`
      INSERT INTO sessions (id, kind, date, player_json, session_stats_json, acc_history_json, field_positions_json, zone_stats_json, alerts_log_json, tag_history_json)
      VALUES (?, 'wearable', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, date, JSON.stringify(pickPlayer(body.player)),
      JSON.stringify(body.sessionStats || {}), JSON.stringify(body.accHistory || []),
      JSON.stringify(body.fieldPositions || []), JSON.stringify(body.zoneStats || {}),
      JSON.stringify(body.alertsLog || []), JSON.stringify(body.tagHistory || []),
    )
  } else {
    if (!body.events?.length) return res.status(400).json({ error: 'no events to save' })
    const summary = buildSummary(body.events)
    db.prepare(`
      INSERT INTO sessions (id, kind, date, team_key, player_json, events_json, summary_json)
      VALUES (?, 'tagging', ?, ?, ?, ?, ?)
    `).run(id, date, body.teamKey || '', JSON.stringify(pickPlayer(body.player)), JSON.stringify(body.events), JSON.stringify(summary))
  }

  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id)
  res.status(201).json(toSession(row))
})

// Append one tagged event to an existing tagging session — used by the Tagger
// so each tap persists immediately instead of waiting for a batch save.
sessionsRouter.post('/:id/events', (req, res) => {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.kind !== 'tagging') return res.status(400).json({ error: 'session is not a tagging session' })

  const event = req.body.event
  if (!event?.action) return res.status(400).json({ error: 'event is required' })

  const events = [...JSON.parse(row.events_json || '[]'), event]
  const summary = buildSummary(events)
  db.prepare('UPDATE sessions SET events_json = ?, summary_json = ? WHERE id = ?')
    .run(JSON.stringify(events), JSON.stringify(summary), req.params.id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id)
  res.json(toSession(updated))
})

// Replace the full events list — used when the Tagger edits, deletes, or
// clears events locally, so the saved session stays in sync with the screen.
sessionsRouter.put('/:id/events', (req, res) => {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  if (row.kind !== 'tagging') return res.status(400).json({ error: 'session is not a tagging session' })

  const events = req.body.events
  if (!Array.isArray(events)) return res.status(400).json({ error: 'events array is required' })

  const summary = buildSummary(events)
  db.prepare('UPDATE sessions SET events_json = ?, summary_json = ? WHERE id = ?')
    .run(JSON.stringify(events), JSON.stringify(summary), req.params.id)

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id)
  res.json(toSession(updated))
})

sessionsRouter.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id)
  if (!row) return res.status(404).json({ error: 'not found' })
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

function pickPlayer(player) {
  return {
    name: player.name, jersey: player.jersey, club: player.club,
    nationality: player.nationality, position: player.position, photo: player.photo,
  }
}

function buildSummary(events) {
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

function toSession(row) {
  const base = {
    id: row.id,
    kind: row.kind,
    date: row.date,
    player: JSON.parse(row.player_json),
  }
  if (row.kind === 'wearable') {
    return {
      ...base,
      sessionStats: JSON.parse(row.session_stats_json || '{}'),
      accHistory: JSON.parse(row.acc_history_json || '[]'),
      fieldPositions: JSON.parse(row.field_positions_json || '[]'),
      zoneStats: JSON.parse(row.zone_stats_json || '{}'),
      alertsLog: JSON.parse(row.alerts_log_json || '[]'),
      tagHistory: JSON.parse(row.tag_history_json || '[]'),
    }
  }
  return {
    ...base,
    teamKey: row.team_key,
    events: JSON.parse(row.events_json || '[]'),
    summary: JSON.parse(row.summary_json || '{}'),
  }
}
