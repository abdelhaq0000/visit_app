const STORAGE_KEY = 'football_dashboard_ai_configs'

export const MODEL_TYPES = [
  { value: 'classification', label: 'Classification' },
  { value: 'regression',     label: 'Régression' },
]

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (_) {
    return []
  }
}

function writeAll(configs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs))
}

export function getAllConfigs() {
  return readAll()
}

// config = {
//   name, modelType: 'classification' | 'regression',
//   modelFile: { name, size, type } | null,
//   outputDescription: string,               // regression
//   classes: [{ name, description }, ...],   // classification
// }
export function addConfig(config) {
  const configs = readAll()
  configs.push({
    ...config,
    id: `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  })
  writeAll(configs)
  return configs
}

export function deleteConfig(id) {
  const configs = readAll().filter(c => c.id !== id)
  writeAll(configs)
  return configs
}

export function toggleConfig(id) {
  const configs = readAll().map(c => c.id === id ? { ...c, active: !c.active } : c)
  writeAll(configs)
  return configs
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
