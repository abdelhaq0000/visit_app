import { useState, useEffect, useRef, useMemo } from 'react'
import Navbar from '../components/Navbar'
import { players, FALLBACK_PHOTO } from '../data/players'
import './TeamPerformance.css'

function getPlayerPhoto(name) {
  return players.find(p => p.name === name)?.photo ?? FALLBACK_PHOTO
}
function getJersey(name) {
  return players.find(p => p.name === name)?.jersey ?? ''
}

// ── Field constants (FIFA dimensions, meters) — same as PlayerPerformance ──
const FW = 105
const FH = 68

// ── Draw football field on canvas — same rendering as PlayerPerformance ──
function drawField(ctx, cw, ch, sx) {
  const grd = ctx.createLinearGradient(0, 0, cw, 0)
  grd.addColorStop(0, '#195c19')
  grd.addColorStop(0.5, '#1e7a1e')
  grd.addColorStop(1, '#195c19')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, cw, ch)

  for (let i = 0; i < 14; i++) {
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.055)'; ctx.fillRect(i * (cw / 14), 0, cw / 14, ch) }
  }

  const sy = ch / FH
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

  ctx.fillStyle = 'white'
  ctx.beginPath(); ctx.arc(11 * sx, ch / 2, 2.5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cw - 11 * sx, ch / 2, 2.5, 0, Math.PI * 2); ctx.fill()
}

// ── Pitch showing every player + fatigue ring; flagged players pulse ──
function SquadFatigueCanvas({ squad }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const cw = canvas.width
    const ch = canvas.height
    ctx.clearRect(0, 0, cw, ch)
    drawField(ctx, cw, ch, cw / FW)

    squad.forEach(p => {
      const px = (p.x / 100) * cw
      const py = (p.y / 100) * ch
      const ring = p.load >= 85 ? '#e23b3b' : p.load >= 70 ? '#e0a300' : '#37b24d'

      // fatigue ring
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 17, -Math.PI / 2, -Math.PI / 2 + (p.load / 100) * Math.PI * 2)
      ctx.strokeStyle = ring; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke()
      ctx.restore()

      // node
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = '#7e0101'; ctx.strokeStyle = '#fdf8ee'; ctx.lineWidth = 2.5
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.jersey || '', px, py + 1)
      ctx.restore()

      // name + load %
      ctx.save()
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 3
      ctx.fillText(`${p.short}  ${Math.round(p.load)}%`, px, py + 30)
      ctx.restore()
    })
  }, [squad])

  return <canvas ref={canvasRef} width={840} height={543} className="tp-field-canvas" />
}

const TEAM_LOGO =
  'https://upload.wikimedia.org/wikipedia/fr/thumb/6/69/Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg/1920px-Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg.png'

// ── Starting XI on the pitch (percent of pitch) + physical profile ──
// startLoad = accumulated load at kickoff-view (minute 58); loadRate = load gained per match-minute;
// capacity = minute the player is expected to hit the danger zone. role drives the replacement suggestion.
const SQUAD_BASE = [
  { name: 'Yassine Bounou',      short: 'Bounou',      x: 8,  y: 50, role: 'Goalkeeper',        startLoad: 24, loadRate: 0.15, sub: 'No rotation — backup keeper only if injured.' },
  { name: 'Achraf Hakimi',       short: 'Hakimi',      x: 26, y: 16, role: 'Right wing-back',   startLoad: 71, loadRate: 0.62, sub: 'Fresh RWB with recovery pace for 1v1 defending.' },
  { name: 'Noussair Mazraoui',   short: 'Mazraoui',    x: 26, y: 84, role: 'Left-side full-back', startLoad: 55, loadRate: 0.44, sub: 'Like-for-like full-back, keeps the overlap threat.' },
  { name: 'Bilal El Khannouss',  short: 'El Khannouss', x: 50, y: 34, role: 'Central midfield',  startLoad: 63, loadRate: 0.55, sub: 'Box-to-box mid with legs for late pressing.' },
  { name: 'Ismail Saibari',      short: 'Saibari',     x: 50, y: 66, role: 'Attacking midfield', startLoad: 66, loadRate: 0.58, sub: 'Creative #10 to keep chance creation alive.' },
  { name: 'Soufiane Rahimi',     short: 'Rahimi',      x: 78, y: 50, role: 'Striker',            startLoad: 69, loadRate: 0.64, sub: 'Fresh pace striker to run in behind a tiring back line.' },
]

