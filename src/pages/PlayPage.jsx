import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RotateCcw, Flag, Handshake, X, Clock, Users, Globe, Bot,
  Copy, Check, ArrowLeft, ChevronRight, LogIn,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(secs) {
  const s = Math.max(0, secs)
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ── Time controls ─────────────────────────────────────────────────────────────

const TIME_GROUPS = [
  { label: 'Bullet',   items: [{ m: 1, i: 0 }, { m: 1, i: 1 }, { m: 2, i: 1 }] },
  { label: 'Blitz',    items: [{ m: 3, i: 0 }, { m: 3, i: 2 }, { m: 5, i: 0 }, { m: 5, i: 3 }] },
  { label: 'Rapid',    items: [{ m: 10, i: 0 }, { m: 15, i: 10 }, { m: 30, i: 0 }] },
  { label: 'Classical',items: [{ m: 60, i: 0 }] },
]

function tcLabel(tc) { return tc.i ? `${tc.m}+${tc.i}` : `${tc.m}+0` }

// ── Lobby ─────────────────────────────────────────────────────────────────────

function Lobby({ onMode }) {
  const CARDS = [
    { id: 'random', icon: Globe, label: 'Play Online',     desc: 'Find a random opponent from around the world.', accent: 'text-emerald-600', iconBg: 'bg-emerald-50', btn: 'bg-emerald-500 hover:bg-emerald-600' },
    { id: 'friend', icon: Users, label: 'Play with Friend',desc: 'Create or join a room and play with a friend.',  accent: 'text-brand-600',   iconBg: 'bg-brand-50',   btn: 'bg-brand-600 hover:bg-brand-700'   },
    { id: 'ai',     icon: Bot,   label: 'Play vs AI',      desc: 'Challenge the computer and sharpen your skills.', accent: 'text-violet-600',  iconBg: 'bg-violet-50',  btn: 'bg-violet-600 hover:bg-violet-700' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[28px] font-black text-gray-900">Play Chess</h1>
        <p className="text-[14px] text-gray-400 mt-1">Choose your opponent and start playing.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {CARDS.map(({ id, icon: Icon, label, desc, accent, iconBg, btn }, i) => (
          <motion.div key={id}
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 flex flex-col gap-4">
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center', iconBg)}>
              <Icon size={26} className={accent} />
            </div>
            <div className="flex-1">
              <h2 className="text-[16px] font-black text-gray-900">{label}</h2>
              <p className="text-[12px] text-gray-400 mt-1 leading-relaxed">{desc}</p>
            </div>
            <button onClick={() => onMode(id)}
              className={cn('w-full h-11 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-colors', btn)}>
              Play Now <ChevronRight size={14} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Time control picker ───────────────────────────────────────────────────────

function TCPicker({ title, onBack, onPick }) {
  const [sel, setSel] = useState(null)
  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-[22px] font-black text-gray-900">{title}</h1>
          <p className="text-[13px] text-gray-400">Choose a time control</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 space-y-5">
        {TIME_GROUPS.map(g => (
          <div key={g.label}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">{g.label}</p>
            <div className="flex flex-wrap gap-2">
              {g.items.map(tc => {
                const lbl = tcLabel(tc)
                return (
                  <button key={lbl} onClick={() => setSel(tc)}
                    className={cn('h-10 px-5 rounded-xl border text-[13px] font-bold transition-all',
                      sel && tcLabel(sel) === lbl
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:bg-gray-50')}>
                    {lbl}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => sel && onPick(sel)} disabled={!sel}
        className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-[14px] transition-colors shadow-lg shadow-brand-500/20">
        {sel ? `Play ${tcLabel(sel)}` : 'Select a time control'}
      </button>
    </div>
  )
}

// ── Friend setup ──────────────────────────────────────────────────────────────

function FriendSetup({ onBack, onStart }) {
  const [step, setStep]       = useState('time')   // 'time' | 'room'
  const [tc, setTc]           = useState(null)
  const [roomMode, setRoomMode] = useState(null)   // 'create' | 'join'
  const [code, setCode]       = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [copied, setCopied]   = useState(false)

  function pickTime(t) { setTc(t); setStep('room') }
  function createRoom() { setCode(genCode()); setRoomMode('create') }
  function copy() { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  if (step === 'time') {
    return (
      <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ArrowLeft size={16} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-[22px] font-black text-gray-900">Play with Friend</h1>
            <p className="text-[13px] text-gray-400">First choose a time control</p>
          </div>
        </div>
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-6 space-y-5">
          {TIME_GROUPS.map(g => (
            <div key={g.label}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map(t => (
                  <button key={tcLabel(t)} onClick={() => pickTime(t)}
                    className="h-10 px-5 rounded-xl border border-gray-200 bg-white text-gray-700 text-[13px] font-bold hover:border-brand-400 hover:bg-brand-50 transition-all">
                    {tcLabel(t)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={() => { setStep('time'); setRoomMode(null) }}
          className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors">
          <ArrowLeft size={16} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-[22px] font-black text-gray-900">Play with Friend</h1>
          <p className="text-[13px] text-gray-400">Time: <strong>{tcLabel(tc)}</strong></p>
        </div>
      </div>

      {!roomMode && (
        <div className="grid grid-cols-2 gap-4">
          <button onClick={createRoom}
            className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6 text-left hover:border-brand-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center mb-4 transition-colors">
              <Users size={22} className="text-brand-600" />
            </div>
            <p className="text-[15px] font-black text-gray-900">Create Room</p>
            <p className="text-[12px] text-gray-400 mt-1">Generate a code and share with your friend</p>
          </button>
          <button onClick={() => setRoomMode('join')}
            className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-6 text-left hover:border-emerald-300 hover:shadow-md transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-4 transition-colors">
              <LogIn size={22} className="text-emerald-600" />
            </div>
            <p className="text-[15px] font-black text-gray-900">Join Room</p>
            <p className="text-[12px] text-gray-400 mt-1">Enter your friend's room code to join</p>
          </button>
        </div>
      )}

      {roomMode === 'create' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-7 space-y-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Room Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <span className="text-[32px] font-black text-gray-900 tracking-[0.35em]">{code}</span>
            </div>
            <button onClick={copy}
              className={cn('w-16 h-16 rounded-2xl border flex items-center justify-center transition-all',
                copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50')}>
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          <p className="text-[12px] text-gray-400">Share this code with your friend. They enter it to join.</p>
          <div className="flex items-center gap-2 text-[12px] text-gray-400">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin shrink-0" />
            Waiting for friend to join…
          </div>
          <button onClick={() => onStart({ tc, code, role: 'white' })}
            className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-[13px] transition-colors">
            Start Game
          </button>
        </motion.div>
      )}

      {roomMode === 'join' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-7 space-y-5">
          <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">Enter Room Code</p>
          <input
            value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="A B C 1 2 3"
            className="w-full h-16 rounded-2xl border border-gray-200 bg-gray-50 text-center text-[30px] font-black text-gray-900 tracking-[0.4em] outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 transition-all"
          />
          <button onClick={() => onStart({ tc, code: joinInput, role: 'black' })} disabled={joinInput.length < 4}
            className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold text-[13px] transition-colors">
            Join Room
          </button>
        </motion.div>
      )}
    </div>
  )
}

// ── Searching overlay ─────────────────────────────────────────────────────────

function SearchingOverlay({ tc, onCancel, onFound }) {
  const [elapsed, setElapsed] = useState(0)
  const [dots, setDots]       = useState('.')

  useEffect(() => {
    const d = setInterval(() => setDots(p => p.length >= 3 ? '.' : p + '.'), 500)
    const e = setInterval(() => setElapsed(s => s + 1), 1000)
    const f = setTimeout(() => {
      const names = ['Magnus_Fan', 'TacticsKing', 'EndgameExpert', 'ChessCrazy', 'PawnStorm99']
      onFound({ name: names[Math.floor(Math.random() * names.length)], rating: 1050 + Math.floor(Math.random() * 500) })
    }, 2500 + Math.random() * 3000)
    return () => { clearInterval(d); clearInterval(e); clearTimeout(f) }
  }, [onFound])

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[28px] border border-gray-200 shadow-2xl p-10 max-w-xs w-full text-center space-y-5">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
          <div className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-brand-50">
            <Globe size={28} className="text-brand-600" />
          </div>
        </div>
        <div>
          <h2 className="text-[20px] font-black text-gray-900">Searching{dots}</h2>
          <p className="text-[12px] text-gray-400 mt-1">Looking for a <strong>{tcLabel(tc)}</strong> opponent</p>
          <p className="text-[12px] text-gray-300 mt-2 font-mono">{fmtTime(elapsed)}</p>
        </div>
        <button onClick={onCancel}
          className="h-10 px-6 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
      </motion.div>
    </div>
  )
}

// ── Game over modal ───────────────────────────────────────────────────────────

function GameOverModal({ result, reason, onRematch, onExit }) {
  const cfg = result === 'win'  ? { emoji: '🏆', title: 'You Won!',  bg: 'bg-emerald-50', border: 'border-emerald-200' }
            : result === 'draw' ? { emoji: '🤝', title: 'Draw',      bg: 'bg-amber-50',   border: 'border-amber-200'  }
                                : { emoji: '💀', title: 'You Lost',  bg: 'bg-red-50',     border: 'border-red-200'    }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={cn('rounded-[28px] border shadow-2xl p-8 max-w-sm w-full text-center space-y-4', cfg.bg, cfg.border)}>
        <div className="text-5xl">{cfg.emoji}</div>
        <div>
          <h2 className="text-[24px] font-black text-gray-900">{cfg.title}</h2>
          <p className="text-[13px] text-gray-500 mt-1">{reason}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onRematch}
            className="flex-1 h-11 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-[13px] transition-colors">
            Rematch
          </button>
          <button onClick={onExit}
            className="flex-1 h-11 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-[13px] hover:bg-gray-50 transition-colors">
            Exit
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Control button with tooltip ───────────────────────────────────────────────

function CtrlBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <div className="relative group">
      <button onClick={onClick}
        className={cn(
          'w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all',
          danger
            ? 'border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300'
            : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-700'
        )}>
        <Icon size={17} />
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  )
}

// ── Timer box ─────────────────────────────────────────────────────────────────

function TimerBox({ secs, active }) {
  const low = active && secs <= 10
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 min-w-[96px] justify-center transition-all',
      active
        ? low ? 'bg-red-500 border-red-400 text-white animate-pulse'
               : 'bg-gray-900 border-gray-900 text-white shadow-[0_3px_0_#1a140f]'
        : 'bg-gray-50 border-gray-200 text-gray-400'
    )}>
      <Clock size={11} className={active && !low ? 'text-brand-400' : ''} />
      <span className="text-[17px] font-black tabular-nums leading-none">{fmtTime(secs)}</span>
    </div>
  )
}

// ── Game screen ───────────────────────────────────────────────────────────────

function GameScreen({ mode, tc, opponent, onExit }) {
  const { user }           = useAuth()
  const chessRef           = useRef(new Chess())
  const boardContainerRef  = useRef(null)
  const moveListRef        = useRef(null)

  const [fen,      setFen]      = useState(chessRef.current.fen())
  const [history,  setHistory]  = useState([])
  const [wTime,    setWTime]    = useState(tc.m * 60)
  const [bTime,    setBTime]    = useState(tc.m * 60)
  const [gameOver, setGameOver] = useState(null)
  const [drawSent, setDrawSent] = useState(false)
  const [boardSize, setBoardSize] = useState(400)

  const orientation = 'white'

  // Auto-size board to fit container
  useEffect(() => {
    const el = boardContainerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBoardSize(Math.floor(Math.min(width, height)) - 2)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Scroll notation to bottom on new move
  useEffect(() => {
    if (moveListRef.current) moveListRef.current.scrollTop = moveListRef.current.scrollHeight
  }, [history])

  const chess       = chessRef.current
  const isWhiteTurn = chess.turn() === 'w'

  function detectGameOver() {
    const g = chessRef.current
    if (g.isCheckmate()) {
      const loser = g.turn()
      const playerLost = (orientation === 'white' && loser === 'w') || (orientation === 'black' && loser === 'b')
      return { result: playerLost ? 'loss' : 'win', reason: 'Checkmate' }
    }
    if (g.isStalemate())            return { result: 'draw', reason: 'Stalemate' }
    if (g.isThreefoldRepetition())  return { result: 'draw', reason: 'Threefold Repetition' }
    if (g.isInsufficientMaterial()) return { result: 'draw', reason: 'Insufficient Material' }
    if (g.isDraw())                 return { result: 'draw', reason: 'Draw by 50-move rule' }
    return null
  }

  const aiMove = useCallback(() => {
    if (gameOver) return
    const g = chessRef.current
    const moves = g.moves({ verbose: true })
    if (!moves.length) return
    setTimeout(() => {
      g.move(moves[Math.floor(Math.random() * moves.length)])
      setFen(g.fen())
      setHistory(g.history({ verbose: true }))
      setBTime(t => t + tc.i)
      const over = detectGameOver()
      if (over) setGameOver(over)
    }, 300 + Math.random() * 700)
  }, [gameOver, tc.i]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer
  useEffect(() => {
    if (gameOver) return
    const id = setInterval(() => {
      if (isWhiteTurn) {
        setWTime(t => { if (t <= 1) { setGameOver({ result: 'loss', reason: 'Out of time' }); return 0 } return t - 1 })
      } else {
        setBTime(t => { if (t <= 1) { setGameOver({ result: 'win', reason: 'Opponent out of time' }); return 0 } return t - 1 })
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isWhiteTurn, gameOver])

  function onDrop(src, tgt) {
    if (gameOver) return false
    if (!(orientation === 'white' ? isWhiteTurn : !isWhiteTurn)) return false
    const g = chessRef.current
    let mv
    try { mv = g.move({ from: src, to: tgt, promotion: 'q' }) } catch { return false }
    if (!mv) return false
    setFen(g.fen())
    setHistory(g.history({ verbose: true }))
    if (orientation === 'white') setWTime(t => t + tc.i); else setBTime(t => t + tc.i)
    const over = detectGameOver()
    if (over) { setGameOver(over); return true }
    if (mode === 'ai') aiMove()
    return true
  }

  function takeback() {
    const g = chessRef.current
    g.undo(); if (mode === 'ai') g.undo()
    setFen(g.fen()); setHistory(g.history({ verbose: true }))
  }
  function resign()    { setGameOver({ result: 'loss', reason: 'You resigned' }) }
  function offerDraw() {
    setDrawSent(true)
    if (mode === 'ai') setTimeout(() => {
      if (Math.random() > 0.55) setGameOver({ result: 'draw', reason: 'Draw agreed' })
      else setDrawSent(false)
    }, 1800)
  }
  function rematch() {
    chessRef.current = new Chess()
    setFen(chessRef.current.fen()); setHistory([])
    setWTime(tc.m * 60); setBTime(tc.m * 60)
    setGameOver(null); setDrawSent(false)
  }

  // Player helpers
  const topName    = opponent?.name || 'Opponent'
  const topRating  = opponent?.rating
  const topIsWhite = false
  const topTime    = bTime
  const topActive  = !isWhiteTurn

  const btmName    = user?.name || 'You'
  const btmRating  = user?.rating
  const btmIsWhite = true
  const btmTime    = wTime
  const btmActive  = isWhiteTurn

  const pairs = useMemo(() => {
    const p = []
    for (let i = 0; i < history.length; i += 2)
      p.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] })
    return p
  }, [history])

  function Avatar({ name, isWhite }) {
    return (
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black border-2 shrink-0',
        isWhite ? 'bg-white text-gray-800 border-gray-300 shadow-sm' : 'bg-[#1a140f] text-white border-gray-700'
      )}>
        {name[0]?.toUpperCase()}
      </div>
    )
  }

  function PlayerRow({ name, rating, isWhite, time, active }) {
    return (
      <div className={cn(
        'flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border-2 transition-all bg-white',
        active ? 'border-[#1a140f] shadow-[0_3px_0_#1a140f]' : 'border-gray-200'
      )}>
        <div className="flex items-center gap-2.5">
          <Avatar name={name} isWhite={isWhite} />
          <div>
            <p className="text-[13px] font-bold text-gray-900 leading-none">{name}</p>
            {rating && <p className="text-[11px] text-gray-400 mt-0.5">{rating}</p>}
          </div>
        </div>
        <TimerBox secs={time} active={active} />
      </div>
    )
  }

  return (
    // h-full fills the <main> flex-1 area; overflow-hidden prevents any page scroll
    <div className="h-full flex overflow-hidden bg-[#f6f8fc]">

      {/* ── Board column ── */}
      <div className="flex-1 flex flex-col gap-2 p-4 min-w-0 overflow-hidden">

        <PlayerRow name={topName} rating={topRating} isWhite={topIsWhite} time={topTime} active={topActive} />

        {/* Board container — fills remaining height, board auto-sizes inside */}
        <div ref={boardContainerRef} className="flex-1 min-h-0 flex items-center justify-center">
          <div className="rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] border-2 border-[#1a140f]"
            style={{ width: boardSize, height: boardSize }}>
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              boardWidth={boardSize}
              customBoardStyle={{ borderRadius: 0 }}
              customDarkSquareStyle={{ backgroundColor: '#b58863' }}
              customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
              animationDuration={150}
            />
          </div>
        </div>

        <PlayerRow name={btmName} rating={btmRating} isWhite={btmIsWhite} time={btmTime} active={btmActive} />
      </div>

      {/* ── Right panel — fixed 260px, full height ── */}
      <div className="w-[260px] shrink-0 border-l-2 border-[#1a140f] bg-white flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-gray-400" />
            <span className="text-[13px] font-bold text-gray-800">{tcLabel(tc)}</span>
            <span className="text-[11px] text-gray-400">
              · {mode === 'ai' ? 'vs AI' : mode === 'friend' ? 'Friend' : 'Online'}
            </span>
          </div>
          <button onClick={onExit}
            className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Move notation — only this scrolls */}
        <div className="shrink-0 px-4 pt-3 pb-1 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Moves</p>
          {history.length > 0 && <span className="text-[10px] text-gray-400">{Math.ceil(history.length / 2)}</span>}
        </div>
        <div ref={moveListRef} className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
          {pairs.length === 0 ? (
            <p className="text-center py-10 text-[12px] text-gray-400">Make your first move!</p>
          ) : (
            <table className="w-full">
              <tbody>
                {pairs.map(({ n, w, b }) => (
                  <tr key={n} className="hover:bg-gray-50 transition-colors rounded">
                    <td className="pl-3 pr-1 py-1.5 text-[11px] text-gray-400 font-mono w-7">{n}.</td>
                    <td className="px-1 py-1.5 text-[13px] font-semibold text-gray-800 cursor-pointer rounded">{w?.san}</td>
                    <td className="px-1 py-1.5 text-[13px] font-semibold text-gray-800 cursor-pointer rounded">{b?.san || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Controls — fixed at bottom */}
        <div className="shrink-0 border-t border-gray-100 px-4 py-4">
          <div className="flex items-center justify-center gap-3">
            <CtrlBtn icon={RotateCcw} label="Take Back"  onClick={takeback} />
            <CtrlBtn icon={Handshake} label="Offer Draw" onClick={offerDraw} />
            <CtrlBtn icon={Flag}      label="Resign"      onClick={resign} danger />
          </div>
          <AnimatePresence>
            {drawSent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2 text-amber-700 text-[11px] font-semibold">
                    <Handshake size={12} /> Draw offer sent…
                  </div>
                  <button onClick={() => setDrawSent(false)} className="text-amber-500 hover:text-amber-700">
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {gameOver && (
          <GameOverModal result={gameOver.result} reason={gameOver.reason} onRematch={rematch} onExit={onExit} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

export default function PlayPage() {
  const [screen,   setScreen]   = useState('lobby')  // lobby | tc | friend | game
  const [mode,     setMode]     = useState(null)
  const [tc,       setTc]       = useState(null)
  const [opponent, setOpponent] = useState(null)
  const [searching, setSearching] = useState(false)

  function handleMode(m) {
    setMode(m)
    if (m === 'friend') setScreen('friend')
    else setScreen('tc')
  }

  function handleTC(t) {
    setTc(t)
    if (mode === 'random') setSearching(true)
    else { setOpponent({ name: 'Chess AI', rating: 1500 }); setScreen('game') }
  }

  function handleFound(opp) { setSearching(false); setOpponent(opp); setScreen('game') }
  function handleFriendStart({ tc: t }) { setTc(t); setOpponent({ name: 'Friend' }); setScreen('game') }

  function exit() { setScreen('lobby'); setMode(null); setTc(null); setOpponent(null); setSearching(false) }

  if (screen === 'game') {
    return <GameScreen mode={mode} tc={tc} opponent={opponent} onExit={exit} />
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      {screen === 'lobby' && <Lobby onMode={handleMode} />}
      {screen === 'tc'    && <TCPicker title={mode === 'ai' ? 'Play vs AI' : 'Play Online'} onBack={() => setScreen('lobby')} onPick={handleTC} />}
      {screen === 'friend'&& <FriendSetup onBack={() => setScreen('lobby')} onStart={handleFriendStart} />}

      <AnimatePresence>
        {searching && tc && (
          <SearchingOverlay tc={tc} onCancel={() => { setSearching(false); setScreen('tc') }} onFound={handleFound} />
        )}
      </AnimatePresence>
    </div>
  )
}
