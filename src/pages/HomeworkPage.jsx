import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Plus, BookOpen, ChevronLeft, Trash2, Calendar, User,
  Clock3, Layers3, FileText, Lightbulb, SkipForward,
  Clock, Check, X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BOARD_THEMES } from "../lib/boardThemes";
import { cn } from "../lib/utils";

// ── storage ───────────────────────────────────────────────────────────────────

function useSaved(key, def = []) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

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

// ── load puzzles for a homework ───────────────────────────────────────────────

function loadHwPuzzles(pgnId) {
  if (!pgnId) return [];
  try {
    const cached = JSON.parse(localStorage.getItem("ca_puzzles") || "[]").filter(p => p.pgnId === pgnId);
    if (cached.length > 0) return cached;
    // Fallback: parse from raw content
    const pgn = JSON.parse(localStorage.getItem("ca_pgns") || "[]").find(p => p.id === pgnId);
    if (!pgn?.content) return [];
    return parsePgnContent(pgnId, pgn.content);
  } catch { return []; }
}

function parsePgnContent(pgnId, content) {
  const puzzles = [];
  const games = content.split(/(?=\[Event\s)/g).filter(g => g.trim().length > 10);
  games.forEach((g, i) => {
    try {
      const fenMatch = g.match(/\[FEN\s+"([^"]+)"\]/);
      const fen = fenMatch ? fenMatch[1] : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const chess = new Chess();
      chess.loadPgn(g);
      const history = chess.history({ verbose: true });
      if (!history.length) return;
      const solution = history.map(m => m.from + m.to + (m.promotion || ""));
      const nameMatch = g.match(/\[(?:ChapterName|Event)\s+"([^"]+)"\]/);
      puzzles.push({ id: `${pgnId}-g${i}`, pgnId, fen, solution, name: nameMatch?.[1] || `Puzzle ${i + 1}` });
    } catch {}
  });
  return puzzles;
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

// ── HW Player ─────────────────────────────────────────────────────────────────

function HWPlayer({ hw, onBack }) {
  const { user }   = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];
  const puzzles    = loadHwPuzzles(hw.pgnId);

  const [idx,          setIdx]          = useState(0);
  const [fen,          setFen]          = useState(puzzles[0]?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [solution,     setSolution]     = useState(puzzles[0]?.solution || []);
  const [solutionStep, setSolutionStep] = useState(0);
  const [feedback,     setFeedback]     = useState(puzzles.length ? "Find the best move!" : "No puzzles in this PGN.");
  const [selectedSq,   setSelectedSq]   = useState(null);
  const [sqStyles,     setSqStyles]     = useState({});
  const [showHint,     setShowHint]     = useState(false);
  const [jumpToNext,   setJumpToNext]   = useState(false);
  const [correctSet,   setCorrectSet]   = useState(new Set());
  const [wrongMap,     setWrongMap]     = useState({});  // id → count
  const [times,        setTimes]        = useState([]);  // seconds per solved puzzle
  const startRef = useRef(Date.now());

  const posListRef = useRef(null);

  function loadPuzzle(i) {
    const pzl = puzzles[i];
    if (!pzl) return;
    setIdx(i);
    setFen(pzl.fen);
    setSolution(pzl.solution);
    setSolutionStep(0);
    setFeedback("Find the best move!");
    setSelectedSq(null);
    setSqStyles({});
    setShowHint(false);
    startRef.current = Date.now();
    // scroll position list to highlight
    setTimeout(() => {
      const el = posListRef.current?.querySelector(`[data-idx="${i}"]`);
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }

  // Clear highlights when FEN changes
  useEffect(() => { setSelectedSq(null); setSqStyles({}); setShowHint(false); }, [fen]);

  // Hint highlight: show expected from + to
  const hintStyles = showHint && solution[solutionStep] ? (() => {
    const uci = solution[solutionStep];
    return {
      [uci.slice(0, 2)]: { backgroundColor: "rgba(234, 197, 0, 0.7)" },
      [uci.slice(2, 4)]: { backgroundColor: "rgba(234, 197, 0, 0.5)" },
    };
  })() : {};

  const mergedStyles = { ...sqStyles, ...hintStyles };

  function handleMove(from, to) {
    if (!puzzles.length || !fen || !solution.length) return "invalid";
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
      if (jumpToNext && idx < puzzles.length - 1) {
        setTimeout(() => loadPuzzle(idx + 1), 800);
      }
      return "correct";
    }

    // Opponent response
    const opp = solution[nextStep], g2 = new Chess(newFen);
    let oppOk = false;
    try { oppOk = !!g2.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || "q" }); } catch {}
    setFen(oppOk ? g2.fen() : newFen);
    setSolutionStep(oppOk ? nextStep + 1 : nextStep);
    setFeedback("Good! Keep going...");
    return "correct";
  }

  function clearSel() { setSelectedSq(null); setSqStyles({}); }

  function onDrop({ sourceSquare, targetSquare }) {
    clearSel();
    const r = handleMove(sourceSquare, targetSquare);
    return r === "correct";
  }

  function onSquareClick({ piece, square }) {
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

  const done      = correctSet.size;
  const total     = puzzles.length;
  const wrongTotal = Object.values(wrongMap).reduce((a, b) => a + b, 0);
  const avgTime   = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;

  const feedbackType = feedback.includes("Correct") || feedback.includes("Good") || feedback.includes("✓")
    ? "good" : feedback.includes("Wrong") ? "bad" : "neutral";

  const boardMaxSize = "min(100%, calc(100vh - 200px))";

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">

        {/* Back + title */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack}
            className="w-10 h-10 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors shrink-0">
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-[18px] font-black text-gray-900 truncate">{hw.title}</h1>
            <p className="text-[12px] text-gray-400">{hw.batchName} · {total} positions</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Left — board */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Feedback */}
            <AnimatePresence mode="wait">
              {feedback && (
                <motion.div key={feedback}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn("px-4 py-3 rounded-[16px] text-[13px] font-semibold border",
                    feedbackType === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : feedbackType === "bad" ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-white text-gray-600 border-gray-200")}>
                  {feedback}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Board */}
            <div style={{ width: boardMaxSize, maxWidth: 520 }}>
              <div className="overflow-hidden shadow-[0_6px_30px_rgba(0,0,0,0.10)]">
                <Chessboard options={{
                  position: fen,
                  boardOrientation: fen.split(" ")[1] === "b" ? "black" : "white",
                  onPieceDrop: onDrop,
                  onSquareClick: onSquareClick,
                  allowDragging: true,
                  canDragPiece: ({ piece }) => piece.pieceType?.[0] === new Chess(fen).turn(),
                  squareStyles: mergedStyles,
                  darkSquareStyle:  { backgroundColor: boardTheme.dark },
                  lightSquareStyle: { backgroundColor: boardTheme.light },
                  boardStyle: { borderRadius: 0 },
                }} />
              </div>
            </div>

            {/* Hint button */}
            <button onClick={() => setShowHint(h => !h)}
              className={cn(
                "flex items-center gap-2 h-9 px-4 rounded-xl border text-[12px] font-bold transition-all",
                showHint
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              )}>
              <Lightbulb size={14} />Hint
            </button>
          </div>

          {/* Right — stats + positions */}
          <div className="w-full lg:w-72 shrink-0 flex flex-col gap-3"
               style={{ maxHeight: `calc(${boardMaxSize} + 80px)` }}>

            {/* Progress + stats */}
            <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm p-4 shrink-0">
              <div className="flex items-center gap-4">
                <RingProgress done={done} total={total} />
                <div className="flex-1 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col items-center py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-[22px] font-black text-emerald-600 leading-none">{done}</span>
                      <span className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-wide">Correct</span>
                    </div>
                    <div className="flex flex-col items-center py-2.5 rounded-xl bg-red-50 border border-red-100">
                      <span className="text-[22px] font-black text-red-500 leading-none">{wrongTotal}</span>
                      <span className="text-[9px] font-bold text-red-400 mt-1 uppercase tracking-wide">Wrong</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                    <Clock size={12} className="text-gray-400 shrink-0" />
                    <span className="text-[11px] text-gray-500">Avg time:</span>
                    <span className="text-[12px] font-bold text-gray-700">{avgTime ? `${avgTime}s` : "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Position list — scrollable */}
            <div className="bg-white rounded-[20px] border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Positions</p>
              </div>
              <div ref={posListRef} className="overflow-y-auto flex-1 p-2 space-y-1">
                {puzzles.length === 0 ? (
                  <p className="text-[12px] text-gray-400 text-center py-6">No positions found</p>
                ) : puzzles.map((pzl, i) => {
                  const isCurrent = i === idx;
                  const isSolved  = correctSet.has(pzl.id);
                  const hasWrong  = (wrongMap[pzl.id] || 0) > 0;
                  return (
                    <button key={pzl.id} data-idx={i} onClick={() => loadPuzzle(i)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-[12px]",
                        isCurrent ? "bg-brand-50 border border-brand-200" : "hover:bg-gray-50 border border-transparent"
                      )}>
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0",
                        isSolved   ? "bg-emerald-500 text-white"
                        : hasWrong ? "bg-red-100 text-red-600"
                        : isCurrent ? "bg-brand-600 text-white"
                        : "bg-gray-100 text-gray-500"
                      )}>
                        {isSolved ? <Check size={10} /> : i + 1}
                      </span>
                      <span className={cn("flex-1 truncate font-medium", isCurrent ? "text-brand-700" : "text-gray-700")}>
                        {pzl.name || `Puzzle ${i + 1}`}
                      </span>
                      {hasWrong && !isSolved && (
                        <span className="text-[9px] font-bold text-red-400 shrink-0">{wrongMap[pzl.id]}✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer controls */}
            <div className="shrink-0 space-y-2">
              {/* Jump to Next toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-[16px] border border-gray-200 shadow-sm">
                <div>
                  <p className="text-[12px] font-bold text-gray-700">Jump to Next</p>
                  <p className="text-[10px] text-gray-400">Auto-advance after solving</p>
                </div>
                <button type="button" onClick={() => setJumpToNext(v => !v)}
                  className={cn("w-11 h-6 rounded-full transition-all flex items-center px-0.5 shrink-0",
                    jumpToNext ? "bg-brand-600 justify-end" : "bg-gray-200 justify-start")}>
                  <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Next button */}
              <button
                onClick={() => loadPuzzle(Math.min(idx + 1, puzzles.length - 1))}
                disabled={idx >= puzzles.length - 1}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-bold shadow-lg shadow-brand-500/20 transition-all">
                <SkipForward size={15} />Next
              </button>
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

  const [homework, saveHomework] = useSaved("ca_homework");
  const [batches]                = useSaved("ca_batches");
  const [pgns]                   = useSaved("ca_pgns");
  const [view,    setView]       = useState("list");
  const [activeHw, setActiveHw] = useState(null);

  const [form, setForm] = useState({ title: "", batchId: "", pgnId: "", dueDate: "", notes: "" });

  function assign(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.batchId) return;
    const batch = batches.find(b => b.id === form.batchId);
    const pgn   = pgns.find(p => p.id === form.pgnId);
    saveHomework([...homework, {
      id: `HW-${String(homework.length + 1).padStart(3, "0")}`,
      title: form.title, batchId: form.batchId, batchName: batch?.name || "—",
      pgnId: form.pgnId, pgnName: pgn?.name || "—",
      dueDate: form.dueDate, notes: form.notes,
      assignedBy: user?.name, createdAt: new Date().toLocaleDateString(),
    }]);
    setForm({ title: "", batchId: "", pgnId: "", dueDate: "", notes: "" });
    setView("list");
  }

  // ── Homework player ─────────────────────────────────────────────────────────
  if (activeHw) {
    return <HWPlayer hw={activeHw} onBack={() => setActiveHw(null)} />;
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
              <Field label="Select Batch">
                <select className={inputCls} value={form.batchId} onChange={e => setForm(f => ({ ...f, batchId: e.target.value }))}>
                  <option value="">Choose batch</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.id} — {b.name}</option>)}
                </select>
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

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {user?.role !== "student" && (
          <div className="flex justify-end mb-6">
            <button onClick={() => setView("assign")}
              className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold shadow-lg shadow-brand-500/20 transition-all">
              <Plus size={15} />Create Homework
            </button>
          </div>
        )}

        {/* Stats row */}
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
            {[...homework].reverse().map((hw, i) => (
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
                    <button onClick={e => { e.stopPropagation(); saveHomework(homework.filter(h => h.id !== hw.id)); }}
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
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
