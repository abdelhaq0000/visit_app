import { useState, useEffect, useRef, useMemo } from 'react'
import Navbar from '../components/Navbar'
import { players, FALLBACK_PHOTO } from '../data/players'
import './TeamPerformance.css'

function getPlayerPhoto(name) {
  return players.find(p => p.name === name)?.photo ?? FALLBACK_PHOTO
}

// ── Field constants (FIFA dimensions, meters) — same as PlayerPerformance ──
const FW = 105
const FH = 68

// ── Draw football field on canvas — same rendering as PlayerPerformance ──
function drawField(ctx, cw, ch, sx, sy) {
  const grd = ctx.createLinearGradient(0, 0, cw, 0)
  grd.addColorStop(0, '#195c19')
  grd.addColorStop(0.5, '#1e7a1e')
  grd.addColorStop(1, '#195c19')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, cw, ch)

  for (let i = 0; i < 14; i++) {
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.055)'; ctx.fillRect(i * (cw / 14), 0, cw / 14, ch) }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 1.5; ctx.setLineDash([])
  ctx.strokeRect(1, 1, cw - 2, ch - 2)
  ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke()
  ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 9.15 * sx, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 2.5, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.88)'
  ctx.strokeRect(0, 13.84 * sy, 16.5 * sx, 40.32 * sy)
  ctx.strokeRect(0, 24.84 * sy, 5.5 * sx, 18.32 * sy)
  ctx.strokeRect(cw - 16.5 * sx, 13.84 * sy, 16.5 * sx, 40.32 * sy)
  ctx.strokeRect(cw - 5.5 * sx, 24.84 * sy, 5.5 * sx, 18.32 * sy)

  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(0, 30.34 * sy, 4, 7.32 * sy); ctx.strokeRect(0, 30.34 * sy, 4, 7.32 * sy)
  ctx.fillRect(cw - 4, 30.34 * sy, 4, 7.32 * sy); ctx.strokeRect(cw - 4, 30.34 * sy, 4, 7.32 * sy)

  ctx.fillStyle = 'white'
  ctx.beginPath(); ctx.arc(11 * sx, ch / 2, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cw - 11 * sx, ch / 2, 2.5, 0, Math.PI * 2); ctx.fill()

  const cr = 1 * sx
  ctx.beginPath(); ctx.arc(0, 0, cr, 0, Math.PI / 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(cw, 0, cr, Math.PI / 2, Math.PI); ctx.stroke()
  ctx.beginPath(); ctx.arc(0, ch, cr, -Math.PI / 2, 0); ctx.stroke()
  ctx.beginPath(); ctx.arc(cw, ch, cr, Math.PI, 3 * Math.PI / 2); ctx.stroke()
}

// ── Team positioning canvas — field + live player dots ────
function TeamFieldCanvas({ positions }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cw = canvas.width
    const ch = canvas.height
    const sx = cw / FW
    const sy = ch / FH

    ctx.clearRect(0, 0, cw, ch)
    drawField(ctx, cw, ch, sx, sy)

    positions.forEach(p => {
      const px = (p.x / 100) * cw
      const py = (p.y / 100) * ch
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = '#7e0101'; ctx.strokeStyle = '#fdf8ee'; ctx.lineWidth = 2.5
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.jersey || '', px, py + 1)
      ctx.restore()

      ctx.save()
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 3
      ctx.fillText(p.short, px, py + 26)
      ctx.restore()
    })
  }, [positions])

  return <canvas ref={canvasRef} width={840} height={543} className="tp-field-canvas" />
}

const TEAM_LOGO =
  'https://upload.wikimedia.org/wikipedia/fr/thumb/6/69/Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg/1920px-Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg.png'