// ── Bench: who is warm and ready, matched to the roles above ──
const BENCH = [
  { name: 'Right wing-back',   detail: 'Recovery pace, strong 1v1', ready: 'Ready', covers: 'Right wing-back' },
  { name: 'Full-back',         detail: 'Two-footed, good overlap',  ready: 'Ready', covers: 'Left-side full-back' },
  { name: 'Central midfield',  detail: 'Ball-winner, high work-rate', ready: 'Warming up', covers: 'Central midfield' },
  { name: 'Attacking midfield', detail: 'Line-breaking passer',      ready: 'Ready', covers: 'Attacking midfield' },
  { name: 'Striker',           detail: 'Pace + direct running',      ready: 'Ready', covers: 'Striker' },
]

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// ── Turn a live squad snapshot into a ranked bench-decision board ──
function buildSubBoard(squad, minute) {
  return squad
    .map(p => {
      const load = p.load
      const minsToDanger = load >= 85 ? 0 : Math.max(0, Math.round((85 - load) / Math.max(p.loadRate, 0.05)))
      const dangerMinute = load >= 85 ? minute : Math.min(90, minute + minsToDanger)

      let priority, action, injuryRisk
      if (load >= 88) {
        priority = 'now'
        action = `Sub now — physical output has dropped off and cover is thin.`
        injuryRisk = 'High'
      } else if (load >= 82) {
        priority = 'soon'
        action = `Prepare a change — fading fast, plan the swap in the next few minutes.`
        injuryRisk = 'Elevated'
      } else if (load >= 72) {
        priority = 'watch'
        action = `Monitor — sprint output slipping, reassess around ${dangerMinute}'.`
        injuryRisk = 'Moderate'
      } else {
        priority = 'ok'
        action = `No concern — load within normal range.`
        injuryRisk = 'Low'
      }
      if (p.role === 'Goalkeeper') { priority = 'ok'; action = 'Goalkeeper — no rotation planned.'; injuryRisk = 'Low' }

      return {
        ...p,
        load: Math.round(load),
        sprintDrop: Math.round(clamp((load - 55) * 0.9, 0, 40)),
        dangerMinute,
        priority,
        action,
        injuryRisk,
      }
    })
    .sort((a, b) => {
      const order = { now: 0, soon: 1, watch: 2, ok: 3 }
      return order[a.priority] - order[b.priority] || b.load - a.load
    })
}

const PRIORITY_LABEL = { now: 'SUB NOW', soon: 'PREPARE', watch: 'WATCH', ok: 'OK' }

