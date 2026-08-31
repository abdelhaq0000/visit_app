import { useState, useEffect, useRef } from 'react'
import mqtt from 'mqtt'
import Chart from 'chart.js/auto'
import Navbar from '../components/Navbar'
import PlayerSidebar from '../components/PlayerSidebar'
import { getAllPlayers, FALLBACK_PHOTO } from '../data/players'
import { getSessionsForPlayer } from '../data/history'
import { getActiveMatch } from '../data/matches'
import { generateMatchReportPdf } from '../lib/matchReport'
import './PlayerPerformance.css'

const MAX_ACC_HISTORY = 120

// ── MQTT defaults — same broker/topic convention as the standalone hh.html tracker dashboard ──
const DEFAULT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt'
const DEFAULT_TOPIC_ROOT = 'football/tracker/test-rabab-2026'

// ── Tagger live-tag topic root — same broker/connection, published by Tagger.jsx ──
const TAGGER_TOPIC_ROOT = 'football/tagger'

function slugifyPlayerName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const MAX_CHART_POINTS = 40

// ── Rolling X/Y/Z line chart — same setup as hh.html's makeChart/pushChartPoint ──
function chartOptions(title) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#3d0000' } },
      tooltip: { callbacks: { title: (items) => (items.length ? items[0].label : '') } },
    },
    scales: {
      x: { ticks: { color: '#888', maxTicksLimit: 8 }, grid: { color: 'rgba(61,0,0,0.06)' } },
      y: {
        title: { display: true, text: title, color: '#888' },
        ticks: { color: '#888' },
        grid: { color: 'rgba(61,0,0,0.06)' },
      },
    },
  }
}

function AccelerationChart({ point }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'X', data: [], borderColor: '#ef5350', backgroundColor: '#ef5350', tension: 0.22, pointRadius: 0, borderWidth: 2 },
          { label: 'Y', data: [], borderColor: '#29b6f6', backgroundColor: '#29b6f6', tension: 0.22, pointRadius: 0, borderWidth: 2 },
          { label: 'Z', data: [], borderColor: '#66bb6a', backgroundColor: '#66bb6a', tension: 0.22, pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: chartOptions('m/s²'),
    })
    return () => chartRef.current?.destroy()
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !point) return
    const values = [point.x, point.y, point.z]
    if (!values.every(Number.isFinite)) return

    chart.data.labels.push(new Date().toLocaleTimeString())
    chart.data.datasets[0].data.push(values[0])
    chart.data.datasets[1].data.push(values[1])
    chart.data.datasets[2].data.push(values[2])

    if (chart.data.labels.length > MAX_CHART_POINTS) {
      chart.data.labels.shift()
      chart.data.datasets.forEach((dataset) => dataset.data.shift())
    }
    chart.update('none')
  }, [point])

  return <canvas ref={canvasRef} />
}

// ── Field constants (FIFA dimensions, meters) ─────────────
const FW = 105
const FH = 68

// ── Action colors for field markers ───────────────────────
const ACTION_COLORS = {
  'Short Pass': '#4fc3f7', 'Long Pass': '#29b6f6', 'Dribble': '#ffd54f',
  'Tackle': '#ef5350', 'Shot': '#ff6f00', 'Header': '#ab47bc',
  'Interception': '#26c6da', 'Cross': '#66bb6a', 'Pressing': '#ff7043',
  'Goal': '#f9a825', 'Assist': '#aed581', 'Foul': '#e53935',
}
const FIELD_ACTIONS = Object.keys(ACTION_COLORS)

// Libellés d'affichage FR pour les actions taguées (mêmes clés que Tagger.jsx)
const ACTION_LABELS = {
  'Short Pass': 'Passe courte', 'Long Pass': 'Passe longue', Cross: 'Centre', Shot: 'Tir',
  Header: 'Tête', Dribble: 'Dribble', 'First Touch': 'Contrôle',
  Tackle: 'Tacle', Interception: 'Interception', Block: 'Contre', Clearance: 'Dégagement', Pressing: 'Pressing',
  Goal: 'But', Assist: 'Passe décisive', Foul: 'Faute',
  'Yellow Card': 'Carton jaune', Corner: 'Corner', 'Free Kick': 'Coup franc',
}
const actionLabel = (a) => ACTION_LABELS[a] || a

