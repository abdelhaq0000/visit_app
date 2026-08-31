import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import Navbar from '../components/Navbar'
import PlayerSidebar from '../components/PlayerSidebar'
import { getAllPlayers, FALLBACK_PHOTO } from '../data/players'
import { createSessionWithEvent, appendEventToSession, replaceSessionEvents } from '../data/history'
import { getActiveMatch } from '../data/matches'
import './Tagger.css'

const TEAM_META = [
  { key: 'us', label: 'Maroc', sublabel: 'Équipe nationale du Maroc — Effectif', team: 'morocco' },
  { key: 'opponent', label: 'France', sublabel: 'France — Effectif adverse', team: 'opponent' },
]

// ── MQTT broker — même broker public que le tracker wearable (PlayerPerformance.jsx) ──
const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt'
const TAGGER_TOPIC_ROOT = 'football/tagger'

function slugifyPlayerName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const ACTION_CATEGORIES = {
  'Short Pass': 'ball', 'Long Pass': 'ball', Cross: 'ball', Shot: 'ball',
  Header: 'ball', Dribble: 'ball', 'First Touch': 'ball',
  Tackle: 'def', Interception: 'def', Block: 'def', Clearance: 'def', Pressing: 'def',
  Goal: 'event', Assist: 'event', Foul: 'event',
  'Yellow Card': 'event', Corner: 'event', 'Free Kick': 'event',
}
const ACTION_NAMES = Object.keys(ACTION_CATEGORIES)

// Libellés d'affichage FR (les clés internes restent en anglais pour l'historique)
const ACTION_LABELS = {
  'Short Pass': 'Passe courte', 'Long Pass': 'Passe longue', Cross: 'Centre', Shot: 'Tir',
  Header: 'Tête', Dribble: 'Dribble', 'First Touch': 'Contrôle',
  Tackle: 'Tacle', Interception: 'Interception', Block: 'Contre', Clearance: 'Dégagement', Pressing: 'Pressing',
  Goal: 'But', Assist: 'Passe décisive', Foul: 'Faute',
  'Yellow Card': 'Carton jaune', Corner: 'Corner', 'Free Kick': 'Coup franc',
}
const actionLabel = (a) => ACTION_LABELS[a] || a

