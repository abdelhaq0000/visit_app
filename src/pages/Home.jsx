import './Home.css'

export default function Home() {
  return (
    <div className="home-page">
      <nav className="home-navbar">
        <div className="home-nav-title">Home</div>
      
      </nav>

      <main className="home-hero">
        <section className="home-hero-inner">
          <img
            className="home-hero-image"
            src="https://www.atalayar.com/media/atalayar/images/2023/12/26/2023122611072180693.jpg"
            alt="2030 World Cup presentation"
          />
          <div className="home-hero-copy">
            <p>
              The 2030 FIFA World Cup is set to be a historic event, marking the centenary of the
              first World Cup held in 1930. This tournament will bring together the best national
              teams from around the globe to compete for the prestigious title.
            </p>
            <p>
              Fans are eagerly anticipating the excitement, drama, and unforgettable moments that
              the World Cup always delivers. With advanced technology and state-of-the-art stadiums,
              the 2030 World Cup promises to be a spectacular celebration of football.
            </p>
            <p>
              In addition to thrilling matches, the tournament will feature cultural events, fan
              zones, and interactive experiences for attendees. This will provide an opportunity for
              fans to immerse themselves in football culture and connect with supporters from around
              the world.
            </p>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-footer-mark">SUPTECH SANTE</div>
        <div className="home-footer-mark">SUPTECH</div>
        <div className="home-footer-mark">INNOVATION</div>
      </footer>
    </div>
  )
}