function formatSessionDate(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Position zone per player role ─────────────────────────
function getZoneForPosition(pos) {
  if (pos.includes('Goalkeeper'))
    return { cx: 5, cy: 34, sx: 12, sy: 20, label: 'Gardien de But' }
  if (pos.includes('Right Back') || pos.includes('Wing Back'))
    return { cx: 55, cy: 60, sx: 42, sy: 12, label: 'Latéral Droit' }
  if (pos.includes('Attacking Mid'))
    return { cx: 73, cy: 34, sx: 25, sy: 28, label: 'Milieu Offensif' }
  if (pos.includes('Midfielder'))
    return { cx: 57, cy: 34, sx: 28, sy: 28, label: 'Milieu Terrain' }
  if (pos.includes('Attacker'))
    return { cx: 85, cy: 34, sx: 18, sy: 24, label: 'Attaquant' }
  return { cx: 52, cy: 34, sx: 30, sy: 28, label: 'Joueur' }
}

// ── Alert zone overlays per player role ───────────────────
function getAlertZones(pos) {
  if (pos.includes('Goalkeeper')) {
    return [
      { x: 16.5, y: 0, w: 35.5, h: 68, fill: 'rgba(255,120,0,0.07)', stroke: 'rgba(255,140,0,0.65)', label: '⚠ Zone de Sortie' },
    ]
  }
  if (pos.includes('Right Back') || pos.includes('Wing Back')) {
    return [
      { x: 88.5, y: 13.84, w: 16.5, h: 40.32, fill: 'rgba(220,40,0,0.09)', stroke: 'rgba(220,50,0,0.75)', label: '⚠ Surface Adverse' },
      { x: 0, y: 53, w: 16.5, h: 15, fill: 'rgba(255,140,0,0.07)', stroke: 'rgba(255,140,0,0.60)', label: '⚠ Zone Isolée' },
    ]
  }
  if (pos.includes('Attacking Mid')) {
    return [
      { x: 0, y: 0, w: 38, h: 68, fill: 'rgba(255,140,0,0.06)', stroke: 'rgba(255,140,0,0.60)', label: '⚠ Zone Éloignée' },
    ]
  }
  if (pos.includes('Midfielder')) {
    return [
      { x: 0, y: 13.84, w: 16.5, h: 40.32, fill: 'rgba(255,140,0,0.06)', stroke: 'rgba(255,140,0,0.60)', label: '⚠ Zone Défensive' },
    ]
  }
  if (pos.includes('Attacker')) {
    return [
      { x: 0, y: 0, w: 52.5, h: 68, fill: 'rgba(255,140,0,0.05)', stroke: 'rgba(255,140,0,0.55)', label: '⚠ Camp Propre' },
    ]
  }
  return []
}

// ── Seed static positions for immediate heatmap display ───
function generateInitialPositions(zone, count = 90) {
  const positions = []
  let x = zone.cx + (Math.random() - 0.5) * zone.sx * 0.4
  let y = zone.cy + (Math.random() - 0.5) * zone.sy * 0.4
  for (let i = 0; i < count; i++) {
    const dx = (zone.cx - x) * 0.12 + (Math.random() - 0.5) * 8
    const dy = (zone.cy - y) * 0.12 + (Math.random() - 0.5) * 6
    x = Math.max(1, Math.min(FW - 1, x + dx))
    y = Math.max(1, Math.min(FH - 1, y + dy))
    positions.push({ x, y })
  }
  return positions
}

// ── Random walk toward zone center ────────────────────────
function nextFieldPos(prev, zone, speed) {
  const step = Math.min(speed * 0.3, 10)
  if (!prev) {
    return {
      x: Math.max(1, Math.min(FW - 1, zone.cx + (Math.random() - 0.5) * zone.sx)),
      y: Math.max(1, Math.min(FH - 1, zone.cy + (Math.random() - 0.5) * zone.sy)),
    }
  }
  const dx = (zone.cx - prev.x) * 0.07 + (Math.random() - 0.5) * step
  const dy = (zone.cy - prev.y) * 0.07 + (Math.random() - 0.5) * step * 0.7
  return {
    x: Math.max(1, Math.min(FW - 1, prev.x + dx)),
    y: Math.max(1, Math.min(FH - 1, prev.y + dy)),
  }
}

// ── Draw football field on canvas ─────────────────────────
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

// ── Heatmap canvas component ───────────────────────────────
function FieldHeatmap({ positions, currentPos, alertZones, tagEvents, playerZone }) {
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

    if (playerZone) {
      ctx.save()
      ctx.fillStyle = 'rgba(100,220,100,0.10)'
      ctx.strokeStyle = 'rgba(120,255,120,0.55)'
      ctx.lineWidth = 1.5; ctx.setLineDash([8, 5])
      ctx.fillRect((playerZone.cx - playerZone.sx) * sx, (playerZone.cy - playerZone.sy) * sy, playerZone.sx * 2 * sx, playerZone.sy * 2 * sy)
      ctx.strokeRect((playerZone.cx - playerZone.sx) * sx, (playerZone.cy - playerZone.sy) * sy, playerZone.sx * 2 * sx, playerZone.sy * 2 * sy)
      ctx.restore()
    }

    alertZones.forEach(az => {
      ctx.save()
      ctx.fillStyle = az.fill; ctx.strokeStyle = az.stroke; ctx.lineWidth = 2; ctx.setLineDash([6, 3])
      ctx.fillRect(az.x * sx, az.y * sy, az.w * sx, az.h * sy)
      ctx.strokeRect(az.x * sx, az.y * sy, az.w * sx, az.h * sy)
      ctx.setLineDash([]); ctx.fillStyle = az.stroke; ctx.font = 'bold 9px sans-serif'
      ctx.fillText(az.label, az.x * sx + 5, az.y * sy + 14)
      ctx.restore()
    })

    const total = positions.length
    positions.forEach((pos, idx) => {
      const px = pos.x * sx; const py = pos.y * sy
      const ratio = idx / Math.max(total - 1, 1)
      const radius = 13 + ratio * 10
      const alpha = 0.022 + ratio * 0.048
      let r, g, b
      if (ratio > 0.80)      { r = 255; g = 30;  b = 0   }
      else if (ratio > 0.60) { r = 255; g = 130; b = 0   }
      else if (ratio > 0.40) { r = 255; g = 220; b = 0   }
      else if (ratio > 0.20) { r = 0;   g = 210; b = 90  }
      else                   { r = 0;   g = 110; b = 255 }
      const grd = ctx.createRadialGradient(px, py, 0, px, py, radius)
      grd.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 1.8).toFixed(3)})`)
      grd.addColorStop(0.5, `rgba(${r},${g},${b},${alpha.toFixed(3)})`)
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill()
    })

    // Trajectory path — last 40 positions
    const traj = positions.slice(-40)
    if (traj.length > 1) {
      ctx.save()
      ctx.beginPath()
      traj.forEach((pos, i) => {
        const px = pos.x * sx, py = pos.y * sy
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      })
      ctx.strokeStyle = 'rgba(255,255,255,0.50)'
      ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke()
      // Trajectory dots — fade old to new
      traj.forEach((pos, i) => {
        const px = pos.x * sx, py = pos.y * sy
        const a = 0.12 + (i / traj.length) * 0.55
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; ctx.fill()
      })
      ctx.restore()
    }

    tagEvents.forEach(ev => {
      if (!ev.pos) return
      const px = ev.pos.x * sx; const py = ev.pos.y * sy
      const color = ACTION_COLORS[ev.action] || '#ffffff'
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5
      ctx.fill(); ctx.stroke(); ctx.restore()
    })

    if (currentPos) {
      const px = currentPos.x * sx; const py = currentPos.y * sy
      ctx.save()
      ctx.beginPath(); ctx.arc(px, py, 16, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke()
      ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 2.5; ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#cc0000'; ctx.fill(); ctx.restore()
    }
  }, [positions, currentPos, alertZones, tagEvents, playerZone])

  return <canvas ref={canvasRef} width={840} height={543} className="pp-field-canvas" />
}

// ── Collapsible panel shell — used for Tagger events, wearable sessions & live sensor data ──
function CollapsiblePanel({ title, count, open, onToggle, children }) {
  return (
    <section className="pp-collapse-panel">
      <button type="button" className="pp-collapse-head" onClick={onToggle} aria-expanded={open}>
        <span className="pp-collapse-title">
          {title}
          {count !== undefined && <span className="pp-collapse-count">{count}</span>}
        </span>
        <span className={`pp-collapse-chevron${open ? ' open' : ''}`}>▼</span>
      </button>
      {open && <div className="pp-collapse-body">{children}</div>}
    </section>
  )
}

// ── Tagger sessions panel — actions tagged for this player via Tagger.jsx ──
// Shows the live match stream (if a match is in progress) above past saved sessions.
function TaggerSessionsPanel({ sessions, liveTags, isLive, open, onToggle }) {
  const [openId, setOpenId] = useState(null)
  const totalCount = sessions.length + (isLive ? liveTags.length : 0)

  return (
    <CollapsiblePanel title="Actions Taguées (Tagger)" count={totalCount} open={open} onToggle={onToggle}>
      {isLive && (
        <div className="pp-live-tags-block">
          <div className="pp-live-tags-title">
            <span className="pp-chat-live-dot" /> En direct — {liveTags.length} action(s) cette session
          </div>
          {liveTags.length === 0 ? (
            <div className="pp-collapse-empty">En attente des premières actions taguées…</div>
          ) : (
            <div className="pp-live-tags-list">
              {[...liveTags].reverse().map((t) => (
                <div key={t.id} className="pp-live-tag-item">
                  <span className="pp-live-tag-time">{t.time}</span>
                  <span className="pp-live-tag-action">{actionLabel(t.action)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {sessions.length === 0 ? (
        <div className="pp-collapse-empty">Aucune session de tagging enregistrée pour ce joueur. Utilisez « Enregistrer &amp; Terminer » dans le Tagger.</div>
      ) : (
        <div className="pp-session-list">
          {sessions.map((s) => {
            const isOpen = openId === s.id
            return (
              <div key={s.id} className={`pp-session-card${isOpen ? ' open' : ''}`}>
                <div className="pp-session-row" onClick={() => setOpenId(isOpen ? null : s.id)}>
                  <span className="pp-session-date">{formatSessionDate(s.date)}</span>
                  <span className="pp-session-stats">
                    <span className="pp-session-stat">{s.summary?.goals ?? 0} but(s)</span>
                    <span className="pp-session-stat">{s.summary?.assists ?? 0} passe(s) déc.</span>
                    <span className="pp-session-stat">{s.summary?.totalEvents ?? s.events?.length ?? 0} action(s)</span>
                  </span>
                  <span className={`pp-session-team-chip ${s.teamKey}`}>{s.teamKey === 'opponent' ? 'Adverse' : 'Maroc'}</span>
                  <span className="pp-session-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="pp-session-detail">
                    <table className="pp-session-table">
                      <thead>
                        <tr><th>Heure</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        {(s.events || []).map((e) => (
                          <tr key={e.id}>
                            <td>{e.time}</td>
                            <td>{actionLabel(e.action)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </CollapsiblePanel>
  )
}

// ── Wearable sessions panel — GPS/MPU sessions saved from this page ──
function WearableSessionsPanel({ sessions, open, onToggle }) {
  const [openId, setOpenId] = useState(null)

  return (
    <CollapsiblePanel title="Sessions Capteur (Wearable)" count={sessions.length} open={open} onToggle={onToggle}>
      {sessions.length === 0 ? (
        <div className="pp-collapse-empty">Aucune session capteur enregistrée pour ce joueur. Cliquez « Enregistrer la session » une fois des données captées.</div>
      ) : (
        <div className="pp-session-list">
          {sessions.map((s) => {
            const isOpen = openId === s.id
            return (
              <div key={s.id} className={`pp-session-card${isOpen ? ' open' : ''}`}>
                <div className="pp-session-row" onClick={() => setOpenId(isOpen ? null : s.id)}>
                  <span className="pp-session-date">{formatSessionDate(s.date)}</span>
                  <span className="pp-session-stats">
                    <span className="pp-session-stat">{s.sessionStats?.maxSpeed} km/h max</span>
                    <span className="pp-session-stat">{s.sessionStats?.dist} km</span>
                    <span className="pp-session-stat">{s.sessionStats?.temp}°C</span>
                    <span className="pp-session-stat">{s.alertsLog?.length || 0} alerte(s)</span>
                  </span>
                  <span className="pp-session-chevron">{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div className="pp-session-detail">
                    <div className="pp-session-report-grid">
                      <div className="pp-session-report-item"><span>Vitesse max</span><strong>{s.sessionStats?.maxSpeed} km/h</strong></div>
                      <div className="pp-session-report-item"><span>Distance</span><strong>{s.sessionStats?.dist} km</strong></div>
                      <div className="pp-session-report-item"><span>Température</span><strong>{s.sessionStats?.temp} °C</strong></div>
                      <div className="pp-session-report-item"><span>Satellites</span><strong>{s.sessionStats?.sats}</strong></div>
                      <div className="pp-session-report-item"><span>Camp propre</span><strong>{s.zoneStats?.ownHalf ?? 0}</strong></div>
                      <div className="pp-session-report-item"><span>Milieu</span><strong>{s.zoneStats?.midfield ?? 0}</strong></div>
                      <div className="pp-session-report-item"><span>Camp adverse</span><strong>{s.zoneStats?.oppHalf ?? 0}</strong></div>
                      <div className="pp-session-report-item"><span>Actions taguées</span><strong>{s.tagHistory?.length || 0}</strong></div>
                    </div>
                    {s.alertsLog?.length > 0 && (
                      <div className="pp-session-alerts">
                        {s.alertsLog.map((a, i) => (
                          <div key={i} className={`pp-session-alert-item pp-alert-${a.level}`}>
                            <span>{a.time}</span> — {a.msg}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </CollapsiblePanel>
  )
}

// ── Expected zone occupancy per role (reference %) ─────────
const ROLE_ZONE_TARGET = {
  'Goalkeeper':        { own: 85, mid: 14, opp: 1  },
  'Right Back':         { own: 45, mid: 40, opp: 15 },
  'Wing Back':          { own: 40, mid: 40, opp: 20 },
  'Midfielder':         { own: 30, mid: 45, opp: 25 },
  'Attacking Midfielder': { own: 15, mid: 40, opp: 45 },
  'Attacker':           { own: 10, mid: 30, opp: 60 },
}

function getZoneTarget(pos) {
  if (pos.includes('Goalkeeper')) return ROLE_ZONE_TARGET['Goalkeeper']
  if (pos.includes('Right Back') || pos.includes('Wing Back')) return ROLE_ZONE_TARGET['Right Back']
  if (pos.includes('Attacking Mid')) return ROLE_ZONE_TARGET['Attacking Midfielder']
  if (pos.includes('Midfielder')) return ROLE_ZONE_TARGET['Midfielder']
  if (pos.includes('Attacker')) return ROLE_ZONE_TARGET['Attacker']
  return { own: 34, mid: 33, opp: 33 }
}

// ── Build tactical insights & recommendations from position data ──
function buildPositionInsights({ zoneStats, tagHistory, player, activeAlerts }) {
  const totalZ = zoneStats.ownHalf + zoneStats.midfield + zoneStats.oppHalf || 1
  const pOwn = Math.round(zoneStats.ownHalf  / totalZ * 100)
  const pMid = Math.round(zoneStats.midfield / totalZ * 100)
  const pOpp = Math.round(zoneStats.oppHalf  / totalZ * 100)
  const target = getZoneTarget(player.position)

  const actionCounts = {}
  tagHistory.forEach(ev => { actionCounts[ev.action] = (actionCounts[ev.action] || 0) + 1 })
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const insights = []
  const diffOwn = pOwn - target.own
  const diffOpp = pOpp - target.opp

  if (Math.abs(diffOwn) >= 15) {
    insights.push(diffOwn > 0
      ? { level: 'orange', text: `Temps passé en camp propre (${pOwn}%) supérieur de ${diffOwn}pts à la référence du poste (${target.own}%) — repli trop fréquent.` }
      : { level: 'blue', text: `Temps en camp propre (${pOwn}%) plus bas que la référence (${target.own}%) — bon soutien offensif, mais vérifier la couverture défensive.` })
  }
  if (Math.abs(diffOpp) >= 15) {
    insights.push(diffOpp > 0
      ? { level: 'green', text: `Présence en camp adverse (${pOpp}%) au-dessus de la référence (${target.opp}%) — apport offensif fort.` }
      : { level: 'orange', text: `Présence en camp adverse (${pOpp}%) en retrait par rapport à la référence (${target.opp}%) — manque de projection vers l'avant.` })
  }
  if (insights.length === 0) {
    insights.push({ level: 'green', text: `Répartition des zones (${pOwn}% / ${pMid}% / ${pOpp}%) cohérente avec le profil de poste attendu.` })
  }

  const tackles = actionCounts['Tackle'] || 0
  const interceptions = actionCounts['Interception'] || 0
  const shots = actionCounts['Shot'] || 0
  const goals = actionCounts['Goal'] || 0
  const dribbles = actionCounts['Dribble'] || 0
  const fouls = actionCounts['Foul'] || 0

  if (fouls >= 3) insights.push({ level: 'red', text: `${fouls} fautes enregistrées — risque de carton, discipline à surveiller.` })
  if (tackles + interceptions >= 6) insights.push({ level: 'blue', text: `Forte activité défensive (${tackles} tacles, ${interceptions} interceptions) — bonne couverture de zone.` })
  if (shots >= 3 && goals === 0) insights.push({ level: 'orange', text: `${shots} tirs sans but marqué — finition à travailler ou déséquilibre de placement au moment de la frappe.` })
  if (dribbles >= 5) insights.push({ level: 'green', text: `${dribbles} dribbles réussis — joueur très actif balle au pied dans sa zone.` })

  if (activeAlerts.some(a => a.type === 'tactical')) {
    insights.push({ level: 'red', text: 'Écart tactique détecté par rapport au poste assigné — vérifier les consignes de replacement.' })
  }

  const recommendations = []
  if (diffOwn > 15) recommendations.push('Encourager une remontée plus rapide après phase défensive pour réduire le temps en camp propre.')
  if (diffOpp < -15 && !player.position.includes('Goalkeeper')) recommendations.push('Augmenter les prises de risque offensives / soutenir davantage les attaques.')
  if (diffOpp > 20 && (player.position.includes('Back') || player.position.includes('Defender'))) recommendations.push('Limiter les montées prolongées pour ne pas exposer le couloir défensif.')
  if (fouls >= 3) recommendations.push('Travailler le timing des interventions défensives pour limiter les fautes.')
  if (shots >= 3 && goals === 0) recommendations.push('Séances ciblées de finition et prise de décision dans la surface.')
  if (pMid > 55) recommendations.push('Varier davantage les zones d\'intervention — trop centré sur le milieu de terrain.')
  if (recommendations.length === 0) recommendations.push('Maintenir le plan de jeu actuel — occupation du terrain conforme aux attentes du poste.')

  return { pOwn, pMid, pOpp, target, topActions, insights, recommendations }
}

