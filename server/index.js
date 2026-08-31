import express from 'express'
import cors from 'cors'
import { playersRouter } from './routes/players.js'
import { matchesRouter } from './routes/matches.js'
import { sessionsRouter } from './routes/sessions.js'
import { rulesRouter } from './routes/rules.js'
import { aiConfigsRouter } from './routes/ai-configs.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '15mb' }))

app.use('/api/players', playersRouter)
app.use('/api/matches', matchesRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/rules', rulesRouter)
app.use('/api/ai-configs', aiConfigsRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'internal server error' })
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
