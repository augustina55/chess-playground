import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Plus, BookOpen, ChevronLeft, Trash2, Calendar, User,
  Clock3, Layers3, FileText,
  Clock, Check, X, ArrowRight, ChevronRight, TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BOARD_THEMES } from "../lib/boardThemes";
import { cn } from "../lib/utils";
import {
  getHomework, getHomeworkForBatch, getHomeworkByAcademy,
  createHomework, deleteHomework,
  getBatches, getPgns, getPuzzlesByPgnId,
  getProfiles, getProfilesByAcademy, getAcademies,
  getHomeworkProgress, saveHomeworkPuzzleResult,
  getAllHomeworkProgressForStudent, getFullHomeworkProgressForStudent,
} from "../lib/db";

const inputCls =
  "w-full h-14 rounded-2xl border border-gray-200 bg-white px-5 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

function Field({ label, children }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}

// ── trim solution so it always ends on the player's move ─────────────────────

function trimSolution(sol) {
  return sol.length % 2 === 0 ? sol.slice(0, -1) : [...sol];
}

// ── board helpers ─────────────────────────────────────────────────────────────

function computeSquareStyles(square, currentFen) {
  const game  = new Chess(currentFen);
  const moves = game.moves({ square, verbose: true });
  const styles = { [square]: { backgroundColor: "rgba(234,88,12,0.55)" } };
  moves.forEach(m => {
    styles[m.to] = { backgroundColor: game.get(m.to) ? "rgba(234,88,12,0.40)" : "rgba(0,0,0,0.18)" };
  });
  return styles;
}

// ── Ring progress ─────────────────────────────────────────────────────────────

function RingProgress({ done, total }) {
  const pct  = total ? Math.round((done / total) * 100) : 0;
  const r    = 38;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#16a34a" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (circ * pct / 100)}
          style={{ transition: "stroke-dashoffset 0.5s ease" }} />
      </svg>
      <div className="relative text-center">
        <p className="text-[18px] font-black text-gray-900 leading-none">{pct}%</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{done}/{total}</p>
      </div>
    </div>
  );
}

// ── Puzzle circle pagination helper ──────────────────────────────────────────

function getCircleItems(total, current) {
  if (total === 0) return [];
  if (total <= 10) return Array.from({ length: total }, (_, i) => i);
  const W = 8;
  let start = Math.max(0, Math.min(current - Math.floor(W / 2), total - W - 1));
  let end   = Math.min(start + W - 1, total - 2);
  start = Math.max(0, end - W + 1);
  const items = [];
  if (start > 0) { items.push(0); items.push("ldots"); }
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) { items.push("rdots"); items.push(total - 1); }
  return items;
}

// ── HW Player ─────────────────────────────────────────────────────────────────

