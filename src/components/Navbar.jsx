import './Navbar.css'

export default function Navbar({ title, right }) {
  return (
    <nav className="navbar">
      <div className="nav-title">{title}</div>
      {right && <div className="nav-right">{right}</div>}
    </nav>
  )
}
