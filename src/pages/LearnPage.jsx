import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, CheckCircle2, ChevronRight, X, BookOpen, ArrowRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

// ── Sample chapter data (replace with DB fetch later) ─────────────────────────

const SAMPLE_CHAPTERS = [
  {
    id: 1,
    title: 'Foundations',
    description: 'Learn the basics of chess and understand how the game works.',
    icon: '♙',
    colorKey: 'emerald',
    lessons: [
      'The Chessboard & Pieces',
      'How Each Piece Moves',
      'Basic Rules & Turn Order',
      'Check, Checkmate & Stalemate',
    ],
    completedLessons: 4,
    status: 'completed',
  },
  {
    id: 2,
    title: 'Tactics',
    description: 'Build tactical skills and learn to spot winning opportunities.',
    icon: '♖',
    colorKey: 'blue',
    lessons: [
      'Forks & Double Attacks',
      'Pins & Skewers',
      'Discovered Attacks',
      'Back Rank Tactics',
      'Combinations Practice',
    ],
    completedLessons: 3,
    status: 'in-progress',
  },
  {
    id: 3,
    title: 'Strategy',
    description: 'Understand strategic principles and position planning.',
    icon: '♗',
    colorKey: 'violet',
    lessons: [
      'Pawn Structure Basics',
      'Open & Closed Positions',
      'Piece Coordination',
      'Weak Squares & Outposts',
      'Long-term Planning',
      'Prophylaxis',
    ],
    completedLessons: 0,
    status: 'locked',
  },
  {
    id: 4,
    title: 'Middlegame',
    description: 'Master middlegame plans, combinations and tactics.',
    icon: '♕',
    colorKey: 'amber',
    lessons: [
      'Attack & Defence Principles',
      'King Safety',
      'Pawn Breaks',
      'Piece Activity',
      'Calculation Techniques',
      'Typical Middlegame Plans',
    ],
    completedLessons: 0,
    status: 'locked',
  },
  {
    id: 5,
    title: 'Endgame',
    description: 'Learn endgame techniques and convert your advantage.',
    icon: '♔',
    colorKey: 'orange',
    lessons: [
      'King & Pawn Endgames',
      'Rook Endgames',
      'Minor Piece Endings',
      'Conversion Techniques',
      'Practical Endgame Skills',
    ],
    completedLessons: 0,
    status: 'locked',
  },
  {
    id: 6,
    title: 'Mastery',
    description: 'Advanced concepts and polishing your complete game.',
    icon: '🏆',
    colorKey: 'gray',
    lessons: [
      'Opening Repertoire Building',
      'Positional Sacrifices',
      'Complex Calculation',
      'Psychological Preparation',
      'Game Analysis & Improvement',
      'Tournament Preparation',
    ],
    completedLessons: 0,
    status: 'locked',
  },
]

const COLOR = {
  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500', node: 'bg-emerald-500 text-white', badge: 'bg-emerald-50 text-emerald-700', line: 'bg-emerald-400' },
  blue:    { bg: 'bg-blue-100',    text: 'text-blue-700',    bar: 'bg-blue-500',    node: 'bg-white text-blue-600 border-2 border-blue-400', badge: 'bg-blue-50 text-blue-700',    line: 'bg-blue-300'    },
  violet:  { bg: 'bg-violet-100',  text: 'text-violet-700',  bar: 'bg-violet-400',  node: 'bg-white text-violet-400 border-2 border-violet-300', badge: 'bg-violet-50 text-violet-600', line: 'bg-gray-200' },
  amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'bg-amber-400',   node: 'bg-white text-amber-500 border-2 border-amber-200',  badge: 'bg-amber-50 text-amber-700',  line: 'bg-gray-200'   },
  orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  bar: 'bg-orange-400',  node: 'bg-white text-orange-400 border-2 border-orange-200', badge: 'bg-orange-50 text-orange-700', line: 'bg-gray-200' },
  gray:    { bg: 'bg-gray-100',    text: 'text-gray-500',    bar: 'bg-gray-300',    node: 'bg-white text-gray-400 border-2 border-gray-200',    badge: 'bg-gray-100 text-gray-500',   line: 'bg-gray-200'   },
}

