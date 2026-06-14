const _cache = new Map()

async function getJson(url) {
  if (_cache.has(url)) return _cache.get(url)
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Lichess ${res.status}`)
  const data = await res.json()
  _cache.set(url, data)
  return data
}

export function clearLichessCache() { _cache.clear() }

const BASE = 'https://lichess.org/api'

export const getLichessUser = (u) =>
  getJson(`${BASE}/user/${encodeURIComponent(u)}`)

export const getLichessActivity = (u) =>
  getJson(`${BASE}/user/${encodeURIComponent(u)}/activity`)

export const getLichessRatingHistory = (u) =>
  getJson(`${BASE}/user/${encodeURIComponent(u)}/rating-history`)