// ── Substitution Assistant — fixed per-player rules ──
const SUBSTITUTION_RULES = [
  {
    playerName: 'Achraf Hakimi',
    minute: 72,
    fatigue: 'High',
    reason: "High-speed running dropped after 70' — fatigue building on the right flank.",
    replacementProfile: 'Fresh right-back with strong recovery pace and 1v1 duel ability.',
    urgency: 'high',
    injuryRisk: 'high',
    injuryNote: 'Repeated hard decelerations on the right flank — hamstring overload risk.',
  },
  {
    playerName: 'Yassine Bounou',
    minute: 90,
    fatigue: 'Low',
    reason: 'No physical or positioning concerns detected for the goalkeeper.',
    replacementProfile: 'No rotation needed — backup keeper only in case of injury.',
    urgency: 'low',
    injuryRisk: 'low',
    injuryNote: 'No abnormal load markers detected.',
  },
  {
    playerName: 'Ismail Saibari',
    minute: 68,
    fatigue: 'Medium',
    reason: 'Passing accuracy and pressing intensity declining in the final third.',
    replacementProfile: 'Creative attacking midfielder with fresh legs for late chance creation.',
    urgency: 'medium',
    injuryRisk: 'medium',
    injuryNote: 'Slight rise in ground-contact time — early muscular fatigue in the final third.',
  },
  {
    playerName: 'Bilal El Khannouss',
    minute: 65,
    fatigue: 'Medium',
    reason: 'Ground covered per sprint dropping — early signs of fatigue in central areas.',
    replacementProfile: 'Box-to-box midfielder with fresh legs for late-game pressing.',
    urgency: 'medium',
    injuryRisk: 'medium',
    injuryNote: 'Sprint mechanics degrading — monitor for calf/hamstring tightness.',
  },
  {
    playerName: 'Soufiane Rahimi',
    minute: 75,
    fatigue: 'High',
    reason: 'Sprint count and shot conversion dropping — legs tiring after repeated runs in behind.',
    replacementProfile: 'Fresh pace-based striker to exploit tired defensive lines.',
    urgency: 'high',
    injuryRisk: 'high',
    injuryNote: 'High-speed running with reduced recovery — elevated hamstring strain risk.',
  },
  {
    playerName: 'Noussair Mazraoui',
    minute: 80,
    fatigue: 'Low',
    reason: 'Physical output stable, no significant drop-off detected.',
    replacementProfile: 'Like-for-like fullback available on the bench if needed late on.',
    urgency: 'low',
    injuryRisk: 'low',
    injuryNote: 'No abnormal load markers detected.',
  },
]

// ── Live positioning — base formation (percent of pitch, our team attacks left→right) ──
const TEAM_FORMATION = [
  { name: 'Yassine Bounou', short: 'Bounou', x: 8, y: 50 },
  { name: 'Achraf Hakimi', short: 'Hakimi', x: 26, y: 16 },
  { name: 'Noussair Mazraoui', short: 'Mazraoui', x: 26, y: 84 },
  { name: 'Bilal El Khannouss', short: 'El Khannouss', x: 50, y: 34 },
  { name: 'Ismail Saibari', short: 'Saibari', x: 50, y: 66 },
  { name: 'Soufiane Rahimi', short: 'Rahimi', x: 78, y: 50 },
]

const OPPONENT_TEAM = { name: 'Rival XI', color: '#1e3a8a' }