// ── AI response generator ──────────────────────────────────
function getAIResponse(input, { sensor, currentFieldPos, zoneStats, activeAlerts, player, sessionStats, tagHistory }) {
  const msg = input.toLowerCase().trim()
  const speed = sensor?.gps.speed ?? 0
  const temp  = sensor?.mpu.temperature ?? 25
  const totalZ = zoneStats.ownHalf + zoneStats.midfield + zoneStats.oppHalf || 1
  const pOwn = Math.round(zoneStats.ownHalf  / totalZ * 100)
  const pMid = Math.round(zoneStats.midfield / totalZ * 100)
  const pOpp = Math.round(zoneStats.oppHalf  / totalZ * 100)
  const posX = currentFieldPos?.x.toFixed(1) ?? '—'
  const posY = currentFieldPos?.y.toFixed(1) ?? '—'
  const target = getZoneTarget(player.position)

  if (/vitesse|speed|sprint|km/.test(msg)) {
    const lvl = speed > 26 ? '⚠️ Sprint critique!' : speed > 18 ? 'Course active' : 'Marche / repos'
    return `Vitesse actuelle: ${speed.toFixed(1)} km/h (${lvl}). Max session: ${sessionStats.maxSpeed} km/h. Distance: ${sessionStats.dist} km.`
  }
  if (/position|terrain|zone|coord/.test(msg)) {
    const ecart = Math.abs(pOwn - target.own) >= 15 || Math.abs(pOpp - target.opp) >= 15
    return `Position sur le terrain: X=${posX}m, Y=${posY}m. Répartition — Camp propre: ${pOwn}% | Milieu: ${pMid}% | Camp adverse: ${pOpp}%. Référence du poste (${player.position}): ${target.own}%/${target.mid}%/${target.opp}%. ${ecart ? '⚠️ Écart notable avec le profil attendu.' : '✅ Conforme au profil de poste.'}`
  }
  if (/action|tag|événement|evenement|tir|passe|dribble|tacle|duel/.test(msg)) {
    if (tagHistory.length === 0) return 'Aucune action enregistrée pour le moment sur cette session.'
    const counts = {}
    tagHistory.forEach(ev => { counts[ev.action] = (counts[ev.action] || 0) + 1 })
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    return `Actions enregistrées (${tagHistory.length} au total): ${top.map(([a, n]) => `${a} x${n}`).join(', ')}.`
  }
  if (/alerte|alert|danger|risque/.test(msg)) {
    if (activeAlerts.length === 0) return '✅ Aucune alerte active. Tous les paramètres sont normaux.'
    return `⚠️ ${activeAlerts.length} alerte(s): ${activeAlerts.map(a => a.msg).join(' | ')}`
  }
  if (/temp|chaleur|thermique/.test(msg)) {
    return `Température capteur: ${temp.toFixed(1)}°C. ${temp > 30 ? '⚠️ Température élevée!' : '✅ Normale.'}`
  }
  if (/performance|bilan|rapport/.test(msg)) {
    const dom = pOpp > pOwn && pOpp > pMid ? 'camp adverse' : pOwn > pMid ? 'camp propre' : 'milieu'
    return `Bilan ${player.name}: max ${sessionStats.maxSpeed} km/h, ${sessionStats.dist} km, ${player.position}. Zone dominante: ${dom}. ${activeAlerts.length > 0 ? activeAlerts.length + ' alerte(s).' : 'Aucune alerte.'}`
  }
  if (/fatigue|endurance|récupération/.test(msg)) {
    const d = parseFloat(sessionStats.dist)
    return d > 4 ? `Distance ${sessionStats.dist} km — fatigue possible. Surveillance renforcée recommandée.`
      : d > 1.5 ? `Distance ${sessionStats.dist} km — effort modéré, joueur encore frais.`
      : `Session courte (${sessionStats.dist} km) — joueur en bonne condition.`
  }
  if (/gps|satellite|signal/.test(msg)) {
    return `GPS: ${sessionStats.sats} satellites | Lat ${sensor?.gps.lat.toFixed(5) ?? '—'} | Lng ${sensor?.gps.lng.toFixed(5) ?? '—'}. Signal: ${parseInt(sessionStats.sats) >= 8 ? 'Excellent' : parseInt(sessionStats.sats) >= 6 ? 'Bon' : 'Faible'}.`
  }
  if (/accél|gyro|imu|capteur|mpu/.test(msg)) {
    const acc = sensor ? Math.sqrt(sensor.mpu.accX ** 2 + sensor.mpu.accY ** 2 + sensor.mpu.accZ ** 2) : 0
    return `Accélération: ${acc.toFixed(2)} m/s². Gyro X:${sensor?.mpu.gyroX.toFixed(2) ?? '—'} Y:${sensor?.mpu.gyroY.toFixed(2) ?? '—'} Z:${sensor?.mpu.gyroZ.toFixed(2) ?? '—'} rad/s.`
  }
  if (/conseil|recommand|suggest/.test(msg)) {
    const recs = []
    if (speed > 26) recs.push('Prévoir une pause de récupération')
    if (temp > 30) recs.push('Vérifier capteur — surchauffe')
    if (pOwn > 65 && !player.position.includes('Goalkeeper') && !player.position.includes('Back'))
      recs.push('Pousser vers la zone adverse')
    if (activeAlerts.some(a => a.type === 'position')) recs.push('Repositionnement tactique requis')
    const { recommendations } = buildPositionInsights({ zoneStats, tagHistory, player, activeAlerts })
    recommendations.forEach(r => { if (!recs.includes(r)) recs.push(r) })
    if (recs.length === 0) recs.push('Maintenir le rythme actuel', 'Conserver la position tactique')
    return `Recommandations pour ${player.name}: ${recs.join(' | ')}.`
  }
  if (/insight|analyse|profil|tactiq/.test(msg)) {
    const { insights } = buildPositionInsights({ zoneStats, tagHistory, player, activeAlerts })
    return `Analyse tactique de ${player.name}: ${insights.map(i => i.text).join(' | ')}`
  }
  if (/bonjour|salut|hello|aide|help/.test(msg)) {
    return `Bonjour! Je surveille ${player.name} en temps réel. Demandez-moi: vitesse, position, zone, actions, alertes, performance, fatigue, GPS, accélération, insights ou recommandations.`
  }
  return `Je surveille ${player.name} (${player.position}). Actuellement à ${speed.toFixed(1)} km/h, position X=${posX}m. Que souhaitez-vous analyser?`
}