function HWPlayer({ hw, onBack }) {
  const { user }   = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

  const [puzzles,   setPuzzles]   = useState([]);
  const [puzzlesOk, setPuzzlesOk] = useState(false);

  const [idx,          setIdx]          = useState(0);
  const [fen,          setFen]          = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [orientation,  setOrientation]  = useState("white");
  const [solution,     setSolution]     = useState([]);
  const [solutionStep, setSolutionStep] = useState(0);
  const [feedback,     setFeedback]     = useState("Loading puzzles…");
  const [selectedSq,   setSelectedSq]   = useState(null);
  const [sqStyles,     setSqStyles]     = useState({});
  const [showHint,     setShowHint]     = useState(false);
  const [jumpToNext,   setJumpToNext]   = useState(false);
  const [correctSet,   setCorrectSet]   = useState(new Set());
  const [wrongMap,     setWrongMap]     = useState({});
  const [times,        setTimes]        = useState([]);
  const [saveError,    setSaveError]    = useState(null);
  const startRef      = useRef(Date.now());
  const processingRef = useRef(false);
  const posListRef    = useRef(null);
  // keep a stable ref of wrongMap for use inside async save callbacks
  const wrongMapRef   = useRef({});
  useEffect(() => { wrongMapRef.current = wrongMap; }, [wrongMap]);

  // Load puzzles + existing progress together
  useEffect(() => {
    if (!hw.pgnId) { setPuzzlesOk(true); setFeedback("No PGN attached."); return; }

    const progressPromise = (user?.id && hw.id)
      ? getHomeworkProgress(hw.id, user.id)
      : Promise.resolve([]);

    Promise.all([getPuzzlesByPgnId(hw.pgnId), progressPromise]).then(([p, progress]) => {
      setPuzzles(p);

      // Restore saved progress
      const solvedIds  = new Set(progress.filter(r => r.solved).map(r => r.puzzleId));
      const wrongCounts = {};
      progress.forEach(r => { if (r.wrongCount > 0) wrongCounts[r.puzzleId] = r.wrongCount; });
      setCorrectSet(solvedIds);
      setWrongMap(wrongCounts);
      wrongMapRef.current = wrongCounts;

      if (p.length > 0) {
        // Resume at first unsolved puzzle (or 0 if all done)
        const firstUnsolved = p.findIndex(pzl => !solvedIds.has(pzl.id));
        const startIdx = firstUnsolved >= 0 ? firstUnsolved : 0;
        setIdx(startIdx);
        setFen(p[startIdx].fen);
        setOrientation(new Chess(p[startIdx].fen).turn() === "b" ? "black" : "white");
        setSolution(trimSolution(p[startIdx].solution));
        setFeedback(
          solvedIds.size === p.length
            ? "All done! Great work."
            : firstUnsolved > 0
              ? `Resuming from puzzle ${firstUnsolved + 1}`
              : "Find the best move!"
        );
      } else {
        setFeedback("No puzzles in this PGN.");
      }
      setPuzzlesOk(true);
    });
  }, [hw.pgnId, hw.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadPuzzle(i) {
    processingRef.current = false;
    const pzl = puzzles[i];
    if (!pzl) return;
    setIdx(i);
    setFen(pzl.fen);
    setOrientation(new Chess(pzl.fen).turn() === "b" ? "black" : "white");
    setSolution(trimSolution(pzl.solution));
    setSolutionStep(0);
    setFeedback("Find the best move!");
    setSelectedSq(null);
    setSqStyles({});
    setShowHint(false);
    startRef.current = Date.now();
    setTimeout(() => {
      const el = posListRef.current?.querySelector(`[data-idx="${i}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }

  useEffect(() => { setSelectedSq(null); setSqStyles({}); setShowHint(false); }, [fen]);

  const hintStyles = showHint && solution[solutionStep] ? (() => {
    const uci = solution[solutionStep];
    return {
      [uci.slice(0, 2)]: { backgroundColor: "rgba(234, 197, 0, 0.7)" },
      [uci.slice(2, 4)]: { backgroundColor: "rgba(234, 197, 0, 0.5)" },
    };
  })() : {};

  const mergedStyles = { ...sqStyles, ...hintStyles };

  function handleMove(from, to) {
    if (processingRef.current || !puzzlesOk || !puzzles.length || !fen || !solution.length) return "invalid";
    const testGame = new Chess(fen);
    let testMove;
    try { testMove = testGame.move({ from, to, promotion: "q" }); } catch { testMove = null; }
    if (!testMove) return "invalid";

    const uci      = from + to;
    const expected = solution[solutionStep].slice(0, 4);
    const pzlId    = puzzles[idx]?.id;

    if (uci !== expected) {
      setWrongMap(prev => ({ ...prev, [pzlId]: (prev[pzlId] || 0) + 1 }));
      setFeedback("Wrong! Try again.");
      return "wrong";
    }

    const game = new Chess(fen);
    let move;
    try { move = game.move({ from, to, promotion: solution[solutionStep][4] || "q" }); } catch { return "invalid"; }
    if (!move) return "invalid";

    const newFen   = game.fen();
    const nextStep = solutionStep + 1;

    if (nextStep >= solution.length) {
      setFen(newFen);
      const elapsed = Math.round((Date.now() - startRef.current) / 1000);
      setTimes(prev => [...prev, elapsed]);
      setCorrectSet(prev => new Set([...prev, pzlId]));
      setFeedback("Correct! ✓");

      // Persist progress to DB
      if (user?.id && hw.id && pzlId) {
        saveHomeworkPuzzleResult(hw.id, user.id, pzlId, {
          solved:      true,
          wrongCount:  wrongMapRef.current[pzlId] || 0,
          timeSeconds: elapsed,
        }).catch(err => {
          console.error('[HWPlayer] save failed:', err);
          setSaveError(err?.message || 'Progress could not be saved');
        });
      }

      if (jumpToNext && idx < puzzles.length - 1) {
        setTimeout(() => loadPuzzle(idx + 1), 800);
      }
      return "correct";
    }

    setFen(newFen);
    setFeedback("Good! Keep going...");
    processingRef.current = true;
    setTimeout(() => {
      const opp = solution[nextStep];
      const g2 = new Chess(newFen);
      let oppOk = false;
      try { oppOk = !!g2.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || "q" }); } catch {}
      setFen(oppOk ? g2.fen() : newFen);
      setSolutionStep(oppOk ? nextStep + 1 : nextStep);
      processingRef.current = false;
    }, 400);
    return "correct";
  }

  function clearSel() { setSelectedSq(null); setSqStyles({}); }

  function onDrop({ sourceSquare, targetSquare }) {
    clearSel();
    return handleMove(sourceSquare, targetSquare) === "correct";
  }

  function onSquareClick({ square }) {
    if (selectedSq) {
      if (selectedSq === square) { clearSel(); return; }
      const r = handleMove(selectedSq, square);
      clearSel();
      if (r === "invalid") {
        const g = new Chess(fen);
        const p = g.get(square);
        if (p && p.color === g.turn()) {
          setSelectedSq(square);
          setSqStyles(computeSquareStyles(square, fen));
        }
      }
      return;
    }
    const g = new Chess(fen);
    const p = g.get(square);
    if (p && p.color === g.turn()) {
      setSelectedSq(square);
      setSqStyles(computeSquareStyles(square, fen));
    }
  }

  const done       = correctSet.size;
  const total      = puzzles.length;
  const wrongTotal = Object.values(wrongMap).reduce((a, b) => a + b, 0);

  const feedbackType = feedback.includes("Correct") || feedback.includes("Good") || feedback.includes("✓")
    ? "good" : feedback.includes("Wrong") ? "bad" : "neutral";

  const circleItems = getCircleItems(total, idx);

  return (
    <div className="flex flex-col bg-white overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>

      {saveError && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-[12px] font-medium">
          <X size={13} strokeWidth={3} className="shrink-0" />
          <span>Progress not saved: {saveError}. Open browser console (F12) for details. Make sure the DB migration (supabase/schema.sql) has been run in Supabase.</span>
          <button onClick={() => setSaveError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600"><X size={13} /></button>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex flex-col lg:flex-row flex-1 gap-4 p-4 overflow-hidden" style={{ minHeight: 0 }}>

        {/* Board column */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden">
          <div style={{ width: "min(70%, calc(100vh - 140px))", maxWidth: "min(70%, calc(100vh - 140px))" }}>
            <div className="overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <Chessboard options={{
                position: fen,
                boardOrientation: orientation,
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                allowDragging: puzzlesOk && puzzles.length > 0,
                canDragPiece: ({ piece }) => piece.pieceType?.[0] === new Chess(fen).turn(),
                squareStyles: mergedStyles,
                darkSquareStyle:  { backgroundColor: boardTheme.dark },
                lightSquareStyle: { backgroundColor: boardTheme.light },
                boardStyle: { borderRadius: 0 },
              }} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-4 overflow-y-auto">

          {/* ── Stats card ── */}
          <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-[15px] font-black text-gray-900">{hw.id}</span>
                  <span className="text-[12px] text-gray-400">{total} positions</span>
                </div>
                <div className="flex gap-8">
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1">Correct</p>
                    <p className="text-[34px] font-black text-emerald-500 leading-none">{done}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1">Wrong</p>
                    <p className="text-[34px] font-black text-red-500 leading-none">{wrongTotal}</p>
                  </div>
                </div>
              </div>
              <RingProgress done={done} total={total} />
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <span className="text-[13px] text-gray-600 font-medium">Auto open next puzzle</span>
              <button type="button" onClick={() => setJumpToNext(v => !v)}
                className={cn("w-12 h-6 rounded-full transition-all flex items-center px-0.5 shrink-0",
                  jumpToNext ? "bg-emerald-500 justify-end" : "bg-gray-200 justify-start")}>
                <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>

          {/* ── Feedback + puzzle circles card ── */}
          <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5 flex flex-col gap-5">

            {/* Feedback area */}
            <div className="flex flex-col items-center py-5 border-b border-gray-100">
              <AnimatePresence mode="wait">
                <motion.div key={feedbackType}
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.18 }}
                  className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-14 h-14 rounded-full border-2 flex items-center justify-center mb-1",
                    feedbackType === "good" ? "border-emerald-500 text-emerald-500 bg-emerald-50"
                    : feedbackType === "bad" ? "border-red-500 text-red-500 bg-red-50"
                    : "border-gray-200 text-gray-400 bg-gray-50"
                  )}>
                    {feedbackType === "good" ? <Check size={26} strokeWidth={3} />
                    : feedbackType === "bad"  ? <X    size={26} strokeWidth={3} />
                    : <span className="text-[22px] leading-none">♟</span>}
                  </div>
                  <p className={cn("text-[22px] font-black leading-tight",
                    feedbackType === "good" ? "text-gray-900"
                    : feedbackType === "bad" ? "text-red-600"
                    : "text-gray-700")}>
                    {feedbackType === "good" ? "Correct !!"
                    : feedbackType === "bad" ? "Wrong!"
                    : "Your turn"}
                  </p>
                  <p className="text-[12px] text-gray-400">
                    {feedbackType === "good" ? "Great job! Keep it up."
                    : feedbackType === "bad" ? "Try again."
                    : "Find the best move!"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Puzzle circles */}
            <div>
              <p className="text-[12px] font-bold text-gray-500 mb-3">Puzzles</p>
              {!puzzlesOk ? (
                <p className="text-[12px] text-gray-400">Loading…</p>
              ) : (
                <div className="flex flex-wrap gap-2 items-center">
                  {circleItems.map((item, ki) => {
                    if (typeof item === "string") {
                      return <span key={item + ki} className="text-[13px] text-gray-300 font-bold px-0.5">...</span>;
                    }
                    const pzl       = puzzles[item];
                    const isCurrent = item === idx;
                    const isSolved  = correctSet.has(pzl?.id);
                    const hasWrong  = pzl && (wrongMap[pzl.id] || 0) > 0;
                    return (
                      <button key={item} type="button" onClick={() => loadPuzzle(item)}
                        className={cn(
                          "w-9 h-9 rounded-full text-[12px] font-black transition-all flex items-center justify-center shrink-0",
                          isSolved  ? "bg-emerald-500 text-white"
                          : isCurrent ? "bg-gray-900 text-white"
                          : hasWrong  ? "border-2 border-red-300 text-red-500"
                          : "border-2 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700"
                        )}>
                        {item + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Next button */}
            <button
              type="button"
              onClick={() => loadPuzzle(Math.min(idx + 1, puzzles.length - 1))}
              disabled={idx >= puzzles.length - 1}
              className="w-full h-12 rounded-2xl bg-[#f97316] hover:bg-[#ea6c00] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20">
              Next <ArrowRight size={16} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Batch-code combobox ───────────────────────────────────────────────────────

function BatchCodeInput({ value, onChange, batchCodes, students }) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    if (!value) return batchCodes;
    return batchCodes.filter(c => c.toLowerCase().includes(value.toLowerCase()));
  }, [batchCodes, value]);

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={batchCodes.length ? "Select or type a batch code…" : "e.g. BEG1"}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
          {filtered.map(code => {
            const count = students.filter(s => s.batchCode === code).length;
            return (
              <button key={code} type="button"
                onMouseDown={() => { onChange(code); setOpen(false); }}
                className="w-full px-5 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0 transition-colors">
                <span className="text-[13px] font-bold text-gray-800">{code}</span>
                <span className="text-[11px] text-gray-400">{count} student{count !== 1 ? "s" : ""}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Weekly progress SVG chart ─────────────────────────────────────────────────

function WeeklyChart({ days, counts }) {
  const W = 290, H = 110, PL = 24, PR = 8, PT = 8, PB = 20;
  const iW = W - PL - PR, iH = H - PT - PB;
  const maxVal = Math.max(...counts, 1);
  const pts = counts.map((c, i) => ({
    x: PL + (i / (days.length - 1)) * iW,
    y: PT + iH - (c / maxVal) * iH,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = [`M${pts[0].x},${PT + iH}`, ...pts.map(p => `L${p.x},${p.y}`), `L${pts[pts.length-1].x},${PT + iH}`, 'Z'].join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="hwChartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PT + iH - f * iH;
        return <line key={i} x1={PL} y1={y} x2={W - PR} y2={y} stroke="#f3f4f6" strokeWidth="1" />;
      })}
      <path d={area} fill="url(#hwChartGrad)" />
      <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="#f97316" stroke="white" strokeWidth="1.5" />)}
      {days.map((d, i) => <text key={d} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize="8.5" fill="#9ca3af">{d}</text>)}
    </svg>
  );
}

// ── Student Homework View (redesigned) ────────────────────────────────────────

const STATUS_CFG = {
  'completed':   { label: 'Completed',   cls: 'bg-emerald-50 text-emerald-600 border border-emerald-100' },
  'in-progress': { label: 'In Progress', cls: 'bg-orange-50  text-orange-500  border border-orange-100'  },
  'not-started': { label: 'Not Started', cls: 'bg-purple-50  text-purple-500  border border-purple-100'  },
  'overdue':     { label: 'Overdue',     cls: 'bg-red-50     text-red-500     border border-red-100'     },
};

function timeAgo(date) {
  if (!date) return '';
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StudentHomeworkView({ homework, progressMap, allProgress, onOpen }) {
  const [tab,         setTab]         = useState('all');
  const [batchFilter, setBatchFilter] = useState('');
  const [sortBy,      setSortBy]      = useState('newest');

  function getStatus(hw) {
    const p    = progressMap[hw.id];
    const total  = p?.total  || 0;
    const solved = p?.solved || 0;
    const overdue = hw.dueDate && new Date(hw.dueDate) < new Date();
    if (total > 0 && solved >= total) return 'completed';
    if (solved > 0) return overdue ? 'overdue' : 'in-progress';
    if (overdue && total > 0) return 'overdue';
    return 'not-started';
  }

  // Weekly chart data (Mon–Sun of current week)
  const weeklyData = useMemo(() => {
    const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const counts = new Array(7).fill(0);
    const now = new Date();
    const diffToMon = now.getDay() === 0 ? -6 : 1 - now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diffToMon);
    startOfWeek.setHours(0, 0, 0, 0);
    allProgress.filter(r => r.solved).forEach(r => {
      const d = new Date(r.updated_at);
      if (d >= startOfWeek) counts[(d.getDay() + 6) % 7]++;
    });
    return { days: DAYS, counts };
  }, [allProgress]);

  const weeklySolved     = weeklyData.counts.reduce((a, b) => a + b, 0);
  const totalTimeSecs    = allProgress.filter(r => r.solved).reduce((a, r) => a + (r.time_seconds || 0), 0);
  const timeH            = Math.floor(totalTimeSecs / 3600);
  const timeM            = Math.floor((totalTimeSecs % 3600) / 60);

  // Recent activity: latest interaction per homework
  const recentActivity = useMemo(() => {
    const byHw = {};
    allProgress.filter(r => r.solved).forEach(r => {
      const d = new Date(r.updated_at);
      if (!byHw[r.homework_id] || d > byHw[r.homework_id].latest) {
        byHw[r.homework_id] = { count: (byHw[r.homework_id]?.count || 0) + 1, latest: d };
      } else {
        byHw[r.homework_id].count++;
      }
    });
    return Object.entries(byHw)
      .map(([hwId, { count, latest }]) => {
        const hw  = homework.find(h => h.id === hwId);
        const p   = progressMap[hwId];
        return { hwId, title: hw?.title || hwId, count, isCompleted: p && count >= p.total, latest };
      })
      .sort((a, b) => b.latest - a.latest)
      .slice(0, 4);
  }, [allProgress, homework, progressMap]);

  // Batch codes for filter dropdown
  const batchCodes = [...new Set(homework.map(h => h.batchName).filter(Boolean))];

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = homework.filter(hw => {
      if (batchFilter && hw.batchName !== batchFilter) return false;
      const s = getStatus(hw);
      if (tab === 'in-progress') return s === 'in-progress';
      if (tab === 'completed')   return s === 'completed';
      if (tab === 'overdue')     return s === 'overdue' || s === 'not-started' && hw.dueDate && new Date(hw.dueDate) < new Date();
      return true;
    });
    if (sortBy === 'due-soon') list = [...list].sort((a, b) => {
      if (!a.dueDate) return 1; if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
    return list;
  }, [homework, tab, batchFilter, sortBy, progressMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    { id: 'all',         label: 'All Homework' },
    { id: 'in-progress', label: 'In Progress'  },
    { id: 'completed',   label: 'Completed'    },
    { id: 'overdue',     label: 'Overdue'      },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-5 md:p-7">

      {/* ── Two-column layout ── */}
      <div className="flex gap-5 items-start">

        {/* ── Left: list ── */}
        <div className="flex-1 min-w-0">

          {/* Tabs + filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 px-2 py-2 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-0.5">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all",
                    tab === t.id ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"
                  )}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {batchCodes.length > 1 && (
                <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}
                  className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 outline-none">
                  <option value="">All Batches</option>
                  {batchCodes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="h-8 px-2 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-600 outline-none">
                <option value="newest">Sort: Newest</option>
                <option value="due-soon">Sort: Due Soon</option>
              </select>
            </div>
          </div>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Homework Assignments</p>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 text-[14px] border border-gray-100">
                No homework here yet.
              </div>
            ) : filtered.map((hw, i) => {
              const p      = progressMap[hw.id];
              const solved = p?.solved || 0;
              const total  = p?.total  || 0;
              const pct    = total > 0 ? Math.round((solved / total) * 100) : 0;
              const status = getStatus(hw);
              const st     = STATUS_CFG[status];
              const overdue = status === 'overdue' || (hw.dueDate && new Date(hw.dueDate) < new Date() && status !== 'completed');
              return (
                <motion.div key={hw.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => onOpen(hw)}
                  className={cn(
                    "bg-white rounded-2xl p-5 cursor-pointer hover:shadow-md transition-all border",
                    status === 'in-progress' ? "border-orange-200" : "border-gray-100"
                  )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[11px] font-bold text-orange-500 mb-1">{hw.id}</span>
                      <h3 className="text-[16px] font-bold text-gray-900 mb-2 leading-tight">{hw.title}</h3>
                      <div className="flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1 text-[12px] text-gray-500">
                          <Layers3 size={11} />{hw.batchName || '—'}
                        </span>
                        <span className="flex items-center gap-1 text-[12px] text-gray-500">
                          <User size={11} />{hw.assignedBy || '—'}
                        </span>
                      </div>
                      {total > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: status === 'completed' ? '#22c55e' : '#f97316' }} />
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">{solved}/{total} solved</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 pt-0.5">
                      {hw.dueDate && (
                        <span className={cn("flex items-center gap-1 text-[11px] font-medium whitespace-nowrap",
                          overdue ? "text-red-500" : "text-gray-400")}>
                          <Calendar size={10} />{hw.dueDate}
                        </span>
                      )}
                      <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap", st.cls)}>
                        {st.label}
                      </span>
                      <ChevronRight size={15} className="text-gray-300 mt-1" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="w-[268px] shrink-0 space-y-4">

          {/* Weekly Progress */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-bold text-gray-900">Weekly Progress</h3>
              <span className="text-[10px] text-gray-400 border border-gray-200 rounded-lg px-2 py-1">This Week</span>
            </div>
            <WeeklyChart days={weeklyData.days} counts={weeklyData.counts} />
            <div className="flex gap-6 mt-3 pt-3 border-t border-gray-50">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Solved</p>
                <p className="text-[22px] font-black text-emerald-500 leading-tight">{weeklySolved}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Time Spent</p>
                <p className="text-[22px] font-black text-gray-900 leading-tight">
                  {timeH > 0 ? `${timeH}h ` : ''}{timeM}m
                </p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-[14px] font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      act.isCompleted ? "bg-emerald-50" : "bg-blue-50")}>
                      {act.isCompleted
                        ? <Check size={13} className="text-emerald-500" strokeWidth={3} />
                        : <Clock size={13} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 leading-snug">
                        {act.isCompleted
                          ? `Completed ${act.hwId}`
                          : `Solved ${act.count} puzzle${act.count !== 1 ? 's' : ''} in ${act.hwId}`}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(act.latest)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <div className="flex items-start gap-3">
              <span className="text-[20px] mt-0.5">💡</span>
              <div>
                <h3 className="text-[13px] font-bold text-amber-900 mb-1">Tips</h3>
                <p className="text-[12px] text-amber-700 leading-relaxed">
                  Solve regularly to improve consistently. Review solutions after each puzzle to learn faster!
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main HomeworkPage ─────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const { user } = useAuth();

  const [homework,    setHomework]    = useState([]);
  const [batches,     setBatches]     = useState([]);
  const [pgns,        setPgns]        = useState([]);
  const [students,    setStudents]    = useState([]);
  const [view,        setView]        = useState("list");
  const [activeHw,    setActiveHw]    = useState(null);
  const [form,        setForm]        = useState({ title: "", batchCode: "", pgnId: "", dueDate: "", notes: "" });
  // { hwId → { solved: number, total: number } } — student progress summary per homework
  const [progressMap, setProgressMap] = useState({});
  // full raw progress rows (for weekly chart + recent activity)
  const [allProgress, setAllProgress]  = useState([]);
  // bump this to re-fetch progress after returning from the player
  const [progressKey, setProgressKey] = useState(0);

  useEffect(() => {
    async function load() {
      const [b, p, academies] = await Promise.all([getBatches(), getPgns(), getAcademies()]);
      setBatches(b);
      setPgns(p);

      let acadId = null;
      if (user?.role === "coach") {
        const ac = academies.find(a => String(a.mainCoachId) === String(user?.id));
        acadId = ac?.id || null;
      } else if (user?.role === "student") {
        acadId = user?.academyId || null;
      }

      // Homework: students see only their batch; coaches see their academy's; admin sees all
      let hw;
      if (user?.role === "student") {
        hw = user?.batchCode ? await getHomeworkForBatch(user.batchCode) : [];
      } else if (acadId) {
        hw = await getHomeworkByAcademy(acadId);
      } else {
        hw = await getHomework();
      }
      setHomework(hw);

      // Students list (for batch code combobox — coaches only)
      if (user?.role !== "student") {
        const profiles = acadId
          ? await getProfilesByAcademy(acadId)
          : await getProfiles();
        setStudents(profiles.filter(pr => pr.role === "student"));
      }
    }
    load();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh progress — runs on initial load and after returning from player
  useEffect(() => {
    if (user?.role !== "student" || !user?.id || homework.length === 0) return;
    getFullHomeworkProgressForStudent(user.id).then(rows => {
      setAllProgress(rows);
      const map = {};
      homework.forEach(h => {
        const total = pgns.find(pgn => pgn.id === h.pgnId)?.puzzleCount || 0;
        const solved = rows.filter(r => r.homework_id === h.id && r.solved).length;
        if (total > 0) map[h.id] = { solved, total };
      });
      setProgressMap(map);
    });
  }, [homework, pgns, progressKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const batchCodes = useMemo(() => {
    const codes = students.map(s => s.batchCode).filter(Boolean);
    return [...new Set(codes)].sort();
  }, [students]);

  async function assign(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.batchCode.trim()) return;
    const pgn = pgns.find(p => p.id === form.pgnId);
    const id  = `HW-${String(homework.length + 1).padStart(3, "0")}`;

    // resolve academyId for the coach
    let acadId = null;
    if (user?.role === "coach") {
      const academies = await getAcademies();
      const ac = academies.find(a => String(a.mainCoachId) === String(user?.id));
      acadId = ac?.id || null;
    }

    const created = await createHomework({
      id, title: form.title,
      batchId: form.batchCode, batchName: form.batchCode,
      pgnId: form.pgnId, pgnName: pgn?.name || "—",
      dueDate: form.dueDate, notes: form.notes,
      assignedBy: user?.name,
      academyId: acadId,
    });
    setHomework(prev => [created, ...prev]);
    setForm({ title: "", batchCode: "", pgnId: "", dueDate: "", notes: "" });
    setView("list");
  }

  async function handleDelete(id) {
    await deleteHomework(id);
    setHomework(prev => prev.filter(h => h.id !== id));
  }

  // ── Homework player ─────────────────────────────────────────────────────────
  if (activeHw) {
    return <HWPlayer hw={activeHw} onBack={() => { setActiveHw(null); setProgressKey(k => k + 1); }} />;
  }

  // ── Assign form ─────────────────────────────────────────────────────────────
  if (view === "assign") {
    return (
      <div className="min-h-screen bg-[#f6f8fc] p-5 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setView("list")}
              className="w-12 h-12 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">Assign Homework</h1>
              <p className="text-sm text-gray-400 mt-1">Create chess assignments for students</p>
            </div>
          </div>
          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onSubmit={assign}
            className="bg-white border border-gray-200 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
            <Field label="Homework Title">
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Opening Principles – Week 1" autoFocus />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Batch Code">
                <BatchCodeInput
                  value={form.batchCode}
                  onChange={v => setForm(f => ({ ...f, batchCode: v }))}
                  batchCodes={batchCodes}
                  students={students}
                />
              </Field>
              <Field label="Attach PGN">
                <select className={inputCls} value={form.pgnId} onChange={e => setForm(f => ({ ...f, pgnId: e.target.value }))}>
                  <option value="">No PGN</option>
                  {pgns.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Due Date">
              <input type="date" className={inputCls} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </Field>
            <Field label="Instructions">
              <textarea rows={4} className={cn(inputCls, "h-auto py-4 resize-none")} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add notes or instructions for students..." />
            </Field>
            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setView("list")}
                className="flex-1 h-14 rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-500/20 transition-all">
                Assign Homework
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    );
  }

  // ── Student view — redesigned ───────────────────────────────────────────────
  if (user?.role === "student") {
    return (
      <StudentHomeworkView
        homework={homework}
        progressMap={progressMap}
        allProgress={allProgress}
        onOpen={setActiveHw}
      />
    );
  }

  // ── List view (coach / admin) ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        <div className="flex justify-end mb-6">
          <button onClick={() => setView("assign")}
            className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold shadow-lg shadow-brand-500/20 transition-all">
            <Plus size={15} />Create Homework
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {[
            { label: "Total Homework", value: homework.length, icon: BookOpen,  color: "text-brand-600",   bg: "bg-brand-500/10" },
            { label: "Active Batches",  value: batches.length,  icon: Layers3,  color: "text-violet-500",  bg: "bg-violet-500/10" },
            { label: "PGN Library",     value: pgns.length,     icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-[28px] bg-white border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400 font-medium">{label}</p>
                  <h3 className="text-3xl font-black text-gray-900 mt-1">{value}</h3>
                </div>
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", bg)}>
                  <Icon className={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {homework.length === 0 ? (
          <div className="rounded-[32px] bg-white border border-gray-200 py-24 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-[24px] bg-brand-500/10 flex items-center justify-center mb-5">
              <BookOpen size={34} className="text-brand-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">No Homework Yet</h3>
            <p className="text-gray-400 mt-2 max-w-md">Create assignments for your students.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {homework.map((hw, i) => (
              <motion.div key={hw.id}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setActiveHw(hw)}
                className="group relative overflow-hidden rounded-[28px] bg-white border border-gray-200 p-6 shadow-sm hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all cursor-pointer">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-brand-400" />

                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-[11px] font-bold mb-2">{hw.id}</span>
                    <h3 className="text-[18px] font-black text-gray-900 leading-tight truncate">{hw.title}</h3>
                  </div>
                  {user?.role !== "student" && (
                    <button onClick={e => { e.stopPropagation(); handleDelete(hw.id); }}
                      className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all shrink-0">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wide mb-1">
                      <Layers3 size={11} />Batch
                    </div>
                    <p className="font-bold text-gray-800 text-[13px] truncate">{hw.batchName}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold uppercase tracking-wide mb-1">
                      <Clock3 size={11} />Due
                    </div>
                    <p className="font-bold text-gray-800 text-[13px]">{hw.dueDate || "—"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {hw.pgnId && (
                    <span className="px-3 py-1 rounded-xl bg-violet-50 text-violet-600 text-[11px] font-semibold">{hw.pgnName}</span>
                  )}
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-400">
                    <User size={12} />{hw.assignedBy}
                  </span>
                  {user?.role === "student" && progressMap[hw.id] && (
                    progressMap[hw.id].solved >= progressMap[hw.id].total
                      ? (
                        <span className="ml-auto flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-600 text-[11px] font-bold">
                          <Check size={11} strokeWidth={3} /> Done
                        </span>
                      ) : progressMap[hw.id].solved > 0 ? (
                        <span className="ml-auto px-3 py-1 rounded-xl bg-orange-50 text-orange-600 text-[11px] font-bold">
                          {progressMap[hw.id].solved}/{progressMap[hw.id].total} solved
                        </span>
                      ) : null
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
