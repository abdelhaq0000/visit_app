export const MODEL_TYPES = [
  { value: 'classification', label: 'Classification' },
  { value: 'regression',     label: 'Régression' },
]

// ── AI configs are served by the backend API (server/routes/ai-configs.js) ──
// config = {
//   name, modelType: 'classification' | 'regression',
//   modelFile: { name, size, type } | null,
//   outputDescription: string,               // regression
//   classes: [{ name, description }, ...],   // classification
// }

export async function getAllConfigs() {
  const res = await fetch('/api/ai-configs')
  if (!res.ok) throw new Error('Failed to load AI configs')
  return res.json()
}

export async function addConfig(config) {
  const res = await fetch('/api/ai-configs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  if (!res.ok) throw new Error('Failed to add AI config')
  await res.json()
  return getAllConfigs()
}

export async function deleteConfig(id) {
  const res = await fetch(`/api/ai-configs/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 404) throw new Error('Failed to delete AI config')
  return getAllConfigs()
}

export async function toggleConfig(id) {
  const res = await fetch(`/api/ai-configs/${id}`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Failed to toggle AI config')
  return getAllConfigs()
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
