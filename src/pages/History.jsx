import { useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import Navbar from '../components/Navbar'
import { players, opponentPlayers, FALLBACK_PHOTO } from '../data/players'
import { getAllSessions, deleteSession } from '../data/history'
import './History.css'

const TEAMS = [
  { key: 'us', label: 'Morocco', roster: players },
  { key: 'opponent', label: 'France', roster: opponentPlayers },
]

const CAT_CLS = { ball: 'tag-ball', def: 'tag-def', event: 'tag-event' }

// ── Field constants (FIFA dimensions, meters) — same as PlayerPerformance ──
const FW = 105
const FH = 68

function formatDate(iso) {
  return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Static heatmap snapshot — replays saved positions, no live cursor ──
function HistoryHeatmap({ positions }) {
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
    const grd = ctx.createLinearGradient(0, 0, cw, 0)
    grd.addColorStop(0, '#195c19')
    grd.addColorStop(0.5, '#1e7a1e')
    grd.addColorStop(1, '#195c19')
    ctx.fillStyle = grd
    ctx.fillRect(0, 0, cw, ch)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(1, 1, cw - 2, ch - 2)
    ctx.beginPath(); ctx.moveTo(cw / 2, 0); ctx.lineTo(cw / 2, ch); ctx.stroke()
    ctx.beginPath(); ctx.arc(cw / 2, ch / 2, 9.15 * sx, 0, Math.PI * 2); ctx.stroke()

    const total = positions.length
    positions.forEach((pos, idx) => {
      const px = pos.x * sx
      const py = pos.y * sy
      const ratio = idx / Math.max(total - 1, 1)
      const radius = 12 + ratio * 9
      const alpha = 0.03 + ratio * 0.05
      let r, g, b
      if (ratio > 0.80) { r = 255; g = 30; b = 0 }
      else if (ratio > 0.60) { r = 255; g = 130; b = 0 }
      else if (ratio > 0.40) { r = 255; g = 220; b = 0 }
      else if (ratio > 0.20) { r = 0; g = 210; b = 90 }
      else { r = 0; g = 110; b = 255 }
      const rgrd = ctx.createRadialGradient(px, py, 0, px, py, radius)
      rgrd.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 1.8).toFixed(3)})`)
      rgrd.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = rgrd
      ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill()
    })
  }, [positions])

  return <canvas ref={canvasRef} width={420} height={272} className="hist-heat-canvas" />
}

// ── Static acceleration chart — plots the full saved X/Y/Z history at once ──
function HistoryAccChart({ accHistory }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: accHistory.map((p) => p.time),
        datasets: [
          { label: 'X', data: accHistory.map((p) => p.x), borderColor: '#ef5350', backgroundColor: '#ef5350', tension: 0.22, pointRadius: 0, borderWidth: 2 },
          { label: 'Y', data: accHistory.map((p) => p.y), borderColor: '#29b6f6', backgroundColor: '#29b6f6', tension: 0.22, pointRadius: 0, borderWidth: 2 },
          { label: 'Z', data: accHistory.map((p) => p.z), borderColor: '#66bb6a', backgroundColor: '#66bb6a', tension: 0.22, pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#3d0000' } } },
        scales: {
          x: { ticks: { color: '#888', maxTicksLimit: 6 }, grid: { color: 'rgba(61,0,0,0.06)' } },
          y: { title: { display: true, text: 'm/s²', color: '#888' }, ticks: { color: '#888' }, grid: { color: 'rgba(61,0,0,0.06)' } },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [accHistory])

  return <canvas ref={canvasRef} />
}

export default function History() {
  const [sessions, setSessions] = useState(getAllSessions())
  const [activeTeamKey, setActiveTeamKey] = useState('us')
  const [selectedPlayerName, setSelectedPlayerName] = useState(null)
  const [openSessionId, setOpenSessionId] = useState(null)

  const activeTeam = TEAMS.find((t) => t.key === activeTeamKey)

  const sessionCountByPlayer = useMemo(() => {
    const map = {}
    sessions.forEach((s) => { map[s.player.name] = (map[s.player.name] || 0) + 1 })
    return map
  }, [sessions])

  const selectedSessions = useMemo(() => {
    if (!selectedPlayerName) return []
    return sessions.filter((s) => s.player.name === selectedPlayerName)
  }, [sessions, selectedPlayerName])

  const selectedPlayer = selectedSessions[0]?.player
    ?? activeTeam.roster.find((p) => p.name === selectedPlayerName)

  function handleDeleteSession(id) {
    if (!confirm('Delete this session from history?')) return
    deleteSession(id)
    setSessions(getAllSessions())
    setOpenSessionId(null)
  }

  return (
    <div className="hist-page">
      <Navbar title="Player History &amp; Reports" />

      <div className="hist-content">
        {!selectedPlayerName ? (
          <div className="hist-wrap">
            <div className="hist-team-tabs">
              {TEAMS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`hist-team-tab ${t.key}${t.key === activeTeamKey ? ' active' : ''}`}
                  onClick={() => setActiveTeamKey(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="hist-grid-label">{activeTeam.label} — Select a player to view history</div>

            <div className="hist-picker-grid">
              {activeTeam.roster.map((p) => {
                const count = sessionCountByPlayer[p.name] || 0
                return (
                  <div key={p.name} className="hist-picker-card" onClick={() => setSelectedPlayerName(p.name)}>
                    <img src={p.photo} alt={p.name} onError={(e) => { e.target.src = FALLBACK_PHOTO }} />
                    <div className="pc-name">{p.name}</div>
                    <div className="pc-pos">{p.position}</div>
                    <div className={`hist-session-badge${count === 0 ? ' empty' : ''}`}>
                      {count} session{count === 1 ? '' : 's'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="hist-wrap">
            <button type="button" className="hist-back-btn" onClick={() => { setSelectedPlayerName(null); setOpenSessionId(null) }}>
              &#8592; All players
            </button>

            <div className="hist-player-head">
              <img
                className="hist-player-photo"
                src={selectedPlayer?.photo}
                alt={selectedPlayerName}
                onError={(e) => { e.target.src = FALLBACK_PHOTO }}
              />
              <div>
                <div className="hist-player-name">{selectedPlayerName}</div>
                <div className="hist-player-meta">
                  {selectedPlayer?.position} · {selectedPlayer?.club} · {selectedSessions.length} session{selectedSessions.length === 1 ? '' : 's'} recorded
                </div>
              </div>
            </div>

            {selectedSessions.length === 0 ? (
              <div className="hist-empty">
                No sessions yet for {selectedPlayerName}. Tag actions in Tagger or capture wearable data in Player Performance, then save.
              </div>
            ) : (
              <div className="hist-session-list">
                {selectedSessions.map((s) => {
                  const open = openSessionId === s.id
                  const isWearable = s.kind === 'wearable'
                  return (
                    <div key={s.id} className={`hist-session-card${open ? ' open' : ''}`}>
                      <div className="hist-session-row" onClick={() => setOpenSessionId(open ? null : s.id)}>
                        <div className="hist-session-date">{formatDate(s.date)}</div>

                        {isWearable ? (
                          <div className="hist-session-stats">
                            <span className="hist-stat">{s.sessionStats?.maxSpeed} km/h max</span>
                            <span className="hist-stat">{s.sessionStats?.dist} km</span>
                            <span className="hist-stat">{s.sessionStats?.temp}°C</span>
                            <span className="hist-stat">{s.alertsLog?.length || 0} alerts</span>
                          </div>
                        ) : (
                          <div className="hist-session-stats">
                            <span className="hist-stat">{s.summary.goals} goals</span>
                            <span className="hist-stat">{s.summary.assists} assists</span>
                            <span className="hist-stat">{s.summary.yellowCards} cards</span>
                            <span className="hist-stat">{s.summary.totalEvents} events</span>
                          </div>
                        )}

                        <span className={`hist-kind-chip ${isWearable ? 'wearable' : 'tagging'}`}>
                          {isWearable ? 'Wearable' : 'Tagging'}
                        </span>
                        {!isWearable && (
                          <span className={`hist-team-chip ${s.teamKey}`}>{s.teamKey === 'opponent' ? 'France' : 'Morocco'}</span>
                        )}
                        <span className="hist-chevron">{open ? '▲' : '▼'}</span>
                      </div>

                      {open && isWearable && (
                        <div className="hist-session-detail">
                          <div className="hist-report-grid">
                            <div className="hist-report-item"><span>Max speed</span><strong>{s.sessionStats?.maxSpeed} km/h</strong></div>
                            <div className="hist-report-item"><span>Distance</span><strong>{s.sessionStats?.dist} km</strong></div>
                            <div className="hist-report-item"><span>Temperature</span><strong>{s.sessionStats?.temp} °C</strong></div>
                            <div className="hist-report-item"><span>Satellites</span><strong>{s.sessionStats?.sats}</strong></div>
                            <div className="hist-report-item"><span>Own half</span><strong>{s.zoneStats?.ownHalf}</strong></div>
                            <div className="hist-report-item"><span>Midfield</span><strong>{s.zoneStats?.midfield}</strong></div>
                            <div className="hist-report-item"><span>Opp half</span><strong>{s.zoneStats?.oppHalf}</strong></div>
                            <div className="hist-report-item"><span>Tagged actions</span><strong>{s.tagHistory?.length || 0}</strong></div>
                          </div>

                          <div className="hist-wearable-grid">
                            <div className="hist-wearable-block">
                              <div className="hist-block-title">Heatmap</div>
                              <div className="hist-heat-wrap">
                                <HistoryHeatmap positions={s.fieldPositions || []} />
                              </div>
                            </div>
                            <div className="hist-wearable-block">
                              <div className="hist-block-title">Acceleration (m/s²)</div>
                              <div className="hist-chart-wrap">
                                {s.accHistory?.length ? (
                                  <HistoryAccChart accHistory={s.accHistory} />
                                ) : (
                                  <div className="hist-empty-mini">No acceleration data captured.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="hist-block-title">Alerts during session</div>
                          {s.alertsLog?.length ? (
                            <div className="hist-alerts-list">
                              {s.alertsLog.map((a, i) => (
                                <div key={i} className={`hist-alert-item hist-alert-${a.level}`}>
                                  <span>{a.time}</span> — {a.msg}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="hist-empty-mini">No alerts recorded.</div>
                          )}

                          <button type="button" className="hist-delete-btn" onClick={() => handleDeleteSession(s.id)}>
                            Delete this session
                          </button>
                        </div>
                      )}

                      {open && !isWearable && (
                        <div className="hist-session-detail">
                          <div className="hist-report-grid">
                            {Object.entries(s.summary.counts).map(([action, n]) => (
                              <div key={action} className="hist-report-item">
                                <span>{action}</span>
                                <strong>{n}</strong>
                              </div>
                            ))}
                          </div>

                          <table className="hist-event-table">
                            <thead>
                              <tr><th>Time</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                              {s.events.map((e) => (
                                <tr key={e.id}>
                                  <td>{e.time}</td>
                                  <td><span className={`tagger-tag-action ${CAT_CLS[e.category] || ''}`}>{e.action}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <button type="button" className="hist-delete-btn" onClick={() => handleDeleteSession(s.id)}>
                            Delete this session
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
