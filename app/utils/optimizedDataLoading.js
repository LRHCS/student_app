export async function optimizedLoadDashboardData() {
  // Implement request deduplication
  const key = 'dashboard-data'
  if (globalThis.cache?.[key]) {
    return globalThis.cache[key]
  }

  const data = await loadDashboardData()
  if (typeof window !== 'undefined') {
    globalThis.cache = globalThis.cache || {}
    globalThis.cache[key] = data
  }
  
  return data
} 