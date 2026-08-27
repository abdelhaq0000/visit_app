import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { players as squadPlayers, FALLBACK_PHOTO } from '../data/players'
import './MatchSetup.css'

// ── Formations ─────────────────────────────────────────────
const FORMATIONS = {
  '4-3-3': {
    label: '4-3-3', desc: 'Classique offensif',
    positions: [
      { id: 0, role: 'GB',  x: 0.06, y: 0.50 },
      { id: 1, role: 'DD',  x: 0.26, y: 0.82 },
      { id: 2, role: 'DC',  x: 0.26, y: 0.62 },
      { id: 3, role: 'DC',  x: 0.26, y: 0.38 },
      { id: 4, role: 'DG',  x: 0.26, y: 0.18 },
      { id: 5, role: 'MC',  x: 0.52, y: 0.72 },
      { id: 6, role: 'MC',  x: 0.52, y: 0.50 },
      { id: 7, role: 'MC',  x: 0.52, y: 0.28 },
      { id: 8, role: 'AD',  x: 0.80, y: 0.82 },
      { id: 9, role: 'AV',  x: 0.86, y: 0.50 },
      { id:10, role: 'AG',  x: 0.80, y: 0.18 },
    ],
  },
  '4-4-2': {
    label: '4-4-2', desc: 'Équilibré classique',
    positions: [
      { id: 0, role: 'GB',  x: 0.06, y: 0.50 },
      { id: 1, role: 'DD',  x: 0.26, y: 0.82 },
      { id: 2, role: 'DC',  x: 0.26, y: 0.62 },
      { id: 3, role: 'DC',  x: 0.26, y: 0.38 },
      { id: 4, role: 'DG',  x: 0.26, y: 0.18 },
      { id: 5, role: 'MD',  x: 0.54, y: 0.82 },
      { id: 6, role: 'MC',  x: 0.54, y: 0.62 },
      { id: 7, role: 'MC',  x: 0.54, y: 0.38 },
      { id: 8, role: 'MG',  x: 0.54, y: 0.18 },
      { id: 9, role: 'AV',  x: 0.82, y: 0.64 },
      { id:10, role: 'AV',  x: 0.82, y: 0.36 },
    ],
  },
  '4-2-3-1': {
    label: '4-2-3-1', desc: 'Double pivot défensif',
    positions: [
      { id: 0, role: 'GB',  x: 0.06, y: 0.50 },
      { id: 1, role: 'DD',  x: 0.26, y: 0.82 },
      { id: 2, role: 'DC',  x: 0.26, y: 0.62 },
      { id: 3, role: 'DC',  x: 0.26, y: 0.38 },
      { id: 4, role: 'DG',  x: 0.26, y: 0.18 },
      { id: 5, role: 'MDC', x: 0.44, y: 0.64 },
      { id: 6, role: 'MDC', x: 0.44, y: 0.36 },
      { id: 7, role: 'MOD', x: 0.65, y: 0.80 },
      { id: 8, role: 'MOC', x: 0.65, y: 0.50 },
      { id: 9, role: 'MOG', x: 0.65, y: 0.20 },
      { id:10, role: 'AV',  x: 0.86, y: 0.50 },
    ],
  },
  '3-5-2': {
    label: '3-5-2', desc: 'Milieu renforcé',
    positions: [
      { id: 0, role: 'GB',  x: 0.06, y: 0.50 },
      { id: 1, role: 'DC',  x: 0.26, y: 0.70 },
      { id: 2, role: 'DC',  x: 0.26, y: 0.50 },
      { id: 3, role: 'DC',  x: 0.26, y: 0.30 },
      { id: 4, role: 'PD',  x: 0.52, y: 0.90 },
      { id: 5, role: 'MC',  x: 0.52, y: 0.70 },
      { id: 6, role: 'MC',  x: 0.52, y: 0.50 },
      { id: 7, role: 'MC',  x: 0.52, y: 0.30 },
      { id: 8, role: 'PG',  x: 0.52, y: 0.10 },
      { id: 9, role: 'AV',  x: 0.82, y: 0.64 },
      { id:10, role: 'AV',  x: 0.82, y: 0.36 },
    ],
  },
  '5-3-2': {
    label: '5-3-2', desc: 'Défense renforcée',
    positions: [
      { id: 0, role: 'GB',  x: 0.06, y: 0.50 },
      { id: 1, role: 'PD',  x: 0.24, y: 0.90 },
      { id: 2, role: 'DD',  x: 0.24, y: 0.72 },
      { id: 3, role: 'DC',  x: 0.24, y: 0.50 },
      { id: 4, role: 'DG',  x: 0.24, y: 0.28 },
      { id: 5, role: 'PG',  x: 0.24, y: 0.10 },
      { id: 6, role: 'MD',  x: 0.54, y: 0.72 },
      { id: 7, role: 'MC',  x: 0.54, y: 0.50 },
      { id: 8, role: 'MG',  x: 0.54, y: 0.28 },
      { id: 9, role: 'AV',  x: 0.80, y: 0.64 },
      { id:10, role: 'AV',  x: 0.80, y: 0.36 },
    ],
  },
}