// ── Coach chatbot — routed to bench decisions ──
function getCoachReply(input, { board, minute, subsUsed }) {
  const msg = input.toLowerCase().trim()
  const now = board.filter(p => p.priority === 'now')
  const soon = board.filter(p => p.priority === 'soon')
  const watch = board.filter(p => p.priority === 'watch')

  if (/who|change|sub|remplac|sortir|bench|off/.test(msg)) {
    if (now.length) {
      return `Take off now: ${now.map(p => `${p.short} (load ${p.load}%, ${p.role}) → bring on a ${p.role.toLowerCase()} — ${p.sub}`).join(' | ')}. ${soon.length ? `Next in line: ${soon.map(p => p.short).join(', ')}.` : ''}`
    }
    if (soon.length) return `No forced change yet, but get someone ready for ${soon.map(p => `${p.short} (${p.load}%)`).join(', ')}. Reassess within 3–4 minutes.`
    if (watch.length) return `Nothing urgent. Keep an eye on ${watch.map(p => `${p.short} (danger ~${p.dangerMinute}')`).join(', ')}.`
    return 'Whole XI is inside normal load — no substitution needed right now.'
  }
  if (/when|timing|minute/.test(msg)) {
    const next = [...board].filter(p => p.priority !== 'ok').sort((a, b) => a.dangerMinute - b.dangerMinute)[0]
    if (!next) return `Minute ${minute}' — no player projected into the danger zone before full time.`
    return `Minute ${minute}'. Earliest forced call: ${next.short} around ${next.dangerMinute}'. Plan your first change for roughly ${Math.max(minute + 1, next.dangerMinute - 2)}'.`
  }
  if (/injur|risk|hamstring|pull|blessure/.test(msg)) {
    const risky = board.filter(p => p.injuryRisk === 'High' || p.injuryRisk === 'Elevated')
    if (!risky.length) return 'No elevated injury-risk markers across the XI.'
    return `Injury-risk watch: ${risky.map(p => `${p.short} — ${p.injuryRisk} (load ${p.load}%, sprint output −${p.sprintDrop}%)`).join(' | ')}. Repeated hard efforts with poor recovery raise strain risk.`
  }
  if (/bench|ready|warm/.test(msg)) {
    return `Bench status: ${BENCH.map(b => `${b.name} — ${b.ready}`).join(' | ')}.`
  }
  if (/how many|left|used|remaining/.test(msg)) {
    return `Substitutions used: ${subsUsed} of 5. You have ${5 - subsUsed} changes and up to 3 stoppages left.`
  }
  if (/fresh|freshest|keep on|fine/.test(msg)) {
    const freshest = [...board].sort((a, b) => a.load - b.load)[0]
    return `Freshest outfield option still on: ${freshest.short} at ${freshest.load}% load — safe to keep for the full 90.`
  }
  if (/hello|hi|help|aide/.test(msg)) {
    return 'Ask me: who to change, when, injury risk, bench readiness, or how many subs are left.'
  }
  const lead = now[0] || soon[0] || watch[0]
  return lead
    ? `Minute ${minute}'. Top call: ${lead.short} (${lead.load}% load, ${PRIORITY_LABEL[lead.priority]}). ${lead.action}`
    : `Minute ${minute}'. Squad load is under control — no change needed. Ask about timing, injury risk or the bench.`
}

const INITIAL_MESSAGES = [
  { type: 'bot', text: 'I track every player\'s physical load live and rank your substitution options — who to take off, when, and who to bring on.' },
  { type: 'coach', text: 'Who should come off first?' },
  { type: 'bot', text: 'Ask "who to change", "when", "injury risk" or "bench" and I\'ll answer from the live board.' },
]

export default function TeamPerformance() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const chatBoxRef = useRef(null)
  const chatWasAtBottomRef = useRef(true)

  const [tick, setTick] = useState(0)
  const [minute, setMinute] = useState(58)
  const [subsUsed, setSubsUsed] = useState(1)
  const [doneSubs, setDoneSubs] = useState([])

  // advance the simulated match clock every 3s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setMinute(m => (m >= 90 ? 46 : m + 1))
  }, [tick])

  // live squad snapshot: load climbs with the clock + a little noise, minus any player already subbed
  const squad = useMemo(() => {
    return SQUAD_BASE
      .filter(p => !doneSubs.includes(p.name))
      .map((p, i) => {
        const elapsed = minute - 58
        const noise = Math.sin(tick / 1.6 + i * 1.3) * 3
        const load = clamp(p.startLoad + elapsed * p.loadRate + noise, 10, 100)
        return {
          ...p,
          jersey: getJersey(p.name),
          load,
          x: clamp(p.x + Math.sin(tick / 1.9 + i) * 3, 5, 95),
          y: clamp(p.y + Math.cos(tick / 2.1 + i * 1.4) * 4, 6, 94),
        }
      })
  }, [minute, tick, doneSubs])

  const board = useMemo(() => buildSubBoard(squad, minute), [squad, minute])
  const topCall = board.find(p => p.priority === 'now') || board.find(p => p.priority === 'soon') || null

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
    setMessages(prev => [...prev, { type: 'coach', text: trimmed }])
    setInput('')
    setTimeout(() => {
      const reply = getCoachReply(trimmed, { board, minute, subsUsed })
      setMessages(prev => [...prev, { type: 'bot', text: reply }])
    }, 400)
  }

  function makeSub(playerName) {
    if (subsUsed >= 5 || doneSubs.includes(playerName)) return
    setDoneSubs(prev => [...prev, playerName])
    setSubsUsed(n => n + 1)
    const p = SQUAD_BASE.find(s => s.name === playerName)
    setMessages(prev => [...prev, { type: 'bot', text: `✓ ${p.short} taken off at ${minute}'. Bring on a ${p.role.toLowerCase()} — ${p.sub} (${subsUsed + 1}/5 subs used).` }])
  }

  const flaggedCount = board.filter(p => p.priority === 'now' || p.priority === 'soon').length

  return (
    <div className="tp-page">
      <Navbar title="Team Performance" />

      <div className="tp-layout">
        <aside className="tp-sidebar">
          <img className="tp-team-logo" src={TEAM_LOGO} alt="Atlas Lions" />
          <div className="tp-team-name">Atlas Lions</div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">Match Clock</span>
            <div className="tp-clock">{minute}'</div>
            <div className="tp-clock-sub">2nd half · live</div>
          </div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">Substitutions</span>
            <div className="tp-subs-count">{subsUsed}<small>/5</small></div>
            <div className="tp-subs-pips">
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className={`tp-sub-pip ${i < subsUsed ? 'used' : ''}`} />
              ))}
            </div>
            <div className="tp-clock-sub">{5 - subsUsed} changes left</div>
          </div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">On the Bench</span>
            <ul className="tp-bench-list">
              {BENCH.map(b => (
                <li key={b.name}>
                  <span>{b.name}</span>
                  <em className={b.ready === 'Ready' ? 'ready' : 'warm'}>{b.ready}</em>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="tp-main">
          <header className="tp-page-head">
            <h1>Substitution &amp; Fatigue Board</h1>
            <p>Live physical-load tracking for the starting XI, ranked into clear bench decisions — who to take off, when, and who to bring on.</p>
          </header>

          {/* ── Headline recommendation ── */}
          <section className={`tp-headline ${topCall ? `tp-headline-${topCall.priority}` : 'tp-headline-ok'}`}>
            {topCall ? (
              <>
                <img className="tp-headline-photo" src={getPlayerPhoto(topCall.name)} alt="" />
                <div className="tp-headline-body">
                  <div className="tp-headline-tag">{PRIORITY_LABEL[topCall.priority]} · minute {minute}'</div>
                  <h2>{topCall.name} <span>{topCall.role}</span></h2>
                  <p>{topCall.action}</p>
                  <p className="tp-headline-sub">Bring on: {topCall.sub}</p>
                </div>
                <button
                  className="tp-headline-btn"
                  onClick={() => makeSub(topCall.name)}
                  disabled={subsUsed >= 5}
                >
                  {subsUsed >= 5 ? 'No subs left' : `Confirm sub (${topCall.short})`}
                </button>
              </>
            ) : (
              <div className="tp-headline-body">
                <div className="tp-headline-tag">Minute {minute}'</div>
                <h2>No substitution needed right now</h2>
                <p>Every player is inside normal physical load. Keep watching the board — flags appear as legs tire.</p>
              </div>
            )}
          </section>

          {/* ── Ranked decision board ── */}
          <section className="tp-panel">
            <div className="tp-panel-title">
              Decision Board
              <span className="tp-panel-note">{flaggedCount} flagged · sorted by urgency</span>
            </div>
            <div className="tp-board">
              {board.map(p => (
                <div key={p.name} className={`tp-board-row tp-row-${p.priority}`}>
                  <img className="tp-board-photo" src={getPlayerPhoto(p.name)} alt="" />
                  <div className="tp-board-id">
                    <strong>{p.short}</strong>
                    <span>{p.role}</span>
                  </div>
                  <div className="tp-board-load">
                    <div className="tp-load-bar">
                      <div
                        className="tp-load-fill"
                        style={{
                          width: `${p.load}%`,
                          background: p.load >= 85 ? '#e23b3b' : p.load >= 70 ? '#e0a300' : '#37b24d',
                        }}
                      />
                    </div>
                    <span className="tp-load-val">{p.load}% load</span>
                    <span className="tp-load-meta">sprint −{p.sprintDrop}% · risk {p.injuryRisk}</span>
                  </div>
                  <div className="tp-board-mins">
                    {p.priority === 'ok'
                      ? <span className="tp-mins-ok">stable</span>
                      : p.priority === 'now'
                        ? <span className="tp-mins-now">now</span>
                        : <span className="tp-mins-soon">danger ~{p.dangerMinute}'</span>}
                  </div>
                  <div className={`tp-board-badge tp-badge-${p.priority}`}>{PRIORITY_LABEL[p.priority]}</div>
                  <button
                    className="tp-board-btn"
                    onClick={() => makeSub(p.name)}
                    disabled={subsUsed >= 5 || p.priority === 'ok'}
                  >
                    Sub
                  </button>
                </div>
              ))}
              {doneSubs.length > 0 && (
                <div className="tp-board-done">
                  Already changed: {doneSubs.map(n => SQUAD_BASE.find(s => s.name === n)?.short).join(', ')}
                </div>
              )}
            </div>
          </section>

          {/* ── Pitch (fatigue rings) + Coach chatbot ── */}
          <section className="tp-field-section">
            <div className="tp-field-section-header">
              <h2 className="tp-field-section-title">Squad Load Map</h2>
              <div className="tp-field-legend">
                <span><i style={{ background: '#37b24d' }} />Fresh</span>
                <span><i style={{ background: '#e0a300' }} />Tiring</span>
                <span><i style={{ background: '#e23b3b' }} />Danger</span>
              </div>
            </div>

            <div className="tp-field-layout">
              <div className="tp-field-canvas-wrap">
                <SquadFatigueCanvas squad={squad} />
              </div>

              <div className="tp-fr-panel tp-fr-chat">
                <div className="tp-fr-title">
                  <span>Coach Assistant</span>
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
                  {['Who to change', 'When', 'Injury risk', 'Bench', 'Subs left'].map((q) => (
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
                    placeholder="Ask about substitutions..."
                  />
                  <button onClick={() => sendMessage()}>Send</button>
                </div>
              </div>
            </div>
          </section>

          <footer className="tp-footer">Substitution &amp; Fatigue Board | Live coach view</footer>
        </main>
      </div>
    </div>
  )
}
