import { useState } from 'react'
import Navbar from '../components/Navbar'
import {
  METRIC_GROUPS, OPERATORS, LOGIC_OPS,
  getAllRules, addRule, deleteRule, toggleRule, conditionLabel,
} from '../data/expertRules'
import './ExpertSystem.css'

const EMPTY_CONDITION = { metric: 'vitesse', op: '>', value: '' }
const EMPTY_FORM = { conditions: [{ ...EMPTY_CONDITION }], logic: 'AND', recommendation: '' }

export default function ExpertSystem() {
  const [rules, setRules] = useState(getAllRules)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')

  function updateCondition(idx, field, value) {
    setForm(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === idx ? { ...c, [field]: value } : c),
    }))
  }

  function addCondition() {
    setForm(prev => ({ ...prev, conditions: [...prev.conditions, { ...EMPTY_CONDITION }] }))
  }

  function removeCondition(idx) {
    setForm(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== idx) }))
  }

  function handleAdd(e) {
    e.preventDefault()
    if (form.conditions.some(c => c.value.toString().trim() === '')) {
      setError('Veuillez renseigner une valeur pour chaque condition.')
      return
    }
    if (!form.recommendation.trim()) {
      setError('Veuillez écrire la recommandation à afficher quand la règle se déclenche.')
      return
    }
    setError('')
    setRules(addRule(form))
    setForm(EMPTY_FORM)
  }

  function handleDelete(id) {
    setRules(deleteRule(id))
  }

  function handleToggle(id) {
    setRules(toggleRule(id))
  }

  const activeCount = rules.filter(r => r.enabled).length

  return (
    <div className="es-page">
      <Navbar title="Système Expert — Règles" />

      <div className="es-layout">
        <main className="es-content">

          <section className="es-section">
            <div className="es-section-header">
              <h2>Nouvelle Règle</h2>
              <span className="es-expert-badge">SI … ALORS</span>
            </div>
            <p className="es-section-desc">
              Combinez une ou plusieurs conditions sur les données réellement capturées — vitesse, accélération,
              zones, température (tracker GPS/MPU6050) ou actions taguées (passes, tirs, tacles, fautes...) —
              reliées par ET / OU, puis écrivez la recommandation à afficher quand la règle se déclenche.
            </p>

            <form className="es-rule-form" onSubmit={handleAdd}>

              <div className="es-conditions-block">
                {form.conditions.map((cond, idx) => (
                  <div key={idx}>
                    {idx > 0 && (
                      <div className="es-logic-row">
                        <select
                          className="es-logic-select"
                          value={form.logic}
                          onChange={e => setForm(prev => ({ ...prev, logic: e.target.value }))}
                        >
                          {LOGIC_OPS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="es-condition-row">
                      <div className="es-rule-col es-col-metric">
                        <div className="es-rule-builder-label">Métrique</div>
                        <select value={cond.metric} onChange={e => updateCondition(idx, 'metric', e.target.value)}>
                          {METRIC_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map(m => (
                                <option key={m.value} value={m.value}>{m.label}{m.unit ? ` (${m.unit})` : ''}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="es-rule-col es-col-op">
                        <div className="es-rule-builder-label">Opérateur</div>
                        <select value={cond.op} onChange={e => updateCondition(idx, 'op', e.target.value)}>
                          {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="es-rule-col es-col-val">
                        <div className="es-rule-builder-label">Valeur</div>
                        <input
                          type="number"
                          placeholder="0"
                          value={cond.value}
                          onChange={e => updateCondition(idx, 'value', e.target.value)}
                        />
                      </div>
                      {form.conditions.length > 1 && (
                        <button type="button" className="es-cond-del-btn" onClick={() => removeCondition(idx)} title="Retirer cette condition">×</button>
                      )}
                    </div>
                  </div>
                ))}

                <button type="button" className="es-add-cond-btn" onClick={addCondition}>+ Ajouter une condition</button>
              </div>

              <div className="es-reco-field">
                <div className="es-rule-builder-label">Recommandation (texte libre, écrite par l'entraîneur/staff)</div>
                <textarea
                  className="es-reco-textarea"
                  rows={3}
                  placeholder="ex. Faire sortir le joueur immédiatement et prévoir une évaluation médicale."
                  value={form.recommendation}
                  onChange={e => setForm(prev => ({ ...prev, recommendation: e.target.value }))}
                />
              </div>

              {error && <div className="es-error">{error}</div>}

              <button type="submit" className="es-rule-add-btn">+ Enregistrer la règle</button>
            </form>
          </section>

          <section className="es-section">
            <div className="es-section-header">
              <h2>Règles Actives</h2>
              <span className="es-count-badge">{activeCount} / {rules.length} actives</span>
            </div>

            <div className="es-rules-list">
              {rules.length === 0 ? (
                <div className="es-rules-empty">
                  Aucune règle définie. Ajoutez une règle ci-dessus pour commencer.
                </div>
              ) : (
                rules.map((rule, i) => (
                  <div key={rule.id} className={`es-rule-item${rule.enabled ? '' : ' disabled'}`}>
                    <div className="es-rule-item-head">
                      <span className="es-rule-num">{i + 1}</span>
                      <span className="es-rule-if">SI</span>
                      <div className="es-rule-conditions">
                        {rule.conditions.map((c, ci) => (
                          <span key={ci} className="es-rule-cond-chip">
                            {ci > 0 && <span className="es-rule-logic-badge">{rule.logic === 'OR' ? 'OU' : 'ET'}</span>}
                            {conditionLabel(c)}
                          </span>
                        ))}
                      </div>
                      <label className="es-rule-toggle">
                        <input type="checkbox" checked={rule.enabled} onChange={() => handleToggle(rule.id)} />
                        <span>{rule.enabled ? 'Active' : 'Inactive'}</span>
                      </label>
                      <button className="es-rule-del-btn" onClick={() => handleDelete(rule.id)} title="Supprimer">×</button>
                    </div>
                    <div className="es-rule-reco">
                      <span className="es-rule-then">ALORS</span>
                      <span className="es-rule-reco-text">{rule.recommendation}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