// ── Map an MQTT tracker payload (same shape as hh.html) into sensor state ──
// Merges onto the previous reading since GPS (/data), MPU (/data) and
// diagnostic messages can arrive as separate MQTT messages/topics.
function mergeSensorFromPayload(prev, data) {
  const gpsPrev = prev?.gps ?? {}
  const mpuPrev = prev?.mpu ?? {}
  return {
    gps: {
      lat: data.latitude !== undefined ? Number(data.latitude) : gpsPrev.lat,
      lng: data.longitude !== undefined ? Number(data.longitude) : gpsPrev.lng,
      speed: data.speed_kmh !== undefined ? Number(data.speed_kmh) : gpsPrev.speed ?? 0,
      altitude: data.altitude_m !== undefined ? Number(data.altitude_m) : gpsPrev.altitude ?? 0,
      satellites: data.satellites !== undefined ? Number(data.satellites) : gpsPrev.satellites ?? 0,
    },
    mpu: {
      accX: (data.acceleration_x ?? data.acceleration_x_m_s2) !== undefined
        ? Number(data.acceleration_x ?? data.acceleration_x_m_s2) : mpuPrev.accX ?? 0,
      accY: (data.acceleration_y ?? data.acceleration_y_m_s2) !== undefined
        ? Number(data.acceleration_y ?? data.acceleration_y_m_s2) : mpuPrev.accY ?? 0,
      accZ: (data.acceleration_z ?? data.acceleration_z_m_s2) !== undefined
        ? Number(data.acceleration_z ?? data.acceleration_z_m_s2) : mpuPrev.accZ ?? 0,
      gyroX: (data.gyro_x ?? data.gyro_x_rad_s) !== undefined
        ? Number(data.gyro_x ?? data.gyro_x_rad_s) : mpuPrev.gyroX ?? 0,
      gyroY: (data.gyro_y ?? data.gyro_y_rad_s) !== undefined
        ? Number(data.gyro_y ?? data.gyro_y_rad_s) : mpuPrev.gyroY ?? 0,
      gyroZ: (data.gyro_z ?? data.gyro_z_rad_s) !== undefined
        ? Number(data.gyro_z ?? data.gyro_z_rad_s) : mpuPrev.gyroZ ?? 0,
      temperature: data.temperature_c !== undefined ? Number(data.temperature_c) : mpuPrev.temperature ?? 0,
    },
  }
}

