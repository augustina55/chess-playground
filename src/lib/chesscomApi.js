const _cache = new Map()

async function getJson(url) {
  if (_cache.has(url)) return _cache.get(url)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Chess.com ${res.status}`)
  const data = await res.json()
  _cache.set(url, data)
  return data
}

export function clearChessComCache() { _cache.clear() }

const BASE = 'https://api.chess.com/pub'

export const getChessComStats = (u) =>
  getJson(`${BASE}/player/${encodeURIComponent(u)}/stats`)

export const getChessComGames = (u, year, month) =>
  getJson(`${BASE}/player/${encodeURIComponent(u)}/games/${year}/${String(month).padStart(2, '0')}`)
