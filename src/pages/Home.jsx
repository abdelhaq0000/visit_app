import './Home.css'

export default function Home() {
  return (
    <div className="home-page">
      <nav className="home-navbar">
        <div className="home-nav-title">Accueil</div>
        <img className="home-nav-logo" src="/logo-uib.png" alt="UiB" />
      </nav>

      <main className="home-hero">
        <section className="home-hero-inner">
          <img
            className="home-hero-image"
            src="https://www.atalayar.com/media/atalayar/images/2023/12/26/2023122611072180693.jpg"
            alt="Présentation de la Coupe du Monde 2030"
          />
          <div className="home-hero-copy">
            <p>
              La Coupe du Monde de la FIFA 2030 s'annonce comme un événement historique, marquant le
              centenaire de la première Coupe du Monde disputée en 1930. Ce tournoi réunira les
              meilleures équipes nationales du monde entier pour se disputer ce titre prestigieux.
            </p>
            <p>
              Les supporters attendent avec impatience l'excitation, l'intensité et les moments
              inoubliables que la Coupe du Monde offre toujours. Avec une technologie de pointe et
              des stades ultramodernes, la Coupe du Monde 2030 promet d'être une célébration
              spectaculaire du football.
            </p>
            <p>
              Au-delà des matchs palpitants, le tournoi proposera des événements culturels, des fan
              zones et des expériences interactives pour les visiteurs. L'occasion pour les
              supporters de s'immerger dans la culture du football et d'échanger avec des passionnés
              du monde entier.
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