const ROLE_LABELS = {
  GB: 'Gardien de But',     DD: 'Défenseur Droit',    DC: 'Défenseur Central',
  DG: 'Défenseur Gauche',   PD: 'Piston Droit',       PG: 'Piston Gauche',
  MD: 'Milieu Droit',       MC: 'Milieu Central',     MG: 'Milieu Gauche',
  MDC: 'Milieu Déf. Cent.', MOD: 'Mil. Off. Droit',   MOC: 'Mil. Off. Cent.',
  MOG: 'Mil. Off. Gauche',  AD: 'Ailier Droit',       AG: 'Ailier Gauche',
  AV: 'Avant-Centre',
}

function autoAssign(formationKey) {
  const formation = FORMATIONS[formationKey]
  const used = new Set()
  return formation.positions.map(pos => {
    const r = pos.role
    const match = squadPlayers.find(p => {
      if (used.has(p.name)) return false
      const pp = p.position.toLowerCase()
      if (r === 'GB') return pp.includes('goalkeeper')
      if (['DD', 'PD'].includes(r)) return pp.includes('right back') || pp.includes('wing back')
      if (['DG', 'PG'].includes(r)) return pp.includes('left back')
      if (r === 'DC') return pp.includes('back') && !pp.includes('right') && !pp.includes('left')
      if (['MDC', 'MC', 'MD', 'MG'].includes(r)) return pp.includes('midfielder') && !pp.includes('attacking')
      if (['MOC', 'MOD', 'MOG'].includes(r)) return pp.includes('attacking mid')
      if (['AV', 'AD', 'AG'].includes(r)) return pp.includes('attacker') || pp.includes('forward')
      return false
    })
    if (match) { used.add(match.name); return match.name }
    return ''
  })
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// ── Match Sidebar ──────────────────────────────────────────
const LOGO = 'https://upload.wikimedia.org/wikipedia/fr/thumb/6/69/Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg/1920px-Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg.png'

function MatchSidebar({ matchInfo, formationKey, assignments, corners, onSave, onStart, saved }) {
  const assignedCount = assignments.filter(a => a && a !== '__custom__').length
  const cornerCount   = Object.values(corners).filter(c => c.lat && c.lng).length
  const gpsOk = cornerCount === 4

  const dateStr = matchInfo.date
    ? new Date(matchInfo.date).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'
  const timeStr = matchInfo.date
    ? new Date(matchInfo.date).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <aside className="ms-sidebar">
      <img className="ms-sb-logo" src={LOGO} alt="FRMF" onError={e => { e.target.style.display = 'none' }} />

      <div className="ms-sb-badge">Configuration Match</div>

      <div className="ms-sb-match-name">{matchInfo.name || 'Nouveau Match'}</div>
      {matchInfo.opponent && (
        <div className="ms-sb-opponent">vs {matchInfo.opponent}</div>
      )}

      <div className="ms-sb-divider" />

      <div className="ms-sb-section-title">Informations</div>
      <div className="ms-sb-info-list">
        <div className="ms-sb-info-item"><span>Date</span><span>{dateStr}</span></div>
        <div className="ms-sb-info-item"><span>Heure</span><span>{timeStr}</span></div>
        <div className="ms-sb-info-item"><span>Stade</span><span>{matchInfo.venue || '—'}</span></div>
      </div>

      <div className="ms-sb-divider" />

      <div className="ms-sb-section-title">Formation</div>
      <div className="ms-sb-formation-badge">{FORMATIONS[formationKey]?.label}</div>
      <div className="ms-sb-info-list">
        <div className="ms-sb-info-item">
          <span>Joueurs</span>
          <span className={assignedCount === 11 ? 'ms-sb-ok' : 'ms-sb-warn'}>
            {assignedCount} / 11
          </span>
        </div>
      </div>

      <div className="ms-sb-divider" />

      <div className="ms-sb-section-title">Référence GPS</div>
      <div className="ms-sb-gps-grid">
        {['NW','NE','SW','SE'].map((key, i) => {
          const ckey = key.toLowerCase()
          const filled = !!(corners[ckey]?.lat && corners[ckey]?.lng)
          return (
            <div key={key} className={`ms-sb-gps-dot ${filled ? 'filled' : ''}`}>
              <span>{key}</span>
            </div>
          )
        })}
      </div>
      <div className={`ms-sb-gps-status ${gpsOk ? 'ok' : ''}`}>
        {gpsOk ? 'Terrain calibré' : `${cornerCount} / 4 coins définis`}
      </div>

      <div className="ms-sb-divider" />

      {saved && <div className="ms-sb-saved">Configuration sauvegardée</div>}

      <button className="ms-sb-btn-save" onClick={onSave}>Sauvegarder</button>
      <button className="ms-sb-btn-start" onClick={onStart}>Démarrer le Match</button>
    </aside>
  )
}