const OPPONENT_PLAYERS = [
  {
    name: 'D. Silva', short: 'Silva', jersey: '#1', x: 92, y: 50,
    fatigue: 'Low', urgency: 'low', injuryRisk: 'low', minute: 90,
    reason: 'No physical concerns detected for the goalkeeper.',
    replacementProfile: 'No rotation needed.',
    injuryNote: 'No abnormal load markers detected.',
  },
  {
    name: 'R. Costa', short: 'Costa', jersey: '#4', x: 74, y: 18,
    fatigue: 'Medium', urgency: 'medium', injuryRisk: 'medium', minute: 70,
    reason: 'Recovery pace dropping against our right-flank overloads.',
    replacementProfile: 'Fresh center-back with better aerial recovery.',
    injuryNote: 'Increased ground-contact time on turns — knee load rising.',
  },
  {
    name: 'M. Torres', short: 'Torres', jersey: '#5', x: 74, y: 82,
    fatigue: 'Low', urgency: 'low', injuryRisk: 'low', minute: 90,
    reason: 'Physical output stable, no drop-off detected.',
    replacementProfile: 'Like-for-like fullback available if needed late on.',
    injuryNote: 'No abnormal load markers detected.',
  },
  {
    name: 'L. Fernandes', short: 'Fernandes', jersey: '#8', x: 50, y: 32,
    fatigue: 'High', urgency: 'high', injuryRisk: 'high', minute: 66,
    reason: 'Sprint count collapsing in midfield — losing second-ball duels.',
    replacementProfile: 'Fresh ball-winning midfielder to reset the press.',
    injuryNote: 'Repeated hard decelerations — hamstring overload risk.',
  },
  {
    name: 'P. Alves', short: 'Alves', jersey: '#10', x: 50, y: 68,
    fatigue: 'Medium', urgency: 'medium', injuryRisk: 'medium', minute: 73,
    reason: 'Creative influence fading — passing accuracy down in the final third.',
    replacementProfile: 'Fresh attacking midfielder for late chance creation.',
    injuryNote: 'Slight rise in ground-contact time — early muscular fatigue.',
  },
  {
    name: 'J. Moreira', short: 'Moreira', jersey: '#9', x: 22, y: 50,
    fatigue: 'High', urgency: 'high', injuryRisk: 'high', minute: 69,
    reason: 'Shot conversion and sprint speed dropping after repeated runs in behind.',
    replacementProfile: 'Fresh pace-based striker to stretch our tiring backline.',
    injuryNote: 'High-speed running with reduced recovery — elevated strain risk.',
  },
]

const PASS_LINKS_BASE = [
  ['Yassine Bounou', 'Achraf Hakimi', 14],
  ['Yassine Bounou', 'Noussair Mazraoui', 12],
  ['Achraf Hakimi', 'Bilal El Khannouss', 18],
  ['Noussair Mazraoui', 'Ismail Saibari', 16],
  ['Bilal El Khannouss', 'Ismail Saibari', 22],
  ['Bilal El Khannouss', 'Soufiane Rahimi', 15],
  ['Ismail Saibari', 'Soufiane Rahimi', 20],
  ['Achraf Hakimi', 'Noussair Mazraoui', 6],
]

