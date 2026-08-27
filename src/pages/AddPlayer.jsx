import { useState } from 'react'
import Navbar from '../components/Navbar'
import { addCustomPlayer, removeCustomPlayer, loadCustomPlayers, FALLBACK_PHOTO } from '../data/players'
import './AddPlayer.css'

const EMPTY_FORM = {
  team: 'morocco',
  name: '',
  position: '',
  jersey: '',
  club: '',
  nationality: '',
  age: '',
  height: '',
  weight: '',
  photo: '',
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AddPlayer() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [customPlayers, setCustomPlayers] = useState(loadCustomPlayers)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setField('photo', dataUrl)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.position.trim()) {
      setError('Le nom et le poste du joueur sont obligatoires.')
      return
    }
    setError('')

    const player = {
      name: form.name.trim(),
      position: form.position.trim(),
      jersey: form.jersey.trim() ? (form.jersey.trim().startsWith('#') ? form.jersey.trim() : `#${form.jersey.trim()}`) : '#-',
      club: form.club.trim(),
      nationality: form.nationality.trim(),
      age: form.age.trim(),
      height: form.height.trim(),
      weight: form.weight.trim(),
      photo: form.photo || FALLBACK_PHOTO,
      team: form.team,
    }

    const updated = addCustomPlayer(player)
    setCustomPlayers(updated)
    setForm(prev => ({ ...EMPTY_FORM, team: prev.team }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function handleDelete(name, team) {
    const updated = removeCustomPlayer(name, team)
    setCustomPlayers(updated)
  }

  const moroccoPlayers = customPlayers.filter(p => p.team === 'morocco')
  const opponentPlayersList = customPlayers.filter(p => p.team === 'opponent')

  return (
    <div className="ap-page">
      <Navbar title="Ajouter un Joueur" />

      <div className="ap-layout">
        <main className="ap-content">

          <section className="ap-section">
            <div className="ap-section-header">
              <h2>Nouveau Joueur</h2>
            </div>

            <form className="ap-form" onSubmit={handleSubmit}>
              <div className="ap-team-toggle">
                <button
                  type="button"
                  className={`ap-team-btn${form.team === 'morocco' ? ' active' : ''}`}
                  onClick={() => setField('team', 'morocco')}
                >
                  Équipe du Maroc
                </button>
                <button
                  type="button"
                  className={`ap-team-btn${form.team === 'opponent' ? ' active' : ''}`}
                  onClick={() => setField('team', 'opponent')}
                >
                  Équipe Adverse
                </button>
              </div>

              <div className="ap-form-grid">
                <div className="ap-photo-field">
                  <label className="ap-photo-upload">
                    <img src={form.photo || FALLBACK_PHOTO} alt="Aperçu" className="ap-photo-preview" />
                    <span className="ap-photo-btn">Choisir une photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                  </label>
                </div>

                <div className="ap-fields">
                  <div className="ap-field">
                    <label>Nom complet *</label>
                    <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="ex. Achraf Hakimi" />
                  </div>
                  <div className="ap-field">
                    <label>Poste *</label>
                    <input value={form.position} onChange={e => setField('position', e.target.value)} placeholder="ex. Arrière droit" />
                  </div>
                  <div className="ap-field-row">
                    <div className="ap-subfield">
                      <label>Numéro</label>
                      <input value={form.jersey} onChange={e => setField('jersey', e.target.value)} placeholder="ex. 2" />
                    </div>
                    <div className="ap-subfield">
                      <label>Club</label>
                      <input value={form.club} onChange={e => setField('club', e.target.value)} placeholder="ex. PSG" />
                    </div>
                  </div>
                  <div className="ap-field-row">
                    <div className="ap-subfield">
                      <label>Nationalité</label>
                      <input value={form.nationality} onChange={e => setField('nationality', e.target.value)} placeholder="ex. Maroc" />
                    </div>
                    <div className="ap-subfield">
                      <label>Âge</label>
                      <input value={form.age} onChange={e => setField('age', e.target.value)} placeholder="ex. 25 ans" />
                    </div>
                  </div>
                  <div className="ap-field-row">
                    <div className="ap-subfield">
                      <label>Taille</label>
                      <input value={form.height} onChange={e => setField('height', e.target.value)} placeholder="ex. 181 cm" />
                    </div>
                    <div className="ap-subfield">
                      <label>Poids</label>
                      <input value={form.weight} onChange={e => setField('weight', e.target.value)} placeholder="ex. 73 kg" />
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="ap-error">{error}</div>}
              {saved && <div className="ap-saved">✓ Joueur ajouté avec succès</div>}

              <button type="submit" className="ap-submit-btn">Ajouter le joueur</button>
            </form>
          </section>

          <section className="ap-section">
            <div className="ap-section-header">
              <h2>Équipe du Maroc — Joueurs ajoutés</h2>
            </div>
            {moroccoPlayers.length === 0 ? (
              <div className="ap-empty">Aucun joueur personnalisé ajouté pour cette équipe.</div>
            ) : (
              <div className="ap-player-grid">
                {moroccoPlayers.map(p => (
                  <div key={p.name} className="ap-player-card">
                    <button className="ap-player-del" onClick={() => handleDelete(p.name, p.team)} title="Supprimer">×</button>
                    <img src={p.photo} alt={p.name} onError={e => { e.target.src = FALLBACK_PHOTO }} />
                    <div className="ap-pc-name">{p.name}</div>
                    <div className="ap-pc-pos">{p.position}</div>
                    <div className="ap-pc-num">{p.jersey}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ap-section">
            <div className="ap-section-header">
              <h2>Équipe Adverse — Joueurs ajoutés</h2>
            </div>
            {opponentPlayersList.length === 0 ? (
              <div className="ap-empty">Aucun joueur personnalisé ajouté pour cette équipe.</div>
            ) : (
              <div className="ap-player-grid">
                {opponentPlayersList.map(p => (
                  <div key={p.name} className="ap-player-card">
                    <button className="ap-player-del" onClick={() => handleDelete(p.name, p.team)} title="Supprimer">×</button>
                    <img src={p.photo} alt={p.name} onError={e => { e.target.src = FALLBACK_PHOTO }} />
                    <div className="ap-pc-name">{p.name}</div>
                    <div className="ap-pc-pos">{p.position}</div>
                    <div className="ap-pc-num">{p.jersey}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>
      </div>
    </div>
  )
}