// ── Formation canvas ───────────────────────────────────────
function FormationCanvas({ formationKey, assignments }) {
  const canvasRef = useRef(null)
  const formation = FORMATIONS[formationKey]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !formation) return
    const ctx = canvas.getContext('2d')
    const cw = canvas.width
    const ch = canvas.height

    const grd = ctx.createLinearGradient(0, 0, cw, 0)
    grd.addColorStop(0, '#195c19'); grd.addColorStop(0.5, '#1e7a1e'); grd.addColorStop(1, '#195c19')
    ctx.fillStyle = grd; ctx.fillRect(0, 0, cw, ch)
    for (let i = 0; i < 12; i++) {
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(i * cw / 12, 0, cw / 12, ch) }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.strokeRect(2, 2, cw - 4, ch - 4)
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke()
    ctx.beginPath(); ctx.arc(cw / 2, ch / 2, ch * 0.14, 0, Math.PI * 2); ctx.stroke()
    ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 3, 0, Math.PI * 2); ctx.fillStyle = 'white'; ctx.fill()

    const paw = (16.5 / 105) * cw, pah = (40.32 / 68) * ch
    const gaw = (5.5 / 105) * cw, gah = (18.32 / 68) * ch
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.strokeRect(0, (ch - pah) / 2, paw, pah)
    ctx.strokeRect(0, (ch - gah) / 2, gaw, gah)
    ctx.strokeRect(cw - paw, (ch - pah) / 2, paw, pah)
    ctx.strokeRect(cw - gaw, (ch - gah) / 2, gaw, gah)

    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    const gw = (7.32 / 68) * ch
    ctx.fillRect(0, (ch - gw) / 2, 5, gw); ctx.strokeRect(0, (ch - gw) / 2, 5, gw)
    ctx.fillRect(cw - 5, (ch - gw) / 2, 5, gw); ctx.strokeRect(cw - 5, (ch - gw) / 2, 5, gw)

    formation.positions.forEach((pos, i) => {
      const px = pos.x * cw
      const py = pos.y * ch
      const name = assignments[i] || pos.role
      const shortName = name.length > 10 ? name.split(' ').pop().substring(0, 9) : name
      const playerMatch = squadPlayers.find(p => p.name === name)

      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 7
      ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2)
      ctx.fillStyle = playerMatch ? '#3d0000' : '#2a2a2a'
      ctx.strokeStyle = playerMatch ? '#b89b5e' : '#777'
      ctx.lineWidth = 2; ctx.fill(); ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 8px sans-serif'
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(playerMatch ? playerMatch.jersey : pos.role, px, py - 1)

      ctx.fillStyle = 'rgba(255,255,255,0.90)'
      ctx.font = '7.5px sans-serif'
      ctx.fillText(shortName, px, py + 27)
    })
  }, [formationKey, assignments, formation])

  return <canvas ref={canvasRef} width={560} height={360} className="ms-formation-canvas" />
}