// ── Main page ──────────────────────────────────────────────
export default function PlayerPerformance() {
  const [players, setPlayers] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pickerOpen, setPickerOpen]     = useState(false)
  const [sensor, setSensor]             = useState(null)
  const [playerSessions, setPlayerSessions] = useState([])
  const [taggerPanelOpen, setTaggerPanelOpen] = useState(false)
  const [wearablePanelOpen, setWearablePanelOpen] = useState(false)
  const [sensorPanelOpen, setSensorPanelOpen] = useState(false)
  const [activeMatch, setActiveMatch] = useState(null)
  const [liveTags, setLiveTags] = useState([])
  const [lastUpdate, setLastUpdate]     = useState('--:--:--')
  const [sessionStats, setSessionStats] = useState({ maxSpeed: '0.0', dist: '0.00', temp: '0.0', sats: '0' })

  const [fieldPositions, setFieldPositions] = useState([])
  const [currentFieldPos, setCurrentFieldPos] = useState(null)
  const [activeAlerts, setActiveAlerts]       = useState([])
  const [tagHistory, setTagHistory]           = useState([])
  const [zoneStats, setZoneStats]             = useState({ ownHalf: 0, midfield: 0, oppHalf: 0 })

  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Bonjour! Je surveille le joueur en temps réel. Demandez-moi: vitesse, position, alertes, performance, fatigue, GPS ou recommandations.' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [accPoint, setAccPoint] = useState(null)
  const [accHistory, setAccHistory] = useState([])

  // ── MQTT broker connection — same broker/topic as hh.html, connects automatically ──
  const brokerUrl = DEFAULT_BROKER_URL
  const topicRoot = DEFAULT_TOPIC_ROOT
  const [mqttStatus, setMqttStatus]         = useState('disconnected') // disconnected | connecting | connected | error
  const [mqttStatusText, setMqttStatusText] = useState('Déconnecté')

  const maxSpeedRef   = useRef(0)
  const totalDistRef  = useRef(0)
  const lastSpeedRef  = useRef(0)
  const fieldPosRef   = useRef(null)
  const tagCounterRef = useRef(0)
  const chatBoxRef    = useRef(null)
  const chatWasAtBottomRef = useRef(true)
  const mqttClientRef = useRef(null)
  const sensorRef      = useRef(null)
  const playerRef      = useRef(null)
  const activeMatchIdRef = useRef(null)

  const player = players[currentIndex]
  playerRef.current = player
  activeMatchIdRef.current = activeMatch?.id ?? null

  // Only auto-scroll the chat when the user hasn't scrolled up to read earlier messages
  useEffect(() => {
    const box = chatBoxRef.current
    if (box && chatWasAtBottomRef.current) {
      box.scrollTop = box.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => { getAllPlayers('morocco').then(setPlayers) }, [])

  function reloadPlayerSessions() {
    if (!player) return
    getSessionsForPlayer(player.name).then(setPlayerSessions)
  }

  useEffect(() => { reloadPlayerSessions() }, [player?.name])

  // ── Live match polling — check for an active match every 5s ──
  useEffect(() => {
    function poll() {
      getActiveMatch().then(setActiveMatch).catch(() => setActiveMatch(null))
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [])

  // ── Live tags arrive instantly via MQTT (see connectMqtt's message handler
  // below) — this just resets the local list whenever the live match or the
  // viewed player changes, and (re)subscribes to that player's tagger topic. ──
  useEffect(() => {
    setLiveTags([])
    const client = mqttClientRef.current
    if (!client || !activeMatch || !player) return

    const topic = `${TAGGER_TOPIC_ROOT}/${activeMatch.id}/${slugifyPlayerName(player.name)}`
    client.subscribe(topic, { qos: 0 })
    return () => { try { client.unsubscribe(topic) } catch (_) {} }
  }, [activeMatch?.id, player?.name, mqttStatus])

  useEffect(() => {
    if (!players.length) return
    maxSpeedRef.current   = 0
    totalDistRef.current  = 0
    lastSpeedRef.current  = 0
    fieldPosRef.current   = null
    tagCounterRef.current = 0
    sensorRef.current     = null
    setSensor(null)
    setAccPoint(null)
    setAccHistory([])
    setSessionStats({ maxSpeed: '0.0', dist: '0.00', temp: '0.0', sats: '0' })
    setActiveAlerts([])
    setTagHistory([])
    setZoneStats({ ownHalf: 0, midfield: 0, oppHalf: 0 })
    setChatMessages([{ role: 'ai', text: `Joueur changé: ${players[currentIndex].name}. Demandez-moi vitesse, position, alertes ou performance.` }])
    // Seed heatmap with static initial positions so canvas is never blank
    const zone = getZoneForPosition(players[currentIndex].position)
    const initPos = generateInitialPositions(zone, 90)
    setFieldPositions(initPos)
    const lastPos = initPos[initPos.length - 1]
    setCurrentFieldPos(lastPos)
    fieldPosRef.current = lastPos
  }, [currentIndex, players])

  // ── Process one merged sensor reading — drives heatmap, zones, tags and alerts ──
  function processReading(data) {
    if (!players.length) return
    const { gps, mpu } = data
    if (gps.speed > maxSpeedRef.current) maxSpeedRef.current = gps.speed
    totalDistRef.current += ((lastSpeedRef.current + gps.speed) / 2) * (1.5 / 3600)
    lastSpeedRef.current = gps.speed
    setSensor(data)
    const accSample = { x: mpu.accX, y: mpu.accY, z: mpu.accZ, time: new Date().toLocaleTimeString() }
    setAccPoint(accSample)
    setAccHistory(prev => {
      const u = [...prev, accSample]
      return u.length > MAX_ACC_HISTORY ? u.slice(-MAX_ACC_HISTORY) : u
    })
    setLastUpdate(new Date().toLocaleTimeString())
    setSessionStats({
      maxSpeed: maxSpeedRef.current.toFixed(1),
      dist:     totalDistRef.current.toFixed(2),
      temp:     mpu.temperature.toFixed(1),
      sats:     String(gps.satellites),
    })

    const zone   = getZoneForPosition(players[currentIndex].position)
    const newPos = nextFieldPos(fieldPosRef.current, zone, gps.speed)
    fieldPosRef.current = newPos
    setCurrentFieldPos({ ...newPos })
    setFieldPositions(prev => {
      const u = [...prev, { ...newPos }]
      return u.length > 300 ? u.slice(-300) : u
    })

    setZoneStats(prev => ({
      ownHalf:  prev.ownHalf  + (newPos.x < 35 ? 1 : 0),
      midfield: prev.midfield + (newPos.x >= 35 && newPos.x <= 70 ? 1 : 0),
      oppHalf:  prev.oppHalf  + (newPos.x > 70 ? 1 : 0),
    }))

    tagCounterRef.current++
    if (tagCounterRef.current >= 3 + Math.floor(Math.random() * 3)) {
      tagCounterRef.current = 0
      const action = FIELD_ACTIONS[Math.floor(Math.random() * FIELD_ACTIONS.length)]
      setTagHistory(prev => {
        const u = [...prev, { action, pos: { ...newPos }, time: new Date().toLocaleTimeString() }]
        return u.length > 25 ? u.slice(-25) : u
      })
    }

    const alerts = []
    if (gps.speed > 26) alerts.push({ type: 'speed', msg: `Sprint critique: ${gps.speed.toFixed(1)} km/h`, level: 'red' })
    else if (gps.speed > 18) alerts.push({ type: 'speed', msg: `Accélération: ${gps.speed.toFixed(1)} km/h`, level: 'orange' })
    if (mpu.temperature > 30) alerts.push({ type: 'temp', msg: `Température: ${mpu.temperature.toFixed(1)}°C`, level: 'red' })
    else if (mpu.temperature > 28) alerts.push({ type: 'temp', msg: `Temp. élevée: ${mpu.temperature.toFixed(1)}°C`, level: 'orange' })
    const distFromZone = Math.sqrt((newPos.x - zone.cx) ** 2 + (newPos.y - zone.cy) ** 2)
    if (distFromZone > 42) alerts.push({ type: 'position', msg: 'Joueur très loin de sa zone!', level: 'red' })
    else if (distFromZone > 28) alerts.push({ type: 'position', msg: 'Joueur hors de position', level: 'orange' })
    const posStr = players[currentIndex].position
    if ((posStr.includes('Back') || posStr.includes('Goalkeeper')) && newPos.x > 75)
      alerts.push({ type: 'tactical', msg: 'Défenseur en zone offensive', level: 'orange' })
    if (posStr.includes('Attacker') && newPos.x < 30)
      alerts.push({ type: 'tactical', msg: 'Attaquant dans camp propre', level: 'yellow' })
    setActiveAlerts(alerts)
  }

  // ── MQTT connection lifecycle — same broker/topic convention as hh.html ──
  function connectMqtt() {
    const url = brokerUrl.trim()
    const root = topicRoot.trim().replace(/\/+$/, '')
    if (!url || !root) return

    if (mqttClientRef.current) {
      try { mqttClientRef.current.end(true) } catch (_) {}
    }

    setMqttStatus('connecting')
    setMqttStatusText('Connexion…')

    const clientId = `pp_dashboard_${Math.random().toString(16).slice(2, 10)}_${Date.now()}`
    const client = mqtt.connect(url, {
      clientId,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 3000,
      keepalive: 30,
      protocolVersion: 4,
    })
    mqttClientRef.current = client

    client.on('connect', () => {
      setMqttStatus('connected')
      setMqttStatusText('Connecté')
      client.subscribe(`${root}/#`, { qos: 0 }, (error) => {
        if (error) {
          setMqttStatus('error')
          setMqttStatusText(`Erreur d'abonnement: ${error.message}`)
        }
      })
    })

    client.on('message', (topic, payload) => {
      let data
      try {
        data = JSON.parse(payload.toString())
      } catch (_) {
        return
      }

      if (topic.startsWith(`${TAGGER_TOPIC_ROOT}/`)) {
        // Action taguée en direct par le Tagger — ne garder que celles du
        // match/joueur actuellement affichés (le topic est déjà scopé par
        // matchId+joueur, mais on revérifie car une resubscription est asynchrone).
        if (data.matchId !== activeMatchIdRef.current) return
        if (!playerRef.current || data.playerName !== playerRef.current.name) return
        setLiveTags(prev => [...prev, data])
        return
      }

      const merged = mergeSensorFromPayload(sensorRef.current, data)
      sensorRef.current = merged
      processReading(merged)
    })

    client.on('reconnect', () => {
      setMqttStatus('connecting')
      setMqttStatusText('Reconnexion…')
    })

    client.on('offline', () => {
      setMqttStatus('disconnected')
      setMqttStatusText('Hors ligne')
    })

    client.on('close', () => {
      setMqttStatus('disconnected')
      setMqttStatusText('Déconnecté')
    })

    client.on('error', (error) => {
      setMqttStatus('error')
      setMqttStatusText(`Erreur: ${error.message || 'connexion impossible'}`)
    })
  }

  // Auto-connect on mount, disconnect cleanly on unmount
  useEffect(() => {
    connectMqtt()
    return () => {
      if (mqttClientRef.current) {
        mqttClientRef.current.end(true)
        mqttClientRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDownloadReport() {
    const taggerSessionsForReport = playerSessions.filter(s => s.kind === 'tagging')
    const heatmapCanvas = document.querySelector('.pp-field-canvas')
    await generateMatchReportPdf({
      player,
      sessionStats,
      accHistory,
      taggerSessions: taggerSessionsForReport,
      heatmapCanvas,
      opponentName: 'France',
    })
  }

  function sendChat(e) {
    e?.preventDefault()
    const msg = chatInput.trim()
    if (!msg) return
    setChatMessages(prev => [...prev, { role: 'user', text: msg }])
    setChatInput('')
    setTimeout(() => {
      const reply = getAIResponse(msg, { sensor, currentFieldPos, zoneStats, activeAlerts, player, sessionStats, tagHistory })
      setChatMessages(prev => [...prev, { role: 'ai', text: reply }])
    }, 500)
  }

  const movement = sensor
    ? Math.sqrt(sensor.mpu.accX ** 2 + sensor.mpu.accY ** 2 + sensor.mpu.accZ ** 2)
    : 0

  function handlePrev() { setCurrentIndex((currentIndex - 1 + players.length) % players.length) }
  function handleNext() { setCurrentIndex((currentIndex + 1) % players.length) }

  if (!player) {
    return (
      <div className="pp-page">
        <Navbar title="Performance du Joueur" />
        <div className="pp-layout">
          <main className="pp-main">
            <p style={{ padding: 24 }}>Chargement des joueurs…</p>
          </main>
        </div>
      </div>
    )
  }

  const playerZone = getZoneForPosition(player.position)
  const alertZones = getAlertZones(player.position)
  const positionInsights = buildPositionInsights({ zoneStats, tagHistory, player, activeAlerts })

  const taggerSessions = playerSessions.filter(s => s.kind === 'tagging')
  const wearableSessions = playerSessions.filter(s => s.kind === 'wearable')

  return (
    <div className="pp-page">
      <Navbar
        title="Performance du Joueur"
        right={<button type="button" className="pp-save-session-btn" onClick={handleDownloadReport}>&#11015; Télécharger le rapport</button>}
      />

      {pickerOpen && (
        <div className="pp-picker-overlay" onClick={e => e.target === e.currentTarget && setPickerOpen(false)}>
          <div className="pp-picker-modal">
            <h2>Choisir un joueur</h2>
            <div className="pp-picker-grid">
              {players.map((p, i) => (
                <div
                  key={p.name}
                  className={`pp-picker-card${i === currentIndex ? ' active' : ''}`}
                  onClick={() => { setCurrentIndex(i); setPickerOpen(false) }}
                >
                  <img src={p.photo} alt={p.name} onError={e => { e.target.src = FALLBACK_PHOTO }} />
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-pos">{p.position}</div>
                  <div className="pc-num">{p.jersey}</div>
                </div>
              ))}
            </div>
            <button className="pp-picker-close" onClick={() => setPickerOpen(false)}>Fermer</button>
          </div>
        </div>
      )}

      <div className="pp-layout">
        <PlayerSidebar
          className="pp-sidebar"
          player={player}
          counter={`${currentIndex + 1} / ${players.length}`}
          onPrev={handlePrev}
          onNext={handleNext}
          onChoose={() => setPickerOpen(true)}
          sessionStats={sessionStats}
        />

        <main className="pp-main">
          <div className="pp-broker-panel">
            <div className={`pp-broker-status pp-broker-status-${mqttStatus}`}>
              <span className="pp-broker-dot" />
              <span>MQTT {mqttStatusText} — abonné automatiquement à {topicRoot}/#</span>
              {mqttStatus !== 'connected' && mqttStatus !== 'connecting' && (
                <button type="button" className="pp-broker-btn primary" onClick={connectMqtt}>Réessayer</button>
              )}
            </div>
          </div>

          <div className="pp-status-box">
            <div className="pp-status-item">État GPS : <span className={mqttStatus === 'connected' ? 'ok' : 'bad'}>{mqttStatus === 'connected' ? 'Connecté' : 'En attente'}</span></div>
            <div className="pp-status-item">État MPU6050 : <span className={mqttStatus === 'connected' ? 'ok' : 'bad'}>{mqttStatus === 'connected' ? 'Connecté' : 'En attente'}</span></div>
            <div className="pp-status-item">Broker : <span className={mqttStatus === 'connected' ? 'ok' : 'bad'}>{mqttStatusText}</span></div>
            <div className="pp-status-item">Dernière mise à jour : <span className="ok">{lastUpdate}</span></div>
          </div>

          {/* ── Terrain + Heatmap + Chat ── */}
          <section className="pp-field-section">
            <div className="pp-field-section-header">
              <h2 className="pp-section-title" style={{ marginBottom: 0 }}>
                Terrain &amp; Heatmap en Temps Réel
              </h2>
              <div className="pp-field-legend">
                <span className="pp-legend-label">Froid</span>
                <div className="pp-legend-bar" />
                <span className="pp-legend-label">Chaud</span>
              </div>
            </div>

            <div className="pp-field-layout">

              {/* LEFT — only the field canvas */}
              <div className="pp-field-canvas-wrap">
                <FieldHeatmap
                  positions={fieldPositions}
                  currentPos={currentFieldPos}
                  alertZones={alertZones}
                  tagEvents={tagHistory}
                  playerZone={playerZone}
                />
              </div>

              {/* RIGHT — alerts (top) + AI chat (bottom) */}
              <div className="pp-field-right">

                {/* Alerts */}
                <div className="pp-fr-panel pp-fr-alerts">
                  <div className="pp-fr-title">
                    <span>Alertes Actives</span>
                    {activeAlerts.length > 0 && (
                      <span className="pp-alert-badge pp-alert-badge-red">{activeAlerts.length}</span>
                    )}
                  </div>
                  <div className="pp-alerts-body">
                    {activeAlerts.length === 0 ? (
                      <div className="pp-no-alert">&#10003; Aucune alerte active</div>
                    ) : (
                      activeAlerts.map((a, i) => (
                        <div key={i} className={`pp-alert-item pp-alert-${a.level}`}>
                          <span className="pp-alert-icon">
                            {a.level === 'red' ? '🔴' : a.level === 'orange' ? '🟠' : '🟡'}
                          </span>
                          <span>{a.msg}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* AI Chat */}
                <div className="pp-fr-panel pp-fr-chat">
                  <div className="pp-fr-title">
                    <span>Assistant IA</span>
                    <span className="pp-chat-live-dot" />
                  </div>
                  <div
                    className="pp-chat-messages"
                    ref={chatBoxRef}
                    onScroll={(e) => {
                      const el = e.currentTarget
                      chatWasAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
                    }}
                  >
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`pp-chat-bubble pp-chat-${m.role}`}>
                        {m.role === 'ai' && <span className="pp-chat-avatar">IA</span>}
                        <span className="pp-chat-text">{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pp-chat-suggestions">
                    {['Position', 'Zone', 'Actions', 'Analyse', 'Recommandations'].map(q => (
                      <button
                        key={q}
                        type="button"
                        className="pp-chat-suggestion-chip"
                        onClick={() => {
                          setChatMessages(prev => [...prev, { role: 'user', text: q }])
                          setTimeout(() => {
                            const reply = getAIResponse(q, { sensor, currentFieldPos, zoneStats, activeAlerts, player, sessionStats, tagHistory })
                            setChatMessages(prev => [...prev, { role: 'ai', text: reply }])
                          }, 400)
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <form className="pp-chat-input-row" onSubmit={sendChat}>
                    <input
                      className="pp-chat-input"
                      type="text"
                      placeholder="Posez une question…"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                    />
                    <button className="pp-chat-send" type="submit">&#10148;</button>
                  </form>
                </div>

              </div>
            </div>
          </section>

          {/* ── Historique du joueur : actions taguées + sessions capteur (repliables) ── */}
          <TaggerSessionsPanel
            sessions={taggerSessions}
            liveTags={liveTags}
            isLive={!!activeMatch}
            open={taggerPanelOpen}
            onToggle={() => setTaggerPanelOpen(o => !o)}
          />
          <WearableSessionsPanel
            sessions={wearableSessions}
            open={wearablePanelOpen}
            onToggle={() => setWearablePanelOpen(o => !o)}
          />

          {/* ── Données Capteur (infos supplémentaires, repliable) ── */}
          <CollapsiblePanel
            title="Données Capteur en Temps Réel"
            open={sensorPanelOpen}
            onToggle={() => setSensorPanelOpen(o => !o)}
          >
            <section className="pp-cards">
              <div className="pp-card">
                <h3>Vitesse GPS</h3>
                <h2>{sensor ? sensor.gps.speed.toFixed(2) : '0.00'}</h2>
                <p>km/h</p>
              </div>
              <div className="pp-card">
                <h3>Altitude</h3>
                <h2>{sensor ? sensor.gps.altitude.toFixed(2) : '0.00'}</h2>
                <p>mètres</p>
              </div>
              <div className="pp-card">
                <h3>Satellites</h3>
                <h2>{sensor ? sensor.gps.satellites : '0'}</h2>
                <p>qualité du signal GPS</p>
              </div>
              <div className="pp-card">
                <h3>Intensité du mouvement</h3>
                <h2>{movement.toFixed(2)}</h2>
                <p>magnitude d'accélération</p>
              </div>
            </section>

            <section className="pp-wide-section">
              <div className="pp-panel">
                <h3>Données GPS</h3>
                <div className="pp-data-line"><span>Latitude</span><strong>{sensor ? sensor.gps.lat.toFixed(6) : '0.000000'}</strong></div>
                <div className="pp-data-line"><span>Longitude</span><strong>{sensor ? sensor.gps.lng.toFixed(6) : '0.000000'}</strong></div>
                <div className="pp-data-line"><span>Vitesse</span><strong>{sensor ? sensor.gps.speed.toFixed(2) : '0.00'} km/h</strong></div>
                <div className="pp-data-line"><span>Altitude</span><strong>{sensor ? sensor.gps.altitude.toFixed(2) : '0.00'} m</strong></div>
                <div className="pp-data-line"><span>Satellites</span><strong>{sensor ? sensor.gps.satellites : '0'}</strong></div>
              </div>
              <div className="pp-panel">
                <h3>Données MPU6050</h3>
                <div className="pp-data-line"><span>Accélération X</span><strong>{sensor ? sensor.mpu.accX.toFixed(2) : '0.00'} m/s&#178;</strong></div>
                <div className="pp-data-line"><span>Accélération Y</span><strong>{sensor ? sensor.mpu.accY.toFixed(2) : '0.00'} m/s&#178;</strong></div>
                <div className="pp-data-line"><span>Accélération Z</span><strong>{sensor ? sensor.mpu.accZ.toFixed(2) : '0.00'} m/s&#178;</strong></div>
                <div className="pp-data-line"><span>Gyroscope X</span><strong>{sensor ? sensor.mpu.gyroX.toFixed(2) : '0.00'} rad/s</strong></div>
                <div className="pp-data-line"><span>Gyroscope Y</span><strong>{sensor ? sensor.mpu.gyroY.toFixed(2) : '0.00'} rad/s</strong></div>
                <div className="pp-data-line"><span>Gyroscope Z</span><strong>{sensor ? sensor.mpu.gyroZ.toFixed(2) : '0.00'} rad/s</strong></div>
                <div className="pp-data-line"><span>Température</span><strong>{sensor ? sensor.mpu.temperature.toFixed(2) : '0.00'} &#176;C</strong></div>
              </div>
            </section>

            <section className="pp-panel pp-chart-panel">
              <div className="pp-chart-panel-head">
                <h3>Accélération</h3>
                <span className="pp-chart-unit">m/s²</span>
              </div>
              <div className="pp-chart-wrap">
                <AccelerationChart point={accPoint} />
              </div>
            </section>
          </CollapsiblePanel>

          <footer className="pp-footer">Système de Suivi des Joueurs de Football</footer>
        </main>
      </div>
    </div>
  )
}
