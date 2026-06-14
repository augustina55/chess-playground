import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, AlertCircle, Trophy, Target, Clock, BookOpen, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getLichessUser, getLichessActivity, getLichessRatingHistory, clearLichessCache } from '../lib/lichessApi'
import { getChessComStats, getChessComGames, clearChessComCache } from '../lib/chesscomApi'
import { getFullHomeworkProgressForStudent, getRaceScoresByUser } from '../lib/db'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtMonth(d) {
  return d.toLocaleString('en', { month: 'long', year: 'numeric' })
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function dayKey(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function fmtTime(secs) {
  if (!secs) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ISO week string "YYYY-Www" for grouping
function isoWeekKey(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil((((d - yearStart) / 864e5) + 1) / 7)
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// Short label for a week key "YYYY-Www" → "Jun 2"
function weekLabel(key) {
  const [year, w] = key.split('-W')
  const jan4 = new Date(Number(year), 0, 4)
  const weekStart = new Date(jan4)
  weekStart.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (Number(w) - 1) * 7)
  return weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// Lichess activity → Set of day timestamps (midnight UTC)
function lichessActiveDaySet(activity) {
  const s = new Set()
  for (const item of activity) {
    const hasGames = item.games && Object.keys(item.games).length > 0
    const hasPuzzles = item.puzzles?.score
    if (hasGames || hasPuzzles) {
      const d = new Date(item.interval.start)
      s.add(dayKey(d))
    }
  }
  return s
}

// Which day numbers (1–31) were active in a given year/month?
function activeDaysInMonth(allActiveDaySet, year, month) {
  const days = new Set()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const ts = new Date(year, month, d).getTime()
    if (allActiveDaySet.has(ts)) days.add(d)
  }
  return days
}

// Streak = consecutive days ending today (or yesterday if today not yet active)
function computeStreak(allActiveDaySet) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayTs = today.getTime()
  const startOffset = allActiveDaySet.has(todayTs) ? 0 : 1
  let streak = 0
  for (let i = startOffset; i < 365; i++) {
    const ts = todayTs - i * 864e5
    if (allActiveDaySet.has(ts)) streak++
    else break
  }
  return streak
}

// Lichess user → { games, win, loss, draw }
function lichessTotals(user) {
  const c = user?.count || {}
  return { games: c.all || 0, win: c.win || 0, loss: c.loss || 0, draw: c.draw || 0 }
}

// Chess.com stats → totalled across rapid + blitz + bullet
function ccTotals(stats) {
  let win = 0, loss = 0, draw = 0
  for (const v of ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily']) {
    const r = stats?.[v]?.record
    if (r) { win += r.win || 0; loss += r.loss || 0; draw += r.draw || 0 }
  }
  return { games: win + loss + draw, win, loss, draw }
}

// Lichess rating-history API → { blitz: [{ts, rating}], bullet: [...], ... }
function parseLichessHistory(historyData) {
  const out = {}
  for (const v of historyData) {
    out[v.name.toLowerCase()] = v.points
      .map(([y, m, d, r]) => ({ ts: new Date(y, m, d).getTime(), rating: r }))
  }
  return out
}

// Chess.com games → [{ts, rating}] for a given username
function extractCCRatings(games, username) {
  const un = username.toLowerCase()
  return games
    .flatMap(g => {
      let r = null
      if (g.white?.username?.toLowerCase() === un) r = g.white.rating
      else if (g.black?.username?.toLowerCase() === un) r = g.black.rating
      return r ? [{ ts: g.end_time * 1000, rating: r }] : []
    })
    .sort((a, b) => a.ts - b.ts)
}

// Chess.com games → active day set
function ccActiveDaySetFromGames(games) {
  const s = new Set()
  for (const g of games) s.add(dayKey(new Date(g.end_time * 1000)))
  return s
}

function filterByPeriod(pts, period) {
  const ms = { '7D': 7, '30D': 30, '3M': 90, '6M': 180, '1Y': 365 }
  if (!ms[period]) return pts
  const cutoff = Date.now() - ms[period] * 864e5
  return pts.filter(p => p.ts >= cutoff)
}

// ── SVG Line Chart ────────────────────────────────────────────────────────────

function LineChart({ lichessPoints, ccPoints }) {
  const ref = useRef()
  const [sz, setSz] = useState({ w: 600, h: 190 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSz({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = sz
  const pad = { l: 46, r: 14, t: 8, b: 28 }
  const iw = w - pad.l - pad.r
  const ih = h - pad.t - pad.b
  const all = [...lichessPoints, ...ccPoints]

  if (all.length < 2) return (
    <div ref={ref} className="w-full h-full flex items-center justify-center text-sm text-gray-400">
      Not enough data for this period
    </div>
  )

  const minR = Math.min(...all.map(p => p.rating)) - 40
  const maxR = Math.max(...all.map(p => p.rating)) + 40
  const minT = Math.min(...all.map(p => p.ts))
  const maxT = Math.max(...all.map(p => p.ts))
  const rng = (v, min, max) => (v - min) / ((max - min) || 1)

  const sx = t => pad.l + rng(t, minT, maxT) * iw
  const sy = r => pad.t + (1 - rng(r, minR, maxR)) * ih

  const mkLine = pts => pts.length < 2 ? '' :
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.ts).toFixed(1)},${sy(p.rating).toFixed(1)}`).join(' ')

  const mkArea = pts => {
    if (pts.length < 2) return ''
    const bot = (pad.t + ih).toFixed(1)
    return `${mkLine(pts)} L${sx(pts.at(-1).ts).toFixed(1)},${bot} L${sx(pts[0].ts).toFixed(1)},${bot} Z`
  }

  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round(minR + (maxR - minR) * i / 4))
  const xTicks = Array.from({ length: 4 }, (_, i) => minT + (maxT - minT) * i / 3)

  return (
    <div ref={ref} className="w-full h-full">
      <svg width={w} height={h}>
        <defs>
          <linearGradient id="lc-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cc-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map(r => (
          <g key={r}>
            <line x1={pad.l} x2={w - pad.r} y1={sy(r)} y2={sy(r)} stroke="#f0ede8" strokeWidth="1" />
            <text x={pad.l - 5} y={sy(r)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="#bbb">{r}</text>
          </g>
        ))}

        {xTicks.map((t, i) => (
          <text key={i} x={sx(t)} y={h - 6} textAnchor="middle" fontSize={9} fill="#bbb">
            {new Date(t).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {ccPoints.length >= 2 && (
          <>
            <path d={mkArea(ccPoints)} fill="url(#cc-g)" />
            <path d={mkLine(ccPoints)} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={sx(ccPoints.at(-1).ts)} cy={sy(ccPoints.at(-1).rating)} r={3.5} fill="#16a34a" />
          </>
        )}

        {lichessPoints.length >= 2 && (
          <>
            <path d={mkArea(lichessPoints)} fill="url(#lc-g)" />
            <path d={mkLine(lichessPoints)} fill="none" stroke="#7c3aed" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={sx(lichessPoints.at(-1).ts)} cy={sy(lichessPoints.at(-1).rating)} r={3.5} fill="#7c3aed" />
          </>
        )}
      </svg>
    </div>
  )
}

// ── SVG Bar Chart (weekly puzzles) ────────────────────────────────────────────

function WeeklyBarChart({ labels, values }) {
  const ref = useRef()
  const [w, setW] = useState(500)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 110
  const pad = { l: 28, r: 8, t: 10, b: 26 }
  const iw = w - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const maxV = Math.max(...values, 1)
  const barW = Math.max(4, iw / values.length - 3)
  const gap = (iw - barW * values.length) / Math.max(values.length - 1, 1)

  const bx = i => pad.l + i * (barW + gap)
  const bh = v => Math.max(v > 0 ? 3 : 0, (v / maxV) * ih)

  const yTicks = [0, Math.round(maxV / 2), maxV]

  return (
    <div ref={ref} className="w-full" style={{ height: H }}>
      <svg width={w} height={H}>
        {yTicks.map(v => {
          const y = pad.t + ih - (v / maxV) * ih
          return (
            <g key={v}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1" />
              <text x={pad.l - 4} y={y} textAnchor="end" dominantBaseline="middle" fontSize={8} fill="#d1d5db">{v}</text>
            </g>
          )
        })}
        {values.map((v, i) => {
          const x = bx(i)
          const bH = bh(v)
          const y = pad.t + ih - bH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={bH}
                rx={Math.min(3, barW / 2)}
                fill={v > 0 ? '#f97316' : '#f3f4f6'} />
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize={8} fill="#9ca3af">{labels[i]}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Stats block ───────────────────────────────────────────────────────────────

function MiniStat({ label, value, sub, textColor = 'text-gray-900' }) {
  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3.5">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[22px] font-black leading-none ${textColor}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function PlatformStats({ title, icon, bgColor, textColor, connected, loading, error, data, profileUrl }) {
  return (
    <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center text-white text-[13px] font-black`}>{icon}</div>
          <p className="font-black text-[15px] text-gray-900">{title}</p>
        </div>
        {profileUrl && (
          <a href={profileUrl} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-1 text-[11px] font-semibold ${textColor} hover:underline`}>
            View Profile <ExternalLink size={10} />
          </a>
        )}
      </div>

      {!connected && (
        <p className="text-[12px] text-gray-400 py-2">Account not connected. Link it in Profile.</p>
      )}
      {connected && loading && (
        <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-gray-500 animate-spin" />
          Loading…
        </div>
      )}
      {connected && error && (
        <div className="flex items-center gap-2 text-[12px] text-red-500 bg-red-50 px-3 py-2 rounded-xl">
          <AlertCircle size={13} />{error}
        </div>
      )}
      {connected && !loading && !error && data && (
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Games Played" value={data.games.toLocaleString()} />
          <MiniStat label="Win" value={data.win.toLocaleString()}
            sub={data.games ? `${Math.round(data.win * 100 / data.games)}%` : ''}
            textColor="text-green-600" />
          <MiniStat label="Draw" value={data.draw.toLocaleString()}
            sub={data.games ? `${Math.round(data.draw * 100 / data.games)}%` : ''}
            textColor="text-gray-600" />
          <MiniStat label="Loss" value={data.loss.toLocaleString()}
            sub={data.games ? `${Math.round(data.loss * 100 / data.games)}%` : ''}
            textColor="text-red-500" />
          {data.puzzles != null && (
            <div className="col-span-2">
              <MiniStat label="Puzzles Solved" value={data.puzzles.toLocaleString()} textColor="text-violet-600" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PERIODS = ['7D', '30D', '3M', '6M', '1Y', 'All']

export default function ActivityPage() {
  const { user } = useAuth()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [period, setPeriod] = useState('3M')
  const [refreshKey, setRefreshKey] = useState(0)

  // Lichess
  const [lUser, setLUser] = useState(null)
  const [lActivity, setLActivity] = useState([])
  const [lHistory, setLHistory] = useState({})
  const [lLoading, setLLoading] = useState(false)
  const [lError, setLError] = useState(null)

  // Chess.com
  const [ccStats, setCcStats] = useState(null)
  const [ccMonthGames, setCcMonthGames] = useState([])
  const [ccAllGames, setCcAllGames] = useState([])
  const [ccLoading, setCcLoading] = useState(false)
  const [ccError, setCcError] = useState(null)
  const [ccRatingLoading, setCcRatingLoading] = useState(false)

  // Academy activity
  const [hwProgress, setHwProgress] = useState([])
  const [raceScores, setRaceScores] = useState([])

  // Fetch Lichess
  useEffect(() => {
    if (!user?.lichessId) return
    setLLoading(true); setLError(null)
    Promise.all([
      getLichessUser(user.lichessId),
      getLichessActivity(user.lichessId),
      getLichessRatingHistory(user.lichessId),
    ]).then(([u, act, hist]) => {
      setLUser(u); setLActivity(act); setLHistory(parseLichessHistory(hist))
    }).catch(e => setLError(e.message))
      .finally(() => setLLoading(false))
  }, [user?.lichessId, refreshKey])

  // Fetch Chess.com stats
  useEffect(() => {
    if (!user?.chessComId) return
    setCcLoading(true); setCcError(null)
    getChessComStats(user.chessComId)
      .then(setCcStats)
      .catch(e => setCcError(e.message))
      .finally(() => setCcLoading(false))
  }, [user?.chessComId, refreshKey])

  // Fetch Chess.com selected month games (for streak calendar)
  useEffect(() => {
    if (!user?.chessComId) return
    getChessComGames(user.chessComId, month.getFullYear(), month.getMonth() + 1)
      .then(d => setCcMonthGames(d.games || []))
      .catch(() => setCcMonthGames([]))
  }, [user?.chessComId, month, refreshKey])

  // Fetch Chess.com last 3 months games (for rating chart + all-time streak)
  useEffect(() => {
    if (!user?.chessComId) return
    setCcRatingLoading(true)
    const now = new Date()
    const months = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return { y: d.getFullYear(), m: d.getMonth() + 1 }
    })
    Promise.all(months.map(({ y, m }) =>
      getChessComGames(user.chessComId, y, m).then(d => d.games || []).catch(() => [])
    )).then(results => setCcAllGames(results.flat()))
      .finally(() => setCcRatingLoading(false))
  }, [user?.chessComId, refreshKey])

  // Fetch homework progress + race scores
  useEffect(() => {
    if (!user?.id) return
    if (user?.role === 'student') {
      getFullHomeworkProgressForStudent(user.id).then(setHwProgress).catch(() => {})
    }
    getRaceScoresByUser(user.id).then(setRaceScores).catch(() => {})
  }, [user?.id, refreshKey])

  function refresh() {
    clearLichessCache(); clearChessComCache()
    setRefreshKey(k => k + 1)
  }

  // Derived: Lichess active days
  const lAllActiveDays = lichessActiveDaySet(lActivity)
  const lMonthActiveDays = activeDaysInMonth(lAllActiveDays, month.getFullYear(), month.getMonth())
  const lStreak = computeStreak(lAllActiveDays)

  // Derived: Chess.com active days
  const ccAllActiveDays = ccActiveDaySetFromGames(ccAllGames)
  const ccMonthActiveDays = activeDaysInMonth(
    new Set([...ccAllActiveDays, ...ccActiveDaySetFromGames(ccMonthGames)]),
    month.getFullYear(), month.getMonth()
  )
  const ccStreak = computeStreak(new Set([...ccAllActiveDays]))

  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() &&
                          month.getMonth() === new Date().getMonth()

  // Lichess stats card data
  const lStatsData = lUser ? {
    ...lichessTotals(lUser),
    puzzles: lUser.perfs?.puzzle?.runs ?? null,
  } : null

  // Chess.com stats card data
  const ccStatsData = ccStats ? { ...ccTotals(ccStats), puzzles: null } : null

  // Rating chart points
  const lBlitzPts = filterByPeriod(lHistory['blitz'] || [], period)
  const ccRatingPts = filterByPeriod(extractCCRatings(ccAllGames, user?.chessComId || ''), period)

  // Motivation
  const best = Math.max(lStreak, ccStreak)
  const motivation = best >= 14 ? '🔥 Incredible! You are on fire — keep it going!'
    : best >= 7 ? '⭐ Great job! You are building an amazing habit.'
    : best >= 3 ? '💪 Nice streak! Stay consistent every day.'
    : '♟ Play today to start your streak!'

  // ── Academy activity derived stats ─────────────────────────────────────────

  const hwSolved = hwProgress.filter(r => r.solved).length
  const hwTotalTime = hwProgress.filter(r => r.solved).reduce((a, r) => a + (r.time_seconds || 0), 0)
  const hwBestRace = raceScores.length > 0 ? raceScores.reduce((a, b) => b.score > a.score ? b : a) : null
  const raceAvg = raceScores.length > 0 ? Math.round(raceScores.reduce((a, b) => a + b.score, 0) / raceScores.length) : 0

  // Last 8 weeks of puzzle solves for the bar chart
  const weeklyPuzzleData = useMemo(() => {
    const now = new Date()
    const keys = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - i * 7)
      return isoWeekKey(d)
    }).reverse()

    const counts = {}
    hwProgress.filter(r => r.solved && r.updated_at).forEach(r => {
      const k = isoWeekKey(new Date(r.updated_at))
      counts[k] = (counts[k] || 0) + 1
    })
    raceScores.forEach(r => {
      if (r.createdAt) {
        const k = isoWeekKey(new Date(r.createdAt))
        counts[k] = counts[k] || 0
      }
    })

    return {
      labels: keys.map(k => weekLabel(k)),
      values: keys.map(k => counts[k] || 0),
    }
  }, [hwProgress, raceScores])

  // Race score trend (chronological, for improvement graph)
  const raceChronological = useMemo(() =>
    [...raceScores].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [raceScores]
  )

  const showAcademySection = user?.role === 'student' || raceScores.length > 0

  return (
    <div className="p-5 md:p-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* Monthly Streak */}
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="font-black text-[15px] text-gray-900">Monthly Streak</p>
              <p className="text-[12px] text-gray-400">Consistency is the key to success.</p>
            </div>

            {/* Month nav */}
            <div className="px-5 pt-4 flex items-center justify-between">
              <button onClick={() => setMonth(m => addMonths(m, -1))}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                <ChevronLeft size={14} />
              </button>
              <span className="text-[13px] font-bold text-gray-700">{fmtMonth(month)}</span>
              <button onClick={() => setMonth(m => addMonths(m, 1))} disabled={isCurrentMonth}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Legend */}
            <div className="px-5 pt-3 flex items-center gap-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" /> Active</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> None</span>
            </div>

            <div className="px-5 pt-3 pb-4 space-y-2">
              <div className="flex items-center gap-1 mb-1">
                <div className="w-16 shrink-0" />
                <div className="flex-1 flex gap-[2px]">
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-[7px] text-gray-300 font-medium">{i + 1}</div>
                  ))}
                </div>
                <div className="w-12 shrink-0" />
              </div>

              {!user?.lichessId && !user?.chessComId ? (
                <div className="py-4 flex flex-col items-center gap-2 text-[12px] text-gray-400 text-center">
                  <AlertCircle size={15} className="text-amber-400" />
                  Connect Lichess or Chess.com in Profile
                </div>
              ) : (
                <>
                  {user?.lichessId && (
                    <div className="flex items-center gap-1">
                      <div className="w-16 shrink-0 flex items-center gap-1">
                        <span className="text-[11px]">♞</span>
                        <span className="text-[10px] font-semibold text-gray-500 truncate">Lichess</span>
                      </div>
                      <div className="flex-1 flex gap-[2px]">
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <div key={i} className={`flex-1 h-[14px] rounded-[2px] ${lMonthActiveDays.has(i + 1) ? 'bg-violet-500' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                      <div className="w-12 text-right shrink-0">
                        <span className="text-[16px] font-black text-violet-600">{lStreak}</span>
                        <span className="text-[9px] text-gray-400 ml-0.5">d</span>
                      </div>
                    </div>
                  )}
                  {user?.chessComId && (
                    <div className="flex items-center gap-1">
                      <div className="w-16 shrink-0 flex items-center gap-1">
                        <span className="text-[11px]">♟</span>
                        <span className="text-[10px] font-semibold text-gray-500 truncate">Chess.com</span>
                      </div>
                      <div className="flex-1 flex gap-[2px]">
                        {Array.from({ length: daysInMonth }, (_, i) => (
                          <div key={i} className={`flex-1 h-[14px] rounded-[2px] ${ccMonthActiveDays.has(i + 1) ? 'bg-green-500' : 'bg-gray-100'}`} />
                        ))}
                      </div>
                      <div className="w-12 text-right shrink-0">
                        <span className="text-[16px] font-black text-green-600">{ccStreak}</span>
                        <span className="text-[9px] text-gray-400 ml-0.5">d</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mx-4 mb-4 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-2.5 flex items-start gap-2">
              <span className="text-violet-500 text-sm shrink-0">★</span>
              <p className="text-[12px] font-semibold text-violet-700 leading-snug">{motivation}</p>
            </div>
          </div>

          {/* Overall Improvement */}
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-black text-[15px] text-gray-900">Overall Improvement</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Rating history + in-app progress</p>
              </div>
              <div className="flex items-center gap-1">
                {PERIODS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                      period === p ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Current ratings */}
            <div className="px-6 pt-5 flex gap-8 flex-wrap">
              {user?.lichessId && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-1">Lichess Blitz</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-violet-700 leading-none">
                      {lUser?.perfs?.blitz?.rating ?? (lLoading ? '…' : '–')}
                    </span>
                    {lUser?.perfs?.blitz?.prog != null && (
                      <span className={`text-[13px] font-bold ${lUser.perfs.blitz.prog >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {lUser.perfs.blitz.prog >= 0 ? '+' : ''}{lUser.perfs.blitz.prog}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">Blitz</span>
                  </div>
                </div>
              )}
              {user?.chessComId && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-1">Chess.com Rapid</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-green-700 leading-none">
                      {ccStats?.chess_rapid?.last?.rating ?? ccStats?.chess_blitz?.last?.rating ?? (ccLoading ? '…' : '–')}
                    </span>
                    <span className="text-[11px] text-gray-400">Rapid</span>
                  </div>
                </div>
              )}
              {hwBestRace && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-1">Best Race Score</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-violet-600 leading-none">{hwBestRace.score}</span>
                    <span className="text-[11px] text-gray-400">puzzles</span>
                  </div>
                </div>
              )}
              {hwSolved > 0 && (
                <div>
                  <p className="text-[11px] text-gray-400 font-medium mb-1">HW Puzzles</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-orange-500 leading-none">{hwSolved}</span>
                    <span className="text-[11px] text-gray-400">solved</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rating Chart */}
            <div className="px-6 pb-2 pt-3" style={{ height: 240 }}>
              <LineChart lichessPoints={lBlitzPts} ccPoints={ccRatingPts} />
            </div>

            {/* Legend + refresh */}
            <div className="px-6 pb-5 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-wrap">
                {user?.lichessId && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="w-5 h-0.5 bg-violet-600 rounded-full inline-block" />
                    Lichess Blitz
                  </span>
                )}
                {user?.chessComId && (
                  <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="w-5 h-0.5 bg-green-600 rounded-full inline-block" />
                    Chess.com Rapid {ccRatingLoading && <span className="text-gray-300">(loading…)</span>}
                  </span>
                )}
              </div>
              <button onClick={refresh}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                title="Refresh data">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* Platform Activity */}
          {showAcademySection && (
            <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="font-black text-[15px] text-gray-900">Platform Activity</p>
                <p className="text-[12px] text-gray-400 mt-0.5">Homework, puzzles & Blitz Race</p>
              </div>

              {/* Stat pills — 2-col to fit sidebar */}
              <div className="px-4 pt-4 grid grid-cols-2 gap-2">
                {user?.role === 'student' && (
                  <>
                    <div className="rounded-2xl bg-orange-50 border border-orange-100 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Target size={12} className="text-orange-500" />
                        <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">Puzzles Solved</span>
                      </div>
                      <p className="text-[22px] font-black text-orange-600 leading-none">{hwSolved.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl bg-blue-50 border border-blue-100 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Clock size={12} className="text-blue-500" />
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wide">Time Spent</span>
                      </div>
                      <p className="text-[22px] font-black text-blue-600 leading-none">{fmtTime(hwTotalTime)}</p>
                    </div>
                  </>
                )}
                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Trophy size={12} className="text-violet-500" />
                    <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wide">Best Race</span>
                  </div>
                  <p className="text-[22px] font-black text-violet-600 leading-none">{hwBestRace ? hwBestRace.score : '—'}</p>
                  {hwBestRace && <p className="text-[10px] text-violet-400 mt-0.5">{hwBestRace.time}</p>}
                </div>
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">Races Run</span>
                  </div>
                  <p className="text-[22px] font-black text-emerald-600 leading-none">{raceScores.length}</p>
                  {raceScores.length > 0 && <p className="text-[10px] text-emerald-400 mt-0.5">avg {raceAvg} pts</p>}
                </div>
              </div>

              {/* Weekly bar chart */}
              {user?.role === 'student' && (
                <div className="px-4 pt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Weekly Puzzles Solved</p>
                  <WeeklyBarChart labels={weeklyPuzzleData.labels} values={weeklyPuzzleData.values} />
                </div>
              )}

              {/* Race score tiles */}
              {raceScores.length > 0 && (
                <div className="px-4 pt-3 pb-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Scores</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {raceChronological.slice(-8).reverse().map((r, i) => (
                      <div key={r.id ?? i}
                        className={`flex flex-col items-center px-2.5 py-2 rounded-xl border ${i === 0 && r.score === hwBestRace?.score ? 'bg-violet-50 border-violet-200' : 'bg-gray-50 border-gray-100'}`}>
                        <span className={`text-[16px] font-black leading-none ${i === 0 && r.score === hwBestRace?.score ? 'text-violet-600' : 'text-gray-800'}`}>{r.score}</span>
                        <span className="text-[9px] text-gray-400 mt-0.5">{r.time}</span>
                      </div>
                    ))}
                  </div>
                  {raceChronological.length >= 3 && (() => {
                    const recent = raceChronological.slice(-5)
                    const older = raceChronological.slice(0, Math.max(1, raceChronological.length - 5))
                    const recentAvg = recent.reduce((a, b) => a + b.score, 0) / recent.length
                    const olderAvg = older.reduce((a, b) => a + b.score, 0) / older.length
                    const delta = Math.round(recentAvg - olderAvg)
                    if (delta === 0) return null
                    return (
                      <p className={`mt-2 text-[11px] font-semibold ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`} avg vs earlier races
                      </p>
                    )
                  })()}
                </div>
              )}

              {raceScores.length === 0 && user?.role !== 'student' && (
                <p className="px-4 pb-4 pt-3 text-[12px] text-gray-400">No race scores yet. Try the Blitz Race!</p>
              )}
              {user?.role === 'student' && hwSolved === 0 && raceScores.length === 0 && (
                <p className="px-4 pb-4 text-[12px] text-gray-400">No activity yet. Complete some homework or try a Blitz Race!</p>
              )}
            </div>
          )}

          {/* Platform Stats stacked vertically in sidebar */}
          <PlatformStats
            title="Lichess Stats"
            icon="L"
            bgColor="bg-gray-800"
            textColor="text-violet-600"
            connected={!!user?.lichessId}
            loading={lLoading}
            error={lError}
            data={lStatsData}
            profileUrl={user?.lichessId ? `https://lichess.org/@/${user.lichessId}` : null}
          />
          <PlatformStats
            title="Chess.com Stats"
            icon="C"
            bgColor="bg-green-800"
            textColor="text-green-700"
            connected={!!user?.chessComId}
            loading={ccLoading}
            error={ccError}
            data={ccStatsData}
            profileUrl={user?.chessComId ? `https://www.chess.com/member/${user.chessComId}` : null}
          />

        </div>
      </div>
    </div>
  )
}