// ── GPS corner diagram ─────────────────────────────────────
function CornerDiagram({ corners }) {
  const allFilled = Object.values(corners).every(c => c.lat && c.lng)
  let width = null, length = null, valid = false
  if (allFilled) {
    const nw = corners.nw, ne = corners.ne, sw = corners.sw
    width  = haversine(+nw.lat, +nw.lng, +ne.lat, +ne.lng)
    length = haversine(+nw.lat, +nw.lng, +sw.lat, +sw.lng)
    valid  = width > 80 && width < 130 && length > 50 && length < 90
  }
  return (
    <div className="ms-corner-diag">
      <svg viewBox="0 0 200 130" className="ms-corner-svg">
        <rect x="10" y="10" width="180" height="110" rx="3" fill="#1e7a1e" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
        <line x1="100" y1="10" x2="100" y2="120" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <circle cx="100" cy="65" r="18" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        {[
          { id:'nw', cx:10,  cy:10,  label:'NO', anchor:'start',  dy:-8 },
          { id:'ne', cx:190, cy:10,  label:'NE', anchor:'end',    dy:-8 },
          { id:'sw', cx:10,  cy:120, label:'SO', anchor:'start',  dy:16 },
          { id:'se', cx:190, cy:120, label:'SE', anchor:'end',    dy:16 },
        ].map(m => (
          <g key={m.id}>
            <circle cx={m.cx} cy={m.cy} r="6"
              fill={corners[m.id].lat && corners[m.id].lng ? '#b89b5e' : '#555'}
              stroke="white" strokeWidth="1.5" />
            <text x={m.cx} y={m.cy + m.dy} textAnchor={m.anchor}
              fill="rgba(255,255,255,0.85)" fontSize="9" fontWeight="bold">{m.label}</text>
          </g>
        ))}
      </svg>
      {allFilled && (
        <div className={`ms-field-dims ${valid ? 'valid' : 'warn'}`}>
          {valid ? '✓' : '!'} {width.toFixed(1)}m × {length.toFixed(1)}m
          {!valid && ' — Dimensions inhabituelles'}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────
const EMPTY_CORNERS = {
  nw: { lat: '', lng: '' }, ne: { lat: '', lng: '' },
  sw: { lat: '', lng: '' }, se: { lat: '', lng: '' },
}

export default function MatchSetup() {
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)

  const [matchInfo, setMatchInfo] = useState({
    name: 'Maroc vs Adversaire',
    opponent: '',
    date: new Date().toISOString().slice(0, 16),
    venue: '',
  })

  const [corners, setCorners]         = useState(EMPTY_CORNERS)
  const [formationKey, setFormationKey] = useState('4-3-3')
  const [assignments, setAssignments]   = useState(() => autoAssign('4-3-3'))

  useEffect(() => { setAssignments(autoAssign(formationKey)) }, [formationKey])

  function setCorner(corner, field, value) {
    setCorners(prev => ({ ...prev, [corner]: { ...prev[corner], [field]: value } }))
  }

  function setAssignment(i, value) {
    setAssignments(prev => prev.map((v, idx) => idx === i ? value : v))
  }

  function handleSave() {
    localStorage.setItem('matchConfig', JSON.stringify({ matchInfo, corners, formation: formationKey, assignments, savedAt: new Date().toISOString() }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleStart() { handleSave(); navigate('/players') }

  const formation = FORMATIONS[formationKey]

  return (
    <div className="ms-page">
      <Navbar title="Paramètres du Match" />

      <div className="ms-layout">

        {/* ── Sidebar ── */}
        <MatchSidebar
          matchInfo={matchInfo}
          formationKey={formationKey}
          assignments={assignments}
          corners={corners}
          onSave={handleSave}
          onStart={handleStart}
          saved={saved}
        />

        {/* ── Main content ── */}
        <main className="ms-content">

          {/* Section 1: Match Info */}
          <section className="ms-section">
            <div className="ms-section-header">
              <h2>Informations du Match</h2>
            </div>
            <div className="ms-info-grid">
              <div className="ms-field">
                <label>Nom du match</label>
                <input value={matchInfo.name} onChange={e => setMatchInfo(p => ({ ...p, name: e.target.value }))} placeholder="ex. Maroc vs Espagne" />
              </div>
              <div className="ms-field">
                <label>Équipe adverse</label>
                <input value={matchInfo.opponent} onChange={e => setMatchInfo(p => ({ ...p, opponent: e.target.value }))} placeholder="Nom de l'équipe" />
              </div>
              <div className="ms-field">
                <label>Date &amp; Heure</label>
                <input type="datetime-local" value={matchInfo.date} onChange={e => setMatchInfo(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="ms-field">
                <label>Stade / Lieu</label>
                <input value={matchInfo.venue} onChange={e => setMatchInfo(p => ({ ...p, venue: e.target.value }))} placeholder="ex. Stade Mohammed V" />
              </div>
            </div>
          </section>

          {/* Section 2: GPS Reference Points */}
          <section className="ms-section">
            <div className="ms-section-header">
              <h2>Points de Repère GPS du Terrain</h2>
            </div>
            <p className="ms-section-desc">
              Définissez les 4 coins du terrain en coordonnées GPS. Ces points permettent de mapper la position GPS réelle du joueur sur le terrain virtuel.
            </p>
            <div className="ms-corners-layout">
              <CornerDiagram corners={corners} />
              <div className="ms-corners-grid">
                {[
                  { key: 'nw', label: 'Coin Nord-Ouest', sub: '(Gauche Attaque)' },
                  { key: 'ne', label: 'Coin Nord-Est',   sub: '(Droite Attaque)' },
                  { key: 'sw', label: 'Coin Sud-Ouest',  sub: '(Gauche Défense)' },
                  { key: 'se', label: 'Coin Sud-Est',    sub: '(Droite Défense)' },
                ].map(({ key, label, sub }) => (
                  <div key={key} className="ms-corner-card">
                    <div className="ms-corner-label">
                      <span className="ms-corner-badge">{key.toUpperCase()}</span>
                      <span>{label}</span>
                      <span className="ms-corner-sub">{sub}</span>
                    </div>
                    <div className="ms-corner-inputs">
                      <div className="ms-gps-field">
                        <label>Latitude</label>
                        <input type="number" step="0.000001" placeholder="34.681390"
                          value={corners[key].lat} onChange={e => setCorner(key, 'lat', e.target.value)} />
                      </div>
                      <div className="ms-gps-field">
                        <label>Longitude</label>
                        <input type="number" step="0.000001" placeholder="-1.908580"
                          value={corners[key].lng} onChange={e => setCorner(key, 'lng', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ms-gps-hint">
              Placez-vous à chaque coin du terrain avec le capteur GPS et relevez les coordonnées. Précision recommandée: 6 décimales.
            </div>
          </section>

          {/* Section 3: Formation & Players */}
          <section className="ms-section">
            <div className="ms-section-header">
              <h2>Formation &amp; Composition</h2>
            </div>

            <div className="ms-formation-selector">
              {Object.entries(FORMATIONS).map(([key, f]) => (
                <button key={key} className={`ms-formation-btn${formationKey === key ? ' active' : ''}`}
                  onClick={() => setFormationKey(key)}>
                  <span className="ms-fb-label">{f.label}</span>
                  <span className="ms-fb-desc">{f.desc}</span>
                </button>
              ))}
            </div>

            <div className="ms-formation-layout">
              <div className="ms-formation-canvas-wrap">
                <FormationCanvas formationKey={formationKey} assignments={assignments} />
                <div className="ms-canvas-legend">
                  <span><span className="ms-cl-dot ms-cl-squad" /> Joueur de l'équipe</span>
                  <span><span className="ms-cl-dot ms-cl-custom" /> Joueur personnalisé</span>
                </div>
              </div>

              <div className="ms-player-table-wrap">
                <div className="ms-player-table-header">
                  <span>#</span>
                  <span>Poste</span>
                  <span>Rôle</span>
                  <span>Joueur assigné</span>
                </div>
                <div className="ms-player-table-body">
                  {formation.positions.map((pos, i) => (
                    <div key={pos.id} className="ms-player-row">
                      <span className="ms-pr-num">{i + 1}</span>
                      <span className="ms-pr-role-badge">{pos.role}</span>
                      <span className="ms-pr-role-label">{ROLE_LABELS[pos.role] || pos.role}</span>
                      <select className="ms-pr-select" value={assignments[i]}
                        onChange={e => setAssignment(i, e.target.value)}>
                        <option value="">— Sélectionner —</option>
                        <optgroup label="Équipe du Maroc">
                          {squadPlayers.map(p => (
                            <option key={p.name} value={p.name}>{p.jersey} {p.name} ({p.position})</option>
                          ))}
                        </optgroup>
                        <optgroup label="Personnalisé">
                          <option value="__custom__">+ Entrer un nom...</option>
                        </optgroup>
                      </select>
                      {assignments[i] === '__custom__' && (
                        <input className="ms-pr-custom-input" placeholder="Nom du joueur"
                          onBlur={e => setAssignment(i, e.target.value || '')} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="ms-subs-note">
                  Les joueurs non assignés à la composition pourront être utilisés comme remplaçants.
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
