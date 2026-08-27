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

// ── Constantes terrain (dimensions FIFA, mètres) — identiques à PlayerPerformance ──
const FW = 105
const FH = 68

// ── Dessin du terrain sur le canvas — même rendu que PlayerPerformance ──
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

// ── Terrain : chaque joueur + anneau de charge physique ──
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

      // anneau de charge
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 17, -Math.PI / 2, -Math.PI / 2 + (p.load / 100) * Math.PI * 2)
      ctx.strokeStyle = ring; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke()
      ctx.restore()

      // pastille joueur
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = '#7e0101'; ctx.strokeStyle = '#fdf8ee'; ctx.lineWidth = 2.5
      ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(p.jersey || '', px, py + 1)
      ctx.restore()

      // nom + charge %
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

// ── XI de départ sur le terrain (% du terrain) + profil physique ──
// startLoad = charge cumulée à la minute 58 ; loadRate = charge gagnée par minute de jeu.
const SQUAD_BASE = [
  { name: 'Yassine Bounou',      short: 'Bounou',      x: 8,  y: 50, role: 'Gardien',            startLoad: 24, loadRate: 0.15, sub: 'Aucune rotation — gardien remplaçant seulement en cas de blessure.' },
  { name: 'Achraf Hakimi',       short: 'Hakimi',      x: 26, y: 16, role: 'Arrière droit',      startLoad: 71, loadRate: 0.62, sub: 'Arrière droit frais avec vitesse de récupération pour le 1v1.' },
  { name: 'Noussair Mazraoui',   short: 'Mazraoui',    x: 26, y: 84, role: 'Arrière latéral',    startLoad: 55, loadRate: 0.44, sub: 'Latéral équivalent, conserve la menace de débordement.' },
  { name: 'Bilal El Khannouss',  short: 'El Khannouss', x: 50, y: 34, role: 'Milieu central',     startLoad: 63, loadRate: 0.55, sub: 'Milieu box-to-box avec des jambes fraîches pour le pressing.' },
  { name: 'Ismail Saibari',      short: 'Saibari',     x: 50, y: 66, role: 'Milieu offensif',     startLoad: 66, loadRate: 0.58, sub: 'Meneur créatif pour garder la création de chances.' },
  { name: 'Soufiane Rahimi',     short: 'Rahimi',      x: 78, y: 50, role: 'Attaquant',           startLoad: 69, loadRate: 0.64, sub: 'Attaquant rapide pour exploiter une défense fatiguée.' },
]

