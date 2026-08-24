import './PlayerSidebar.css'

export default function PlayerSidebar({
  player,
  className = '',
  counter,
  onPrev,
  onNext,
  onChoose,
  sessionStats,
}) {
  if (!player) return null

  return (
    <aside className={`player-sidebar ${className}`}>
      {onPrev && (
        <div className="ps-player-nav">
          <button className="ps-nav-btn" onClick={onPrev}>&#8249;</button>
          <span className="ps-counter">{counter}</span>
          <button className="ps-nav-btn" onClick={onNext}>&#8250;</button>
        </div>
      )}

      <img className="ps-photo" src={player.photo} alt={player.name} />
      <div className="ps-badge">Active Player</div>
      <div className="ps-name">{player.name}</div>
      <div className="ps-position">{player.position}</div>

      {onChoose && (
        <button className="ps-pick-btn" onClick={onChoose}>&#9776; Choose Player</button>
      )}

      <div className="ps-divider" />

      <div className="ps-section-title">Player Info</div>
      <div className="ps-info-list">
        <div className="ps-info-item"><span>Jersey</span><span>{player.jersey}</span></div>
        <div className="ps-info-item"><span>Club</span><span>{player.club}</span></div>
        <div className="ps-info-item"><span>Nationality</span><span>{player.nationality}</span></div>
        <div className="ps-info-item"><span>Age</span><span>{player.age}</span></div>
        <div className="ps-info-item"><span>Height</span><span>{player.height}</span></div>
        <div className="ps-info-item"><span>Weight</span><span>{player.weight}</span></div>
      </div>

      {sessionStats && (
        <>
          <div className="ps-divider" />
          <div className="ps-section-title">Session Stats</div>
          <div className="ps-stats">
            <div className="ps-stat-box">
              <div className="ps-stat-val">{sessionStats.maxSpeed}</div>
              <div className="ps-stat-lbl">Max km/h</div>
            </div>
            <div className="ps-stat-box">
              <div className="ps-stat-val">{sessionStats.dist}</div>
              <div className="ps-stat-lbl">km Total</div>
            </div>
            <div className="ps-stat-box">
              <div className="ps-stat-val">{sessionStats.temp}</div>
              <div className="ps-stat-lbl">&#176;C Temp</div>
            </div>
            <div className="ps-stat-box">
              <div className="ps-stat-val">{sessionStats.sats}</div>
              <div className="ps-stat-lbl">Satellites</div>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}
