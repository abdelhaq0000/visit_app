import './Navbar.css'

export default function Navbar({ title, right }) {
  return (
    <nav className="navbar">
      <div className="nav-title">{title}</div>
      <div className="nav-right">
        {right}
        <img className="nav-logo" src="/logo-uib.png" alt="UiB" />
      </div>
    </nav>
  )
}