// ── Banc : qui est prêt, associé aux postes ci-dessus ──
const BENCH = [
  { name: 'Arrière droit',    detail: 'Vitesse de récupération, bon en 1v1', ready: 'Prêt' },
  { name: 'Latéral',          detail: 'Deux pieds, bon débordement',         ready: 'Prêt' },
  { name: 'Milieu central',   detail: 'Récupérateur, gros volume',           ready: 'À l’échauffement' },
  { name: 'Milieu offensif',  detail: 'Passeur qui casse les lignes',        ready: 'Prêt' },
  { name: 'Attaquant',        detail: 'Vitesse + jeu direct',                ready: 'Prêt' },
]

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// ── Transforme l'état de l'équipe en tableau de décisions de banc classé ──
function buildSubBoard(squad, minute) {
  return squad
    .map(p => {
      const load = p.load
      const minsToDanger = load >= 85 ? 0 : Math.max(0, Math.round((85 - load) / Math.max(p.loadRate, 0.05)))
      const dangerMinute = load >= 85 ? minute : Math.min(90, minute + minsToDanger)

      let priority, action, injuryRisk
      if (load >= 88) {
        priority = 'now'
        action = 'Changer maintenant — l’activité physique a chuté et la couverture est faible.'
        injuryRisk = 'Élevé'
      } else if (load >= 82) {
        priority = 'soon'
        action = 'Préparer un changement — baisse rapide, planifier la sortie dans les prochaines minutes.'
        injuryRisk = 'Accru'
      } else if (load >= 72) {
        priority = 'watch'
        action = `Surveiller — les sprints faiblissent, réévaluer vers ${dangerMinute}'.`
        injuryRisk = 'Modéré'
      } else {
        priority = 'ok'
        action = 'Aucun souci — charge dans la normale.'
        injuryRisk = 'Faible'
      }
      if (p.role === 'Gardien') { priority = 'ok'; action = 'Gardien — aucune rotation prévue.'; injuryRisk = 'Faible' }

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

const PRIORITY_LABEL = { now: 'CHANGER', soon: 'PRÉPARER', watch: 'SURVEILLER', ok: 'OK' }

// ── Chatbot du coach — orienté décisions de banc ──
function getCoachReply(input, { board, minute, subsUsed }) {
  const msg = input.toLowerCase().trim()
  const now = board.filter(p => p.priority === 'now')
  const soon = board.filter(p => p.priority === 'soon')
  const watch = board.filter(p => p.priority === 'watch')

  if (/qui|change|remplac|sortir|banc|sub/.test(msg)) {
    if (now.length) {
      return `À sortir maintenant : ${now.map(p => `${p.short} (charge ${p.load}%, ${p.role}) → faire entrer un(e) ${p.role.toLowerCase()} — ${p.sub}`).join(' | ')}. ${soon.length ? `Ensuite : ${soon.map(p => p.short).join(', ')}.` : ''}`
    }
    if (soon.length) return `Pas de changement forcé pour l’instant, mais préparer quelqu’un pour ${soon.map(p => `${p.short} (${p.load}%)`).join(', ')}. Réévaluer dans 3–4 minutes.`
    if (watch.length) return `Rien d’urgent. Garder un œil sur ${watch.map(p => `${p.short} (danger ~${p.dangerMinute}')`).join(', ')}.`
    return 'Tout le XI est dans une charge normale — aucun changement nécessaire pour l’instant.'
  }
  if (/quand|timing|minute/.test(msg)) {
    const next = [...board].filter(p => p.priority !== 'ok').sort((a, b) => a.dangerMinute - b.dangerMinute)[0]
    if (!next) return `${minute}' — aucun joueur projeté en zone de danger avant la fin du match.`
    return `${minute}'. Premier changement forcé probable : ${next.short} vers ${next.dangerMinute}'. Planifier le premier changement vers ${Math.max(minute + 1, next.dangerMinute - 2)}'.`
  }
  if (/blessure|risque|ischio|claquage/.test(msg)) {
    const risky = board.filter(p => p.injuryRisk === 'Élevé' || p.injuryRisk === 'Accru')
    if (!risky.length) return 'Aucun marqueur de risque de blessure élevé sur le XI.'
    return `Risque de blessure : ${risky.map(p => `${p.short} — ${p.injuryRisk} (charge ${p.load}%, sprints −${p.sprintDrop}%)`).join(' | ')}. Efforts intenses répétés avec mauvaise récupération = risque musculaire.`
  }
  if (/banc|prêt|pret|échauff|echauff/.test(msg)) {
    return `État du banc : ${BENCH.map(b => `${b.name} — ${b.ready}`).join(' | ')}.`
  }
  if (/combien|reste|restant|utilisé|utilise/.test(msg)) {
    return `Remplacements utilisés : ${subsUsed} sur 5. Il reste ${5 - subsUsed} changements et jusqu’à 3 arrêts de jeu.`
  }
  if (/frais|garder|forme/.test(msg)) {
    const freshest = [...board].sort((a, b) => a.load - b.load)[0]
    return `Joueur de champ le plus frais encore sur le terrain : ${freshest.short} à ${freshest.load}% de charge — peut tenir les 90 minutes.`
  }
  if (/bonjour|salut|aide|help/.test(msg)) {
    return 'Demandez-moi : qui changer, quand, risque de blessure, état du banc, ou combien de remplacements restants.'
  }
  const lead = now[0] || soon[0] || watch[0]
  return lead
    ? `${minute}'. Priorité : ${lead.short} (charge ${lead.load}%, ${PRIORITY_LABEL[lead.priority]}). ${lead.action}`
    : `${minute}'. La charge de l’équipe est maîtrisée — aucun changement. Demandez le timing, le risque de blessure ou le banc.`
}

const INITIAL_MESSAGES = [
  { type: 'bot', text: 'Je suis la charge physique de chaque joueur en direct et je classe vos options de remplacement — qui sortir, quand, et qui faire entrer.' },
  { type: 'coach', text: 'Qui doit sortir en premier ?' },
  { type: 'bot', text: 'Demandez « qui changer », « quand », « risque de blessure » ou « banc » et je réponds depuis le tableau en direct.' },
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

  // avance l'horloge du match simulé toutes les 3 s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setMinute(m => (m >= 90 ? 46 : m + 1))
  }, [tick])

  // état de l'équipe en direct : la charge monte avec l'horloge + un peu de bruit
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

  // Défilement auto du chat seulement si l'utilisateur n'a pas remonté la conversation
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
    setMessages(prev => [...prev, { type: 'bot', text: `✓ ${p.short} sorti à la ${minute}'. Faire entrer un(e) ${p.role.toLowerCase()} — ${p.sub} (${subsUsed + 1}/5 remplacements utilisés).` }])
  }

  const flaggedCount = board.filter(p => p.priority === 'now' || p.priority === 'soon').length

  return (
    <div className="tp-page">
      <Navbar title="Performance de l'Équipe" />

      <div className="tp-layout">
        <aside className="tp-sidebar">
          <img className="tp-team-logo" src={TEAM_LOGO} alt="Lions de l'Atlas" />
          <div className="tp-team-name">Lions de l'Atlas</div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">Chrono du match</span>
            <div className="tp-clock">{minute}'</div>
            <div className="tp-clock-sub">2e mi-temps · en direct</div>
          </div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">Remplacements</span>
            <div className="tp-subs-count">{subsUsed}<small>/5</small></div>
            <div className="tp-subs-pips">
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} className={`tp-sub-pip ${i < subsUsed ? 'used' : ''}`} />
              ))}
            </div>
            <div className="tp-clock-sub">{5 - subsUsed} changements restants</div>
          </div>

          <div className="tp-sidebar-card">
            <span className="tp-sidebar-card-title">Sur le banc</span>
            <ul className="tp-bench-list">
              {BENCH.map(b => (
                <li key={b.name}>
                  <span>{b.name}</span>
                  <em className={b.ready === 'Prêt' ? 'ready' : 'warm'}>{b.ready}</em>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="tp-main">
          <header className="tp-page-head">
            <h1>Tableau des Remplacements &amp; de la Fatigue</h1>
            <p>Suivi en direct de la charge physique du XI de départ, classé en décisions de banc claires — qui sortir, quand, et qui faire entrer.</p>
          </header>

          {/* ── Recommandation principale ── */}
          <section className={`tp-headline ${topCall ? `tp-headline-${topCall.priority}` : 'tp-headline-ok'}`}>
            {topCall ? (
              <>
                <img className="tp-headline-photo" src={getPlayerPhoto(topCall.name)} alt="" />
                <div className="tp-headline-body">
                  <div className="tp-headline-tag">{PRIORITY_LABEL[topCall.priority]} · {minute}'</div>
                  <h2>{topCall.name} <span>{topCall.role}</span></h2>
                  <p>{topCall.action}</p>
                  <p className="tp-headline-sub">Faire entrer : {topCall.sub}</p>
                </div>
                <button
                  className="tp-headline-btn"
                  onClick={() => makeSub(topCall.name)}
                  disabled={subsUsed >= 5}
                >
                  {subsUsed >= 5 ? 'Plus de remplacements' : `Confirmer (${topCall.short})`}
                </button>
              </>
            ) : (
              <div className="tp-headline-body">
                <div className="tp-headline-tag">{minute}'</div>
                <h2>Aucun remplacement nécessaire pour l'instant</h2>
                <p>Tous les joueurs sont dans une charge physique normale. Continuez à surveiller le tableau — les alertes apparaissent quand les jambes fatiguent.</p>
              </div>
            )}
          </section>

          {/* ── Tableau de décisions classé ── */}
          <section className="tp-panel">
            <div className="tp-panel-title">
              Tableau de décisions
              <span className="tp-panel-note">{flaggedCount} signalé(s) · trié par urgence</span>
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
                    <span className="tp-load-val">{p.load}% de charge</span>
                    <span className="tp-load-meta">sprints −{p.sprintDrop}% · risque {p.injuryRisk}</span>
                  </div>
                  <div className="tp-board-mins">
                    {p.priority === 'ok'
                      ? <span className="tp-mins-ok">stable</span>
                      : p.priority === 'now'
                        ? <span className="tp-mins-now">maintenant</span>
                        : <span className="tp-mins-soon">danger ~{p.dangerMinute}'</span>}
                  </div>
                  <div className={`tp-board-badge tp-badge-${p.priority}`}>{PRIORITY_LABEL[p.priority]}</div>
                  <button
                    className="tp-board-btn"
                    onClick={() => makeSub(p.name)}
                    disabled={subsUsed >= 5 || p.priority === 'ok'}
                  >
                    Sortir
                  </button>
                </div>
              ))}
              {doneSubs.length > 0 && (
                <div className="tp-board-done">
                  Déjà remplacé(s) : {doneSubs.map(n => SQUAD_BASE.find(s => s.name === n)?.short).join(', ')}
                </div>
              )}
            </div>
          </section>

          {/* ── Terrain (anneaux de charge) + chatbot du coach ── */}
          <section className="tp-field-section">
            <div className="tp-field-section-header">
              <h2 className="tp-field-section-title">Carte de Charge de l'Équipe</h2>
              <div className="tp-field-legend">
                <span><i style={{ background: '#37b24d' }} />Frais</span>
                <span><i style={{ background: '#e0a300' }} />Fatigue</span>
                <span><i style={{ background: '#e23b3b' }} />Danger</span>
              </div>
            </div>

            <div className="tp-field-layout">
              <div className="tp-field-canvas-wrap">
                <SquadFatigueCanvas squad={squad} />
              </div>

              <div className="tp-fr-panel tp-fr-chat">
                <div className="tp-fr-title">
                  <span>Assistant du Coach</span>
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
                  {['Qui changer', 'Quand', 'Risque de blessure', 'Banc', 'Remplacements restants'].map((q) => (
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
                    placeholder="Posez une question sur les remplacements..."
                  />
                  <button onClick={() => sendMessage()}>Envoyer</button>
                </div>
              </div>
            </div>
          </section>

          <footer className="tp-footer">Tableau des Remplacements &amp; de la Fatigue | Vue coach en direct</footer>
        </main>
      </div>
    </div>
  )
}