// ── Lesson drawer ─────────────────────────────────────────────────────────────

function LessonDrawer({ chapter, onClose }) {
  const c = COLOR[chapter.colorKey]
  const [active, setActive] = useState(null)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className={cn('px-6 py-5 flex items-center gap-4 shrink-0', c.bg)}>
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-[22px] shrink-0', 'bg-white/70')}>
            {chapter.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-[11px] font-bold uppercase tracking-wider', c.text)}>Chapter {chapter.id}</p>
            <h2 className="text-[18px] font-black text-gray-900">{chapter.title}</h2>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/60 hover:bg-white text-gray-600 flex items-center justify-center transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] text-gray-500 font-medium">{chapter.completedLessons}/{chapter.lessons.length} lessons</span>
            <span className={cn('text-[12px] font-bold', c.text)}>
              {Math.round((chapter.completedLessons / chapter.lessons.length) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', c.bar)}
              style={{ width: `${(chapter.completedLessons / chapter.lessons.length) * 100}%` }} />
          </div>
        </div>

        {/* Lessons list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {chapter.lessons.map((lesson, i) => {
            const isDone = i < chapter.completedLessons
            const isCurrent = i === chapter.completedLessons
            const isLocked = chapter.status === 'locked' || i > chapter.completedLessons

            return (
              <button key={i} onClick={() => !isLocked && setActive(i)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-4 rounded-2xl border text-left transition-all',
                  isDone   ? 'bg-emerald-50 border-emerald-100'
                  : isCurrent ? cn(c.bg, 'border-transparent')
                  : 'bg-gray-50 border-gray-100',
                  !isLocked && 'hover:shadow-sm',
                  active === i && 'ring-2 ring-brand-500/30'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[12px] font-black',
                  isDone    ? 'bg-emerald-500 text-white'
                  : isCurrent ? cn(c.bg.replace('100','200'), c.text)
                  : 'bg-gray-200 text-gray-400'
                )}>
                  {isDone ? <CheckCircle2 size={16} /> : isLocked ? <Lock size={12} /> : i + 1}
                </div>
                <span className={cn('flex-1 text-[13px] font-semibold',
                  isDone ? 'text-emerald-700' : isCurrent ? 'text-gray-900' : 'text-gray-400')}>
                  {lesson}
                </span>
                {isDone && <span className="text-[10px] font-bold text-emerald-500 shrink-0">Done</span>}
                {isCurrent && !isLocked && <ChevronRight size={14} className={c.text} />}
              </button>
            )
          })}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 border-t border-gray-100 shrink-0">
          {chapter.status === 'locked' ? (
            <div className="h-12 rounded-2xl bg-gray-100 flex items-center justify-center gap-2 text-gray-400 text-[13px] font-semibold">
              <Lock size={14} />Complete previous chapter to unlock
            </div>
          ) : chapter.status === 'completed' ? (
            <button className={cn('w-full h-12 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-colors', c.bg, c.text)}>
              <CheckCircle2 size={15} />Review Chapter
            </button>
          ) : (
            <button className="w-full h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20">
              Continue Learning <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

// ── Chapter row ───────────────────────────────────────────────────────────────

function ChapterRow({ chapter, index, total, onClick }) {
  const c = COLOR[chapter.colorKey]
  const pct = Math.round((chapter.completedLessons / chapter.lessons.length) * 100)
  const isLast = index === total - 1

  return (
    <div className="flex gap-0">
      {/* Timeline column */}
      <div className="flex flex-col items-center w-14 shrink-0">
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shrink-0 z-10',
          c.node
        )}>
          {chapter.status === 'completed' ? <CheckCircle2 size={18} /> : index + 1}
        </div>
        {!isLast && <div className={cn('w-0.5 flex-1 mt-1', chapter.status === 'completed' ? c.line : 'bg-gray-200')} style={{ minHeight: 40 }} />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4">
        <motion.button
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.07 }}
          onClick={onClick}
          className={cn(
            'w-full text-left rounded-[20px] border bg-white shadow-sm transition-all hover:shadow-md hover:scale-[1.005] overflow-hidden',
            chapter.status === 'in-progress' ? 'border-blue-200' : 'border-gray-200'
          )}
        >
          <div className="flex items-center gap-5 px-5 py-5">
            {/* Icon */}
            <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center text-[26px] shrink-0', c.bg)}>
              {chapter.icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-[16px] font-black text-gray-900">{chapter.title}</span>
                <span className={cn('px-2.5 py-0.5 rounded-full text-[11px] font-bold', c.badge)}>
                  {chapter.status === 'completed' ? 'Completed'
                    : chapter.status === 'in-progress' ? 'In Progress'
                    : 'Locked'}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 leading-relaxed">{chapter.description}</p>
            </div>

            {/* Progress */}
            <div className="hidden sm:block text-right shrink-0 w-36">
              <p className="text-[22px] font-black text-gray-900 leading-none">{pct}%</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{chapter.completedLessons} / {chapter.lessons.length} Lessons</p>
              <div className="h-1.5 rounded-full bg-gray-100 mt-2 overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', pct > 0 ? c.bar : 'bg-gray-200')} style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Action */}
            <div className="shrink-0 ml-2">
              {chapter.status === 'locked' ? (
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Lock size={15} className="text-gray-400" />
                </div>
              ) : chapter.status === 'completed' ? (
                <button className="h-10 px-4 rounded-xl border border-gray-300 text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                  Review <ChevronRight size={13} />
                </button>
              ) : (
                <button className="h-10 px-4 rounded-xl bg-brand-600 text-white text-[12px] font-bold hover:bg-brand-700 transition-colors flex items-center gap-1.5 shadow-lg shadow-brand-500/20">
                  Continue <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Mobile progress bar */}
          {chapter.status !== 'locked' && (
            <div className="sm:hidden h-1 bg-gray-100">
              <div className={cn('h-full', c.bar)} style={{ width: `${pct}%` }} />
            </div>
          )}
        </motion.button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LearnPage({ chapters: propChapters }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('roadmap')
  const [selectedChapter, setSelectedChapter] = useState(null)

  const chapters = propChapters || SAMPLE_CHAPTERS

  const totalLessons     = chapters.reduce((a, c) => a + c.lessons.length, 0)
  const completedLessons = chapters.reduce((a, c) => a + c.completedLessons, 0)
  const overallPct       = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="bg-[#f5f6fa]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-4 pb-6 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[24px] border border-gray-200 shadow-sm px-7 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-black text-gray-900">Learning Roadmap</h1>
              <p className="text-[13px] text-gray-400 mt-0.5">Step by step path to become a complete chess player.</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Overall Progress</p>
              <p className="text-[32px] font-black text-gray-900 leading-none">{overallPct}%</p>
              <p className="text-[11px] text-gray-400 mt-1">{completedLessons} of {totalLessons} completed</p>
              <div className="h-1.5 w-40 rounded-full bg-gray-100 mt-2 ml-auto overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 border-b border-gray-100">
            {[['roadmap', 'My Roadmap'], ['explore', 'Explore All Paths']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn(
                  'relative px-4 py-2.5 text-[13px] font-bold transition-colors pb-3',
                  tab === id ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                )}>
                {label}
                {tab === id && (
                  <motion.span layoutId="learn-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chapter list */}
        <div className="space-y-0">
          {chapters.map((chapter, i) => (
            <ChapterRow
              key={chapter.id}
              chapter={chapter}
              index={i}
              total={chapters.length}
              onClick={() => setSelectedChapter(chapter)}
            />
          ))}
        </div>

        {/* Footer tip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl px-6 py-4">
          <div className="text-2xl shrink-0">🏆</div>
          <div>
            <p className="text-[14px] font-black text-gray-900">Stay consistent!</p>
            <p className="text-[12px] text-gray-500">Complete lessons, practice regularly and track your progress.</p>
          </div>
          <button className="ml-auto h-9 px-5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-bold flex items-center gap-1.5 shrink-0 transition-colors">
            <BookOpen size={13} />View My Progress
          </button>
        </motion.div>
      </div>

      {/* Lesson drawer */}
      <AnimatePresence>
        {selectedChapter && (
          <LessonDrawer chapter={selectedChapter} onClose={() => setSelectedChapter(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
