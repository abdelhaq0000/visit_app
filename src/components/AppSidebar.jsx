import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './AppSidebar.css'

const LOGO =
  'https://upload.wikimedia.org/wikipedia/fr/thumb/6/69/Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg/1920px-Logo_F%C3%A9d%C3%A9ration_Royale_Marocaine_Football.svg.png'

// ── Icons ────────────────────────────────────────────────
const icons = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  player: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  team: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  whistle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11a6 6 0 0 0 6 6h2l4 3v-3a6 6 0 0 0 0-12H8" />
      <circle cx="8" cy="11" r="2.4" />
      <path d="M14 3l2 2" />
    </svg>
  ),
  tag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  addPlayer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.24.61.86 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  history: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" />
      <path d="M3.05 13a9 9 0 1 0 .5-4.5L3 8" />
      <path d="M12 7v5l4 2" />
    </svg>
  ),
  brain: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4" />
      <path d="M9 22V11a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v11" />
      <path d="M15 11h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4" />
      <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3" />
    </svg>
  ),
  robot: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <path d="M12 7V3" />
    </svg>
  ),
}

// ── Grouped navigation: Coach · Tagger · Settings ────────
const GROUPS = [
  {
    key: 'coach',
    label: 'Coach',
    icon: icons.whistle,
    children: [
      { to: '/', label: 'Home', icon: icons.home, end: true },
      { to: '/players', label: 'Player Performance', icon: icons.player },
      { to: '/team', label: 'Team Performance', icon: icons.team },
    ],
  },
  {
    key: 'tagger',
    label: 'Tagger',
    icon: icons.tag,
    children: [
      { to: '/tagger', label: 'Action Tagger', icon: icons.tag },
      { to: '/add-player', label: 'Add Player', icon: icons.addPlayer },
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: icons.gear,
    children: [
      { to: '/match-setup', label: 'Match Setup', icon: icons.calendar },
      { to: '/history', label: 'Match History', icon: icons.history },
      { to: '/expert-system', label: 'Expert System', icon: icons.brain },
      { to: '/ai-config', label: 'AI Configuration', icon: icons.robot },
    ],
  },
]

function groupForPath(pathname) {
  for (const g of GROUPS) {
    if (g.children.some(c => (c.end ? pathname === c.to : pathname.startsWith(c.to) && c.to !== '/'))) return g.key
    if (pathname === '/' && g.key === 'coach') return g.key
  }
  return null
}

export default function AppSidebar() {
  const location = useLocation()
  const activeGroup = groupForPath(location.pathname)
  const [openGroup, setOpenGroup] = useState(null)
  const closeTimer = useRef(null)

  // Collapse the flyout whenever the route changes
  useEffect(() => { setOpenGroup(null) }, [location.pathname])
  useEffect(() => () => clearTimeout(closeTimer.current), [])

  function openNow(key) {
    clearTimeout(closeTimer.current)
    setOpenGroup(key)
  }
  function scheduleClose() {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenGroup(null), 220)
  }

  return (
    <aside className="app-sidebar" onMouseLeave={scheduleClose}>
      <img className="app-sb-logo" src={LOGO} alt="FRMF" />
      <div className="app-sb-divider" />

      {GROUPS.map((g) => {
        const isOpen = openGroup === g.key
        const isActive = activeGroup === g.key
        return (
          <div
            key={g.key}
            className="app-nav-group"
            onMouseEnter={() => openNow(g.key)}
          >
            <button
              type="button"
              className={'app-nav-link' + (isActive ? ' active' : '') + (isOpen ? ' open' : '')}
              onClick={() => setOpenGroup(isOpen ? null : g.key)}
              title={g.label}
              aria-expanded={isOpen}
            >
              {g.icon}
              <span className="app-nav-lbl">{g.label}</span>
            </button>

            {isOpen && (
              <div className="app-nav-flyout" onMouseEnter={() => openNow(g.key)}>
                <div className="app-flyout-title">{g.label}</div>
                {g.children.map((c) => (
                  <NavLink
                    key={c.to}
                    to={c.to}
                    end={c.end}
                    className={({ isActive: linkActive }) =>
                      'app-flyout-link' + (linkActive ? ' active' : '')}
                  >
                    <span className="app-flyout-ic">{c.icon}</span>
                    <span>{c.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </aside>
  )
}