// ── Real-time heatmap grid — base intensity per pitch cell (5 x 3) ──
const HEATMAP_COLS = 5
const HEATMAP_ROWS = 3
const HEATMAP_BASE = [
  8, 14, 22, 30, 18,
  20, 55, 78, 60, 24,
  10, 16, 26, 34, 16,
]

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// ── Dynamic coach chat — keyword-routed responses ──
function getTeamAIResponse(input, { substitutionRules, momentum, passLinks, heatmap }) {
  const msg = input.toLowerCase().trim()

  if (/sub|remplacement|changement|sortir|fatigue/.test(msg)) {
    const flagged = substitutionRules.filter(r => r.urgency === 'high' || r.urgency === 'medium')
    if (flagged.length === 0) return 'No urgent substitutions recommended right now — all players within normal load.'
    return `Substitution watch: ${flagged.map(r => `${r.playerName} (min ${r.minute}', fatigue ${r.fatigue}) — ${r.reason} Suggested profile: ${r.replacementProfile}`).join(' | ')}`
  }
  if (/blessure|injury|risque physique|hamstring/.test(msg)) {
    const risky = substitutionRules.filter(r => r.injuryRisk === 'high')
    if (risky.length === 0) return 'No player currently shows high injury risk markers.'
    return `Injury watch: ${risky.map(r => `${r.playerName} — ${r.injuryNote}`).join(' | ')}`
  }
  if (/pass|réseau|reseau|network|combinaison/.test(msg)) {
    const top = [...passLinks].sort((a, b) => b.count - a.count)[0]
    return `Passing network live: strongest link is ${top.a} ↔ ${top.b} (${top.count} passes). Total tracked links: ${passLinks.length}.`
  }
  if (/heatmap|chaleur|carte|heat|zone/.test(msg)) {
    const hottest = heatmap.reduce((a, b) => (b.intensity > a.intensity ? b : a))
    return `Team heatmap live: hottest zone is row ${hottest.row + 1}, col ${hottest.col + 1} at ${Math.round(hottest.intensity)}% occupation intensity.`
  }
  if (/momentum|dynamique|elan/.test(msg)) {
    const last = momentum[momentum.length - 1]
    const side = last.value > 15 ? 'Atlas Lions' : last.value < -15 ? 'the opponent' : 'balanced — no side dominating'
    return `Momentum right now: ${last.value > 0 ? '+' : ''}${last.value} — currently favors ${side} (minute ${last.minute}').`
  }
  if (/bonjour|salut|hello|aide|help/.test(msg)) {
    return 'Hello! Ask me about substitutions, injury risk, the passing network, the live heatmap, or match momentum.'
  }
  const last = momentum[momentum.length - 1]
  return `Team overview: momentum is ${last.value > 0 ? '+' : ''}${last.value} at minute ${last.minute}'. Ask me about substitutions, injury risk, passing network, heatmap, or momentum.`
}

const INITIAL_MESSAGES = [
  { type: 'bot', text: 'I track live passing networks, heatmap occupation, and match momentum to support your in-game decisions.' },
  { type: 'coach', text: 'What can help me during the next match?' },
  { type: 'bot', text: 'Ask me about substitutions, injury risk, the passing network, the heatmap, or momentum swings.' },
]

export default function TeamPerformance() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const chatBoxRef = useRef(null)
  const chatWasAtBottomRef = useRef(true)

  const [tick, setTick] = useState(0)
  const [minute, setMinute] = useState(58)
  const [momentum, setMomentum] = useState([
    { minute: 40, value: 5 },
    { minute: 45, value: 12 },
    { minute: 50, value: -8 },
    { minute: 55, value: -18 },
    { minute: 58, value: 4 },
  ])

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setMinute(m => (m >= 90 ? 45 : m + 1))
    setMomentum(prev => {
      const last = prev[prev.length - 1]
      const drift = Math.round((Math.random() - 0.5) * 40)
      const next = clamp(last.value + drift, -100, 100)
      const nextMinute = last.minute >= 90 ? 45 : last.minute + 1
      const list = [...prev, { minute: nextMinute, value: next }]
      return list.length > 12 ? list.slice(list.length - 12) : list
    })
  }, [tick])

  const passLinks = useMemo(() => {
    return PASS_LINKS_BASE.map(([a, b, base], i) => {
      const wobble = Math.round(Math.sin(tick / 2 + i) * 4)
      return { a, b, count: Math.max(3, base + wobble) }
    })
  }, [tick])

  const heatmap = useMemo(() => {
    return HEATMAP_BASE.map((base, i) => {
      const row = Math.floor(i / HEATMAP_COLS)
      const col = i % HEATMAP_COLS
      const wobble = Math.sin(tick / 1.7 + i * 1.3) * 12
      return { row, col, intensity: clamp(base + wobble, 0, 100) }
    })
  }, [tick])

  const livePositions = useMemo(() => {
    return TEAM_FORMATION.map((p, i) => ({
      id: `us-${p.name}`,
      name: p.name,
      short: p.short,
      jersey: players.find(pl => pl.name === p.name)?.jersey ?? '',
      x: clamp(p.x + Math.sin(tick / 1.6 + i) * 5, 4, 96),
      y: clamp(p.y + Math.cos(tick / 1.8 + i * 1.4) * 6, 4, 96),
    }))
  }, [tick])

  // Only auto-scroll the chat when the user hasn't scrolled up to read earlier messages
  useEffect(() => {
    const box = chatBoxRef.current
    if (box && chatWasAtBottomRef.current) {
      box.scrollTop = box.scrollHeight
    }
  }, [messages])

  function sendMessage(text = input) {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [...prev, { type: 'coach', text: trimmed }])
    setInput('')
    setTimeout(() => {
      const reply = getTeamAIResponse(trimmed, {
        substitutionRules: SUBSTITUTION_RULES,
        momentum,
        passLinks,
        heatmap,
      })
      setMessages((prev) => [...prev, { type: 'bot', text: reply }])
    }, 500)
  }

  return (
    <div className="tp-page">
      <Navbar
        title="Team Performance"
      />

      <div className="tp-layout">
        <aside className="tp-sidebar">
          <img className="tp-team-logo" src={TEAM_LOGO} alt="Atlas Lions" />
          <div className="tp-team-name">Atlas Lions</div>

         
         
        </aside>

        <main className="tp-main">
          <header className="tp-page-head">
            <h1>Coach Vision</h1>
            <p>Live positioning, substitution recommendations, heatmap, and momentum detection for in-game decisions.</p>
          </header>

          <section className="tp-panel">
            <div className="tp-panel-title">Players to Change</div>
            <div className="tp-swap-group">
              <span className="tp-swap-group-label us">Atlas Lions</span>
              <div className="tp-swap-row">
                {[...SUBSTITUTION_RULES].sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === 'high' ? -1 : 1)).slice(0, 5).map((r) => (
                  <img key={r.playerName} className="tp-swap-photo us" src={getPlayerPhoto(r.playerName)} alt="" />
                ))}
              </div>
            </div>
            <div className="tp-swap-group">
              <span className="tp-swap-group-label opponent">{OPPONENT_TEAM.name}</span>
              <div className="tp-swap-row">
                {[...OPPONENT_PLAYERS].sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === 'high' ? -1 : 1)).slice(0, 5).map((r) => (
                  <img
                    key={r.name}
                    className="tp-swap-photo opponent"
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.short)}&background=1e3a8a&color=ffffff&size=96&bold=true`}
                    alt={r.name}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* ── Live Positioning: pitch (left) + Coach Chatbot (right) — same layout as PlayerPerformance's field+chat section ── */}
          <section className="tp-field-section">
            <div className="tp-field-section-header">
              <h2 className="tp-field-section-title">Live Positioning</h2>
            </div>

            <div className="tp-field-layout">
              <div className="tp-field-canvas-wrap">
                <TeamFieldCanvas positions={livePositions} />
              </div>

              <div className="tp-fr-panel tp-fr-chat">
                <div className="tp-fr-title">
                  <span>Coach Chatbot</span>
                  <span className="tp-ai-assist-dot" />
                </div>
                <div
                  className="tp-chat-box"
                  ref={chatBoxRef}
                  onScroll={(e) => {
                    const el = e.currentTarget
                    chatWasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
                  }}
                >
                  {messages.map((msg, i) => (
                    <div key={i} className={`tp-chat-message ${msg.type}`}>{msg.text}</div>
                  ))}
                </div>
                <div className="tp-chat-suggestions">
                  {['Substitutions', 'Injury Risk', 'Passing Network', 'Heatmap', 'Momentum'].map((q) => (
                    <button key={q} type="button" className="tp-chat-suggestion-chip" onClick={() => sendMessage(q)}>
                      {q}
                    </button>
                  ))}
                </div>
                <div className="tp-chat-input">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask about team performance..."
                  />
                  <button onClick={() => sendMessage()}>Send</button>
                </div>
              </div>
            </div>
          </section>

          <footer className="tp-footer">Team Performance Report | Live coach view</footer>
        </main>
      </div>
    </div>
  )
}
