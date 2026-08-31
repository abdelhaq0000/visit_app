import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import {
  MODEL_TYPES, getAllConfigs, addConfig, deleteConfig, toggleConfig, formatFileSize,
} from '../data/aiConfig'
import './AIConfig.css'

const EMPTY_CLASS = { name: '', description: '' }
const EMPTY_FORM = {
  name: '',
  modelType: 'classification',
  modelFile: null,
  outputDescription: '',
  classes: [{ ...EMPTY_CLASS }, { ...EMPTY_CLASS }],
}

export default function AIConfig() {
  const [configs, setConfigs] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => { getAllConfigs().then(setConfigs) }, [])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setForm(prev => ({ ...prev, modelFile: { name: file.name, size: file.size, type: file.type || 'inconnu' } }))
  }

  function updateClass(idx, field, value) {
    setForm(prev => ({
      ...prev,
      classes: prev.classes.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }))
  }

  function addClass() {
    setForm(prev => ({ ...prev, classes: [...prev.classes, { ...EMPTY_CLASS }] }))
  }

  function removeClass(idx) {
    setForm(prev => ({ ...prev, classes: prev.classes.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Veuillez nommer ce modèle IA.')
      return
    }
    if (!form.modelFile) {
      setError('Veuillez uploader le fichier du modèle.')
      return
    }
    if (form.modelType === 'regression' && !form.outputDescription.trim()) {
      setError('Veuillez décrire la sortie du modèle de régression.')
      return
    }
    if (form.modelType === 'classification') {
      if (form.classes.length < 2) {
        setError('Une classification nécessite au moins 2 classes.')
        return
      }
      if (form.classes.some(c => !c.name.trim() || !c.description.trim())) {
        setError('Veuillez nommer et décrire chaque classe.')
        return
      }
    }
    setError('')
    setConfigs(await addConfig({ ...form, active: true }))
    setForm(EMPTY_FORM)
  }

  async function handleDelete(id) {
    setConfigs(await deleteConfig(id))
  }

  async function handleToggle(id) {
    setConfigs(await toggleConfig(id))
  }

  return (
    <div className="ai-page">
      <Navbar title="Moteur IA" />

      <div className="ai-layout">
        <main className="ai-content">

          <section className="ai-section">
            <div className="ai-section-header">
              <h2>Nouveau Modèle IA</h2>
            </div>
            <p className="ai-section-desc">
              Uploadez le fichier du modèle entraîné, précisez son type — classification ou régression —
              puis décrivez la sortie qu'il produit.
            </p>

            <form className="ai-form" onSubmit={handleSubmit}>
              <div className="ai-field">
                <label>Nom du modèle</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="ex. Prédicteur de risque de blessure"
                />
              </div>

              <div className="ai-field">
                <label>Fichier du modèle</label>
                <label className="ai-file-upload">
                  <span className="ai-file-btn">Choisir un fichier</span>
                  <input type="file" onChange={handleFileChange} hidden />
                  {form.modelFile ? (
                    <span className="ai-file-info">
                      {form.modelFile.name} <em>({formatFileSize(form.modelFile.size)})</em>
                    </span>
                  ) : (
                    <span className="ai-file-placeholder">Aucun fichier sélectionné</span>
                  )}
                </label>
              </div>

              <div className="ai-field">
                <label>Type de modèle</label>
                <div className="ai-type-toggle">
                  {MODEL_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      className={`ai-type-btn${form.modelType === t.value ? ' active' : ''}`}
                      onClick={() => setForm(p => ({ ...p, modelType: t.value }))}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.modelType === 'regression' ? (
                <div className="ai-field">
                  <label>Description de la sortie</label>
                  <textarea
                    className="ai-textarea"
                    rows={3}
                    placeholder="ex. Score de risque de blessure entre 0 et 100, calculé à partir de la charge physique cumulée."
                    value={form.outputDescription}
                    onChange={e => setForm(p => ({ ...p, outputDescription: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="ai-field">
                  <div className="ai-classes-header">
                    <label>Classes de sortie</label>
                    <span className="ai-classes-count">{form.classes.length} classe{form.classes.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="ai-classes-list">
                    {form.classes.map((c, idx) => (
                      <div key={idx} className="ai-class-row">
                        <span className="ai-class-num">{idx + 1}</span>
                        <input
                          className="ai-class-name"
                          placeholder="Nom de la classe (ex. Risque faible)"
                          value={c.name}
                          onChange={e => updateClass(idx, 'name', e.target.value)}
                        />
                        <input
                          className="ai-class-desc"
                          placeholder="Description de la classe"
                          value={c.description}
                          onChange={e => updateClass(idx, 'description', e.target.value)}
                        />
                        {form.classes.length > 2 && (
                          <button type="button" className="ai-class-del-btn" onClick={() => removeClass(idx)} title="Retirer cette classe">×</button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="button" className="ai-add-class-btn" onClick={addClass}>+ Ajouter une classe</button>
                </div>
              )}

              {error && <div className="ai-error">{error}</div>}

              <button type="submit" className="ai-submit-btn">Enregistrer le modèle</button>
            </form>
          </section>

          <section className="ai-section">
            <div className="ai-section-header">
              <h2>Modèles Configurés</h2>
              <span className="ai-count-badge">{configs.length}</span>
            </div>

            {configs.length === 0 ? (
              <div className="ai-empty">Aucun modèle IA configuré. Créez-en un ci-dessus.</div>
            ) : (
              <div className="ai-config-list">
                {configs.map(c => (
                  <div key={c.id} className={`ai-config-card${c.active ? '' : ' disabled'}`}>
                    <div className="ai-config-head">
                      <div className="ai-config-title">
                        <div className="ai-config-name">{c.name}</div>
                        <span className={`ai-config-type-badge ${c.modelType}`}>
                          {MODEL_TYPES.find(t => t.value === c.modelType)?.label}
                        </span>
                      </div>
                      <div className="ai-config-actions">
                        <label className="ai-config-toggle">
                          <input type="checkbox" checked={c.active} onChange={() => handleToggle(c.id)} />
                          <span>{c.active ? 'Actif' : 'Inactif'}</span>
                        </label>
                        <button className="ai-config-del-btn" onClick={() => handleDelete(c.id)} title="Supprimer">×</button>
                      </div>
                    </div>

                    <div className="ai-config-file">
                      &#128196; {c.modelFile?.name} <em>({formatFileSize(c.modelFile?.size)})</em>
                    </div>

                    {c.modelType === 'regression' ? (
                      <div className="ai-config-output">
                        <span className="ai-config-io-label">Sortie</span>
                        <p>{c.outputDescription}</p>
                      </div>
                    ) : (
                      <div className="ai-config-output">
                        <span className="ai-config-io-label">Classes ({c.classes?.length})</span>
                        <div className="ai-config-classes">
                          {c.classes?.map((cl, i) => (
                            <div key={i} className="ai-config-class-item">
                              <span className="ai-config-class-name">{cl.name}</span>
                              <span className="ai-config-class-desc">{cl.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