const CAT_CLS = { ball: 'tag-ball', def: 'tag-def', event: 'tag-event' }
const EVENTS_PER_PAGE = 3

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function Tagger() {
  const [step, setStep] = useState(1)
  const [activeTeamKey, setActiveTeamKey] = useState('us')
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [taggedTeamKey, setTaggedTeamKey] = useState('us')
  const [events, setEvents] = useState([])
  const [logPage, setLogPage] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [flash, setFlash] = useState('')
  const [flashVisible, setFlashVisible] = useState(false)
  const flashTimeoutRef = useRef(null)
  const nextIdRef = useRef(1)
  const currentSessionIdRef = useRef(null)

  const [rosters, setRosters] = useState({ us: [], opponent: [] })
  const [activeMatch, setActiveMatch] = useState(null)
  const [mqttStatus, setMqttStatus] = useState('disconnected') // disconnected | connecting | connected | error
  const mqttClientRef = useRef(null)

  useEffect(() => {
    Promise.all([getAllPlayers('morocco'), getAllPlayers('opponent')]).then(([morocco, opponent]) => {
      setRosters({ us: morocco, opponent })
    })
  }, [])

  useEffect(() => {
    getActiveMatch().then(setActiveMatch).catch(() => setActiveMatch(null))
  }, [step])

  // ── Connexion MQTT — même broker public que le tracker wearable, se connecte
  // automatiquement. Le Tagger publie chaque action taguée en direct. ──
  useEffect(() => {
    setMqttStatus('connecting')
    const clientId = `tagger_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`
    const client = mqtt.connect(MQTT_BROKER_URL, {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
      keepalive: 30,
      protocolVersion: 4,
    })
    mqttClientRef.current = client

    client.on('connect', () => setMqttStatus('connected'))
    client.on('reconnect', () => setMqttStatus('connecting'))
    client.on('offline', () => setMqttStatus('disconnected'))
    client.on('close', () => setMqttStatus('disconnected'))
    client.on('error', () => setMqttStatus('error'))

    return () => {
      client.end(true)
      mqttClientRef.current = null
    }
  }, [])

  const TEAMS = TEAM_META.map(t => ({ ...t, roster: rosters[t.key] }))

  useEffect(() => {
    if (!timerRunning) return
    const id = setInterval(() => setTimerSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [timerRunning])

  function showFlash(msg) {
    setFlash(msg)
    setFlashVisible(true)
    clearTimeout(flashTimeoutRef.current)
    flashTimeoutRef.current = setTimeout(() => setFlashVisible(false), 2000)
  }

  function startTagging(roster, idx) {
    setSelectedPlayer(roster[idx])
    setTaggedTeamKey(activeTeamKey)
    setEvents([])
    setLogPage(0)
    nextIdRef.current = 1
    currentSessionIdRef.current = null
    setTimerSeconds(0)
    setTimerRunning(false)
    setStep(2)
  }

  // Chaque action taguée est déjà persistée immédiatement (voir tagAction) —
  // il n'y a donc rien à sauvegarder ici, juste réinitialiser l'écran.
  function goBack() {
    setStep(1)
    setTimerRunning(false)
    setTimerSeconds(0)
    setEvents([])
  }

  async function tagAction(action, category) {
    const ev = {
      id: nextIdRef.current++,
      time: formatTime(),
      action,
      category,
      timestamp: new Date().toISOString(),
    }
    setEvents((prev) => [...prev, ev])
    setLogPage(0)
    showFlash('✓ ' + actionLabel(action))

    // Publication MQTT en direct — le coach abonné sur Performance du Joueur
    // reçoit l'action instantanément, sans polling. Nécessite un match lancé
    // par l'admin (topic scopé par matchId).
    if (activeMatch && mqttClientRef.current) {
      const topic = `${TAGGER_TOPIC_ROOT}/${activeMatch.id}/${slugifyPlayerName(selectedPlayer.name)}`
      const payload = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        matchId: activeMatch.id,
        playerName: selectedPlayer.name,
        teamKey: taggedTeamKey,
        action,
        category,
        time: ev.time,
        timestamp: ev.timestamp,
      }
      mqttClientRef.current.publish(topic, JSON.stringify(payload), { qos: 0 })
    }

    // Persistance immédiate : crée la session au premier tag, puis ajoute
    // chaque action suivante à cette même session — plus besoin d'un
    // bouton "Enregistrer", chaque tap est déjà sauvegardé.
    try {
      if (!currentSessionIdRef.current) {
        const session = await createSessionWithEvent({ player: selectedPlayer, teamKey: taggedTeamKey, event: ev })
        currentSessionIdRef.current = session.id
      } else {
        await appendEventToSession(currentSessionIdRef.current, ev)
      }
    } catch (_) {
      // Sauvegarde best-effort — l'action reste visible localement même si la requête échoue.
    }
  }

  function syncEvents(updated) {
    if (currentSessionIdRef.current) {
      replaceSessionEvents(currentSessionIdRef.current, updated).catch(() => {})
    }
  }

  function deleteEvent(id) {
    setEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id)
      syncEvents(updated)
      return updated
    })
  }

  function editEvent(id) {
    const ev = events.find((e) => e.id === id)
    if (!ev) return
    const next = prompt('Modifier l’action (en anglais) :', ev.action)
    if (!next) return
    const action = next.trim()
    if (!ACTION_CATEGORIES[action]) {
      alert('Utilisez l’une de ces actions : ' + ACTION_NAMES.join(', '))
      return
    }
    setEvents((prev) => {
      const updated = prev.map((e) =>
        e.id === id
          ? { ...e, action, category: ACTION_CATEGORIES[action], updatedAt: new Date().toISOString() }
          : e,
      )
      syncEvents(updated)
      return updated
    })
    showFlash('Modifié : ' + actionLabel(action))
  }

  function clearLog() {
    if (!events.length) return
    if (!confirm('Effacer toutes les actions taguées ?')) return
    setEvents([])
    setLogPage(0)
    syncEvents([])
  }

  function exportJSON() {
    if (!selectedPlayer) return
    if (!events.length) { alert('Aucune action à exporter.'); return }
    const payload = {
      player: {
        name: selectedPlayer.name, jersey: selectedPlayer.jersey,
        club: selectedPlayer.club, nationality: selectedPlayer.nationality,
        age: selectedPlayer.age, height: selectedPlayer.height, weight: selectedPlayer.weight,
      },
      session: { date: new Date().toLocaleDateString(), totalEvents: events.length },
      events: events.map((e) => ({
        id: e.id, time: e.time, action: e.action,
        category: e.category, timestamp: e.timestamp, updatedAt: e.updatedAt || null,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download =
      selectedPlayer.name.replace(/\s+/g, '_') +
      '_tagging_' +
      new Date().toISOString().slice(0, 10) +
      '.json'
    a.click()
    URL.revokeObjectURL(a.href)
    showFlash('JSON exporté')
  }

  const totalPages = Math.ceil(events.length / EVENTS_PER_PAGE)
  const currentPage = Math.min(logPage, Math.max(0, totalPages - 1))
  const visibleEvents = [...events].reverse().slice(
    currentPage * EVENTS_PER_PAGE,
    (currentPage + 1) * EVENTS_PER_PAGE,
  )

  /* ── STEP 1: Player selection ─────────────────── */
  if (step === 1) {
    const activeTeam = TEAMS.find((t) => t.key === activeTeamKey)
    return (
      <div className="tagger-page">
        <Navbar title="Tagging des Actions Joueur" />
        <div className="tagger-select-content">
          <div className="tagger-grid-wrap">
            <div className="tagger-team-tabs">
              {TEAMS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tagger-team-tab ${t.key}${t.key === activeTeamKey ? ' active' : ''}`}
                  onClick={() => setActiveTeamKey(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tagger-grid-label">{activeTeam.sublabel}</div>
            <div className="tagger-picker-grid">
              {activeTeam.roster.map((p, i) => (
                <div key={p.name} className="tagger-picker-card" onClick={() => startTagging(activeTeam.roster, i)}>
                  <img
                    src={p.photo}
                    alt={p.name}
                    onError={(e) => { e.target.src = FALLBACK_PHOTO }}
                  />
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-pos">{p.position}</div>
                  <div className="pc-num">{p.jersey}</div>
                  <div className="tagger-select-hint">&#9654; Cliquer pour taguer ce joueur</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── STEP 2: Tagging interface ────────────────── */
  return (
    <div className="tagger-page">
      <div className={`tagger-flash${flashVisible ? ' show' : ''}`}>{flash}</div>

      <Navbar
        title={`Tagging — ${selectedPlayer?.name}`}
        right={
          <>
            {activeMatch && (
              <div className={`tagger-live-badge${mqttStatus === 'connected' ? '' : ' offline'}`}>
                <span className="tagger-live-dot" />
                {mqttStatus === 'connected' ? 'Match en direct — MQTT connecté' : 'Match en direct — MQTT ' + (mqttStatus === 'connecting' ? 'connexion…' : 'déconnecté')}
              </div>
            )}
            <div className={`tagger-team-badge ${taggedTeamKey}`}>
              {taggedTeamKey === 'opponent' ? 'France · Adverse' : 'Maroc'}
            </div>
            <button className="tagger-back-btn" onClick={goBack}>&#8592; Retour</button>
          </>
        }
      />

      <div className="tagger-layout">
        <PlayerSidebar className={`tagger-sidebar ${taggedTeamKey}`} player={selectedPlayer} />

        <main className="tagger-main">
        

          {/* Boutons d'action */}
          <div className="tagger-action-panel">
            <div className="tagger-panel-title">Taguer une action</div>
            <div className="tagger-action-categories">

              <div className="tagger-action-row">
                <div className="tagger-cat-label">Ballon</div>
                <div className="tagger-action-btns">
                  <button className="action-btn freq-high tone-pass" onClick={() => tagAction('Short Pass', 'ball')}>Passe courte</button>
                  <button className="action-btn freq-mid tone-pass" onClick={() => tagAction('Long Pass', 'ball')}>Passe longue</button>
                  <button className="action-btn freq-low tone-attack" onClick={() => tagAction('Cross', 'ball')}>Centre</button>
                  <button className="action-btn freq-mid tone-attack" onClick={() => tagAction('Shot', 'ball')}>Tir</button>
                  <button className="action-btn freq-low tone-air" onClick={() => tagAction('Header', 'ball')}>Tête</button>
                  <button className="action-btn freq-high tone-carry" onClick={() => tagAction('Dribble', 'ball')}>Dribble</button>
                  <button className="action-btn freq-high tone-carry" onClick={() => tagAction('First Touch', 'ball')}>Contrôle</button>
                </div>
              </div>

              <div className="tagger-action-row">
                <div className="tagger-cat-label">Défense</div>
                <div className="tagger-action-btns">
                  <button className="action-btn freq-high tone-def-main" onClick={() => tagAction('Tackle', 'def')}>Tacle</button>
                  <button className="action-btn freq-high tone-def-main" onClick={() => tagAction('Interception', 'def')}>Interception</button>
                  <button className="action-btn freq-mid tone-def-stop" onClick={() => tagAction('Block', 'def')}>Contre</button>
                  <button className="action-btn freq-mid tone-def-stop" onClick={() => tagAction('Clearance', 'def')}>Dégagement</button>
                  <button className="action-btn freq-high tone-def-main" onClick={() => tagAction('Pressing', 'def')}>Pressing</button>
                </div>
              </div>

              <div className="tagger-action-row">
                <div className="tagger-cat-label">Événements</div>
                <div className="tagger-action-btns">
                  <button className="action-btn freq-mid tone-goal" onClick={() => tagAction('Goal', 'event')}>But</button>
                  <button className="action-btn freq-low tone-assist" onClick={() => tagAction('Assist', 'event')}>Passe décisive</button>
                  <button className="action-btn freq-high tone-foul" onClick={() => tagAction('Foul', 'event')}>Faute</button>
                  <button className="action-btn freq-low tone-card" onClick={() => tagAction('Yellow Card', 'event')}>Carton jaune</button>
                  <button className="action-btn freq-mid tone-set" onClick={() => tagAction('Corner', 'event')}>Corner</button>
                  <button className="action-btn freq-mid tone-set" onClick={() => tagAction('Free Kick', 'event')}>Coup franc</button>
                </div>
              </div>

            </div>
          </div>

          {/* Journal des événements */}
          <div className="tagger-log-panel">
            <div className="tagger-log-header">
              <div className="tagger-log-header-left">
                <div className="tagger-log-title">Journal des événements</div>
                <span className="tagger-log-count">{events.length}</span>
              </div>
              <div className="tagger-log-actions">
                <button className="tagger-log-btn clear" onClick={clearLog}>Effacer</button>
                <button className="tagger-log-btn export" onClick={exportJSON}>&#11015; Exporter JSON</button>
              </div>
            </div>

            {events.length === 0 ? (
              <div className="tagger-log-empty">Aucune action taguée. Cliquez sur un bouton d’action.</div>
            ) : (
              <table className="tagger-log-table">
                <thead>
                  <tr>
                    <th>#</th><th>Heure</th><th>Action</th><th>Modifier / Supprimer</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td style={{ color: '#aaa', fontSize: '11px' }}>{ev.id}</td>
                      <td style={{ fontFamily: 'monospace', color: '#3d0000', fontSize: '13px' }}>{ev.time}</td>
                      <td>
                        <span className={`tagger-tag-action ${CAT_CLS[ev.category] || ''}`}>{actionLabel(ev.action)}</span>
                      </td>
                      <td>
                        <button className="tagger-row-btn edit" onClick={() => editEvent(ev.id)}>Modifier</button>
                        <button className="tagger-row-btn del" onClick={() => deleteEvent(ev.id)}>Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {totalPages > 1 && (
              <div className="tagger-log-pagination">
                <button
                  className="tagger-page-btn"
                  onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                >
                  Précédent
                </button>
                <span>Page {currentPage + 1} / {totalPages}</span>
                <button
                  className="tagger-page-btn"
                  onClick={() => setLogPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Suivant
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
