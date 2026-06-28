import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  Plus, BookOpen, ChevronLeft, Trash2, Calendar, User,
  Clock3, Layers3, FileText,
  Clock, Check, X, ArrowRight, ChevronRight, TrendingUp,
  BarChart2, AlertCircle, Zap, Cpu,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BOARD_THEMES } from "../lib/boardThemes";
import { cn } from "../lib/utils";
import {
  getHomework, getHomeworkForBatch, getHomeworkByAcademy,
  createHomework, deleteHomework,
  getBatches, getPgns, getPgnsByIds, getPuzzlesByPgnId,
  getProfiles, getProfilesByAcademy, getAcademies,
  submitPuzzleAnswer, getStudentSubmissions,
  getAllSubmissionsForHomework, getFullSubmissionsForStudent,
  saveSubmissionReview, createNotifications,
  getNotificationsForUser, markNotificationsRead,
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

// ── Engine helpers ────────────────────────────────────────────────────────────

const SF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.min.js";

function applyUci(fen, uci) {
  try {
    const g = new Chess(fen);
    const m = g.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || "q" });
    return m ? { san: m.san, fen: g.fen(), over: g.isGameOver() } : null;
  } catch { return null; }
}

// ── HW Player ─────────────────────────────────────────────────────────────────

export function HWPlayer({ hw, onBack }) {
  const { user }   = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

  const [puzzles,        setPuzzles]        = useState([]);
  const [puzzlesOk,      setPuzzlesOk]      = useState(false);
  const [idx,            setIdx]            = useState(0);
  const [boardFen,       setBoardFen]       = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [movesUCI,       setMovesUCI]       = useState([]);
  const [movesSAN,       setMovesSAN]       = useState([]);
  const [submissionsMap, setSubmissionsMap] = useState({});
  const [submitting,     setSubmitting]     = useState(false);
  const [saveError,      setSaveError]      = useState(null);
  const [puzzleComments, setPuzzleComments] = useState({});
  const [autoMovePending, setAutoMovePending] = useState(false);
  const [retrying,       setRetrying]       = useState(false);
  const [bubble,         setBubble]         = useState(null); // {type:'correct'|'wrong', msg}
  const boardMoveCountRef = useRef(0);
  const posListRef = useRef(null);

  // ── Engine Explore ──────────────────────────────────────────────────────────
  const sfRef   = useRef(null);
  const sfCbRef = useRef(null);
  const expRef  = useRef({
    active: false, phase: "idle",
    startFen: null, firstUCI: null, firstSAN: null, afterFen: null,
    topMoves: [], lineIdx: 0, lineHistory: [], completedLines: [], boardFen: null,
  });
  const [, setExpTick] = useState(0);
  const redrawExp = () => setExpTick(t => t + 1);

  useEffect(() => () => { sfRef.current?.worker.terminate(); sfRef.current = null; }, []);

  function ensureSF() {
    if (sfRef.current) return;
    const blob = new Blob([`importScripts('${SF_CDN}')`], { type: "text/javascript" });
    const w = new Worker(URL.createObjectURL(blob));
    sfRef.current = { worker: w, ready: false, pending: null, moves: {} };
    w.postMessage("uci");
    w.onmessage = ({ data: msg }) => {
      const sf = sfRef.current; if (!sf) return;
      if (!sf.ready && msg.includes("uciok")) w.postMessage("isready");
      if (msg.includes("readyok")) { sf.ready = true; sf.pending?.(); sf.pending = null; }
      if (msg.startsWith("info") && msg.includes(" pv ")) {
        const lM = msg.match(/multipv (\d+)/);
        const cM = msg.match(/score cp (-?\d+)/);
        const mM = msg.match(/score mate (-?\d+)/);
        const pM = msg.match(/ pv (\S+)/);
        if (pM) {
          const k = lM ? parseInt(lM[1]) : 1;
          sf.moves[k] = { move: pM[1], score: cM ? parseInt(cM[1]) : (mM ? (parseInt(mM[1]) > 0 ? 9999 : -9999) : 0) };
        }
      }
      if (msg.startsWith("bestmove")) {
        const res = { ...sf.moves }; sf.moves = {};
        const cb = sfCbRef.current; sfCbRef.current = null; cb?.(res);
      }
    };
  }

  function sfAnalyze(fen, multiPV, depth, cb) {
    ensureSF();
    sfCbRef.current = cb;
    sfRef.current.moves = {};
    const go = () => {
      sfRef.current.worker.postMessage("stop");
      sfRef.current.worker.postMessage(`setoption name MultiPV value ${multiPV}`);
      sfRef.current.worker.postMessage(`position fen ${fen}`);
      sfRef.current.worker.postMessage(`go depth ${depth}`);
    };
    if (sfRef.current.ready) go(); else sfRef.current.pending = go;
  }

  function startExplore() {
    const pzl = puzzles[idx];
    if (!pzl || submissionsMap[pzl.id]) return;
    Object.assign(expRef.current, {
      active: true, phase: "await_first", startFen: pzl.fen, boardFen: pzl.fen,
      firstUCI: null, firstSAN: null, afterFen: null,
      topMoves: [], lineIdx: 0, lineHistory: [], completedLines: [],
    });
    redrawExp();
  }

  function stopExplore() {
    sfRef.current?.worker.postMessage("stop");
    sfCbRef.current = null;
    expRef.current.active = false;
    expRef.current.phase = "idle";
    redrawExp();
  }

  function expStartLine(lineIdx) {
    const e = expRef.current;
    const engineMove = e.topMoves[lineIdx]?.move;
    if (!engineMove) { e.phase = "done"; redrawExp(); return; }
    const r = applyUci(e.afterFen, engineMove);
    if (!r) { e.phase = "done"; redrawExp(); return; }
    e.lineIdx = lineIdx;
    e.lineHistory = [{ uci: engineMove, san: r.san, byEngine: true }];
    e.boardFen = r.fen;
    e.phase = r.over ? "engine_turn" : "in_line";
    redrawExp();
    if (r.over) setTimeout(() => expEndLine(), 400);
  }

  function expEndLine() {
    const e = expRef.current;
    e.completedLines.push({ firstSAN: e.firstSAN, history: [...e.lineHistory] });
    e.lineHistory = [];
    const next = e.lineIdx + 1;
    if (next < Math.min(e.topMoves.length, 3)) {
      e.phase = "transitioning"; redrawExp();
      setTimeout(() => { e.boardFen = e.afterFen; redrawExp(); }, 400);
      setTimeout(() => expStartLine(next), 900);
    } else {
      e.phase = "done"; redrawExp();
    }
  }

  function handleExpFirstDrop({ sourceSquare: from, targetSquare: to }) {
    const e = expRef.current;
    if (e.phase !== "await_first") return false;
    const r = applyUci(e.startFen, from + to);
    if (!r) return false;
    e.firstUCI = from + to; e.firstSAN = r.san;
    e.afterFen = r.fen; e.boardFen = r.fen;
    e.phase = "fetching"; redrawExp();
    sfAnalyze(r.fen, 3, 15, (result) => {
      const top = [1, 2, 3].map(k => result[k]).filter(Boolean);
      e.topMoves = top;
      if (!top.length) { e.phase = "done"; redrawExp(); return; }
      setTimeout(() => expStartLine(0), 500);
    });
    return true;
  }

  function handleExpLineDrop({ sourceSquare: from, targetSquare: to }) {
    const e = expRef.current;
    if (e.phase !== "in_line") return false;
    const r = applyUci(e.boardFen, from + to);
    if (!r) return false;
    const fenAfterStudent = r.fen;
    e.lineHistory = [...e.lineHistory, { uci: from + to, san: r.san, byEngine: false }];
    e.boardFen = fenAfterStudent;
    if (e.lineHistory.length >= 4 || r.over) {
      e.phase = "engine_turn"; redrawExp();
      setTimeout(() => expEndLine(), 400);
      return true;
    }
    e.phase = "engine_turn"; redrawExp();
    sfAnalyze(fenAfterStudent, 1, 12, (result) => {
      const mv = result[1]?.move;
      const sc = result[1]?.score ?? 0;
      if (!mv || Math.abs(sc) >= 400) { expEndLine(); return; }
      setTimeout(() => {
        const r2 = applyUci(fenAfterStudent, mv);
        if (!r2) { expEndLine(); return; }
        e.lineHistory = [...e.lineHistory, { uci: mv, san: r2.san, byEngine: true }];
        e.boardFen = r2.fen;
        if (e.lineHistory.length >= 4 || r2.over) {
          e.phase = "engine_turn"; redrawExp();
          setTimeout(() => expEndLine(), 400);
        } else {
          e.phase = "in_line"; redrawExp();
        }
      }, 600);
    });
    return true;
  }

  async function submitExplore() {
    const pzl = puzzles[idx];
    const e = expRef.current;
    if (!pzl || !user?.id || submitting || e.completedLines.length < 2) return;
    const firstLine = e.completedLines[0];
    const uciMoves = [e.firstUCI, ...firstLine.history.map(h => h.uci)].filter(Boolean);
    setSubmitting(true); setSaveError(null);
    try {
      await submitPuzzleAnswer(hw.id, user.id, pzl.id, uciMoves);
      const newSub = { puzzleId: pzl.id, moves: uciMoves, correct: null, reviewed: false, submittedAt: new Date().toISOString() };
      setSubmissionsMap(prev => {
        const next = { ...prev, [pzl.id]: newSub };
        const nextIdx = puzzles.findIndex((p, ii) => ii > idx && !next[p.id]);
        if (nextIdx >= 0) setTimeout(() => loadPuzzle(nextIdx), 600);
        return next;
      });
      stopExplore();
    } catch (err) {
      setSaveError(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function replayMoves(startFen, uciMoves) {
    let g = new Chess(startFen);
    for (const uci of (uciMoves || [])) {
      try { g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" }); } catch {}
    }
    return g.fen();
  }

  function uciToSanArr(startFen, uciMoves) {
    let g = new Chess(startFen);
    const sans = [];
    for (const uci of (uciMoves || [])) {
      try {
        const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
        if (m) sans.push(m.san);
      } catch {}
    }
    return sans;
  }

  useEffect(() => {
    if (!hw.pgnId) { setPuzzlesOk(true); return; }
    Promise.all([
      getPuzzlesByPgnId(hw.pgnId),
      getPgnsByIds([hw.pgnId]),
      user?.id ? getStudentSubmissions(hw.id, user.id) : Promise.resolve([]),
    ]).then(([pzls, pgns, subs]) => {
      // Extract initial PGN comment for each puzzle (e.g. "White to play and win")
      const comments = {};
      const pgnContent = pgns[0]?.content || '';
      if (pgnContent) {
        const games = pgnContent.split(/(?=\[Event\s)/g).filter(g => g.trim().length > 10);
        games.forEach((gamePgn, gIdx) => {
          const pzlId = `${hw.pgnId}-g${gIdx}`;
          const noHeaders = gamePgn.replace(/\[[^\]]*\]/g, '').trim();
          const m = noHeaders.match(/^\{([^}]+)\}/);
          if (m) comments[pzlId] = m[1].trim();
        });
      }
      setPuzzleComments(comments);

      setPuzzles(pzls);
      const smap = {};
      subs.forEach(s => { smap[s.puzzleId] = s; });
      setSubmissionsMap(smap);
      const firstUnsub = pzls.findIndex(p => !smap[p.id] || (smap[p.id]?.correct === false && smap[p.id]?.reviewed));
      const start = firstUnsub >= 0 ? firstUnsub : 0;
      setIdx(start);
      boardMoveCountRef.current = 0;
      if (pzls[start]) {
        const sub = smap[pzls[start].id];
        setBoardFen(sub?.moves?.length ? replayMoves(pzls[start].fen, sub.moves) : pzls[start].fen);
      }
      setPuzzlesOk(true);
    });
  }, [hw.pgnId, hw.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function loadPuzzle(i) {
    const pzl = puzzles[i];
    if (!pzl) return;
    setIdx(i);
    setMovesUCI([]);
    setMovesSAN([]);
    setRetrying(false);
    setBubble(null);
    setAutoMovePending(false);
    boardMoveCountRef.current = 0;
    const sub = submissionsMap[pzl.id];
    setBoardFen(sub?.moves?.length ? replayMoves(pzl.fen, sub.moves) : pzl.fen);
    setTimeout(() => {
      posListRef.current?.querySelector(`[data-idx="${i}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  }

  function handleDrop({ sourceSquare, targetSquare }) {
    const pzl = puzzles[idx];
    if (!pzl || (submissionsMap[pzl.id] && !retrying) || autoMovePending) return false;
    let g;
    try { g = new Chess(boardFen); } catch { return false; }
    let move = null;
    try { move = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); } catch {}
    if (!move) return false;

    const uci = sourceSquare + targetSquare;
    const newFen = g.fen();

    // During re-attempt: validate against solution
    if (retrying) {
      const expectedUci = pzl.solution?.[boardMoveCountRef.current];
      if (expectedUci && uci.slice(0, 4) !== expectedUci.slice(0, 4)) {
        const comment = puzzleComments[pzl.id];
        setBubble({ type: 'wrong', msg: comment ? `Wrong! Think again.\n${comment}` : 'Wrong! Think again.' });
        setTimeout(() => setBubble(null), 2800);
        return false;
      }
      setBubble({ type: 'correct', msg: 'Correct move! ✓' });
      setTimeout(() => setBubble(null), 900);
    }

    setBoardFen(newFen);
    const newUciList = [...movesUCI, uci];
    setMovesUCI(newUciList);
    setMovesSAN(prev => [...prev, move.san]);
    boardMoveCountRef.current += 1;

    // Auto-play opponent move from PGN solution
    const oppUci = pzl.solution?.[boardMoveCountRef.current];
    if (oppUci && !g.isGameOver()) {
      setAutoMovePending(true);
      const fenBeforeOpp = newFen;
      const totalBefore = boardMoveCountRef.current;
      setTimeout(() => {
        const r = applyUci(fenBeforeOpp, oppUci);
        if (r) {
          setBoardFen(r.fen);
          setMovesUCI(prev => [...prev, oppUci]);
          setMovesSAN(prev => [...prev, r.san]);
          boardMoveCountRef.current = totalBefore + 1;
        }
        setAutoMovePending(false);
        // On retry: auto-submit when solution exhausted
        if (retrying && boardMoveCountRef.current >= (pzl.solution?.length || 0)) {
          setBubble({ type: 'correct', msg: '🎉 All correct! Submitting…' });
          setTimeout(() => submitAnswer(newUciList.concat(r ? [oppUci] : [])), 600);
        }
      }, 650);
    } else if (retrying && boardMoveCountRef.current >= (pzl.solution?.length || 0)) {
      // Solution exhausted, last move was user's
      setBubble({ type: 'correct', msg: '🎉 All correct! Submitting…' });
      setTimeout(() => submitAnswer(newUciList), 700);
    }

    return true;
  }

  function reset() {
    const pzl = puzzles[idx];
    if (!pzl || (submissionsMap[pzl.id] && !retrying)) return;
    setBoardFen(pzl.fen);
    setMovesUCI([]);
    setMovesSAN([]);
    setBubble(null);
    setAutoMovePending(false);
    boardMoveCountRef.current = 0;
  }

  function startRetry() {
    const pzl = puzzles[idx];
    if (!pzl) return;
    setRetrying(true);
    setBoardFen(pzl.fen);
    setMovesUCI([]);
    setMovesSAN([]);
    setBubble(null);
    setAutoMovePending(false);
    boardMoveCountRef.current = 0;
  }

  async function submitAnswer(overrideMoves) {
    const pzl = puzzles[idx];
    const moves = overrideMoves || movesUCI;
    if (!pzl || !user?.id || moves.length === 0 || submitting) return;
    setSubmitting(true);
    setSaveError(null);
    try {
      await submitPuzzleAnswer(hw.id, user.id, pzl.id, moves);
      const newSub = { puzzleId: pzl.id, moves: [...moves], correct: null, reviewed: false, submittedAt: new Date().toISOString() };
      setRetrying(false);
      setBubble(null);
      setSubmissionsMap(prev => {
        const next = { ...prev, [pzl.id]: newSub };
        const nextIdx = puzzles.findIndex((p, i) => i > idx && (!next[p.id] || (next[p.id]?.reviewed && next[p.id]?.correct === false)));
        if (nextIdx >= 0) setTimeout(() => loadPuzzle(nextIdx), 700);
        return next;
      });
    } catch (err) {
      setSaveError(err?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const e           = expRef.current;
  const isExploring = e.active;

  const pzl        = puzzles[idx];
  const currentSub = pzl ? submissionsMap[pzl.id] : null;
  const total      = puzzles.length;
  const submitted  = Object.keys(submissionsMap).length;
  const correct    = Object.values(submissionsMap).filter(s => s.correct === true).length;
  const wrong      = Object.values(submissionsMap).filter(s => s.correct === false).length;
  const reviewed   = Object.values(submissionsMap).filter(s => s.reviewed).length;
  const orientation = pzl ? (new Chess(pzl.fen).turn() === "b" ? "black" : "white") : "white";
  const circleItems = getCircleItems(total, idx);

  const submittedSan = useMemo(() => {
    if (!pzl || !currentSub?.moves?.length) return [];
    return uciToSanArr(pzl.fen, currentSub.moves);
  }, [pzl, currentSub]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col bg-white overflow-y-auto md:overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>
      {saveError && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-[12px] font-medium shrink-0">
          <X size={13} strokeWidth={3} className="shrink-0" />
          <span>Could not submit: {saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600"><X size={13} /></button>
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-100">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 font-medium">{hw.id}</p>
          <h1 className="text-[15px] font-black text-gray-900 leading-tight truncate">{hw.title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-gray-500">{submitted}/{total} answered</span>
          {reviewed > 0 && (
            <>
              <span className="text-[12px] font-bold text-emerald-600">{correct} ✓</span>
              <span className="text-[12px] font-bold text-red-500">{wrong} ✗</span>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col md:flex-row flex-1 gap-3 md:gap-4 p-3 md:p-4 md:overflow-hidden" style={{ minHeight: 0 }}>
        {/* Board */}
        <div className="flex items-center justify-center md:flex-1 md:min-w-0 md:overflow-hidden">
          <div className="aspect-square w-full" style={{ maxWidth: "min(100%, calc(100vh - 170px))" }}>
            <div className="overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full h-full">
              <Chessboard options={{
                position: isExploring ? (e.boardFen || e.startFen) : boardFen,
                boardOrientation: orientation,
                onPieceDrop: isExploring
                  ? (e.phase === "await_first" ? handleExpFirstDrop : handleExpLineDrop)
                  : handleDrop,
                allowDragging: isExploring
                  ? (e.phase === "await_first" || e.phase === "in_line")
                  : (puzzlesOk && !!pzl && (!currentSub || retrying) && !autoMovePending),
                darkSquareStyle:  { backgroundColor: boardTheme.dark },
                lightSquareStyle: { backgroundColor: boardTheme.light },
                boardStyle: { borderRadius: 0 },
              }} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="md:w-[260px] w-full shrink-0 flex flex-col gap-3 md:gap-4 overflow-y-auto">

          {isExploring ? (
            <>
              {/* Explore status card */}
              <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-orange-500" />
                  <span className="text-[13px] font-black text-gray-800">Engine Exploration</span>
                  <button onClick={stopExplore} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                    <X size={13} />
                  </button>
                </div>

                {/* Variation progress bars */}
                <div className="flex gap-1.5 mb-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={cn("flex-1 h-2 rounded-full transition-all",
                      i < e.completedLines.length ? "bg-orange-400" :
                      i === e.lineIdx && !["idle","await_first","fetching","done","transitioning"].includes(e.phase) ? "bg-orange-200" :
                      "bg-gray-100")} />
                  ))}
                </div>

                <p className="text-[12px] font-medium text-gray-500">
                  {e.phase === "await_first"   && "Make your first move on the board"}
                  {e.phase === "fetching"      && "Engine analyzing 3 replies…"}
                  {e.phase === "in_line"       && `Variation ${e.lineIdx + 1}/3 — your turn`}
                  {e.phase === "engine_turn"   && <span className="flex items-center gap-1.5 text-indigo-500"><Cpu size={11} className="animate-pulse" />Engine thinking…</span>}
                  {e.phase === "transitioning" && `Loading variation ${e.lineIdx + 2}…`}
                  {e.phase === "done"          && <span className="text-emerald-600 font-bold">All variations explored!</span>}
                </p>

                {e.firstSAN && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">Your move:</span>
                    <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[12px] font-black">{e.firstSAN}</span>
                  </div>
                )}
              </div>

              {/* Current line in progress */}
              {e.lineHistory.length > 0 && !["done","transitioning"].includes(e.phase) && (
                <div className="bg-orange-50 border border-orange-100 rounded-[20px] p-4">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-2">Variation {e.lineIdx + 1} — in progress</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-lg bg-orange-200 text-orange-900 text-[12px] font-black">{e.firstSAN}</span>
                    {e.lineHistory.map((h, j) => (
                      <span key={j} className={cn("px-2 py-0.5 rounded-lg text-[12px]",
                        h.byEngine ? "bg-white border border-gray-200 text-gray-600 font-medium" : "bg-orange-200 text-orange-900 font-black")}>
                        {h.san}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed variations */}
              {e.completedLines.map((line, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Variation {i + 1}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded-lg bg-orange-100 text-orange-800 text-[12px] font-black">{line.firstSAN}</span>
                    {line.history.map((h, j) => (
                      <span key={j} className={cn("px-2 py-0.5 rounded-lg text-[12px]",
                        h.byEngine ? "bg-gray-100 text-gray-600 font-medium" : "bg-orange-100 text-orange-800 font-black")}>
                        {h.san}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {/* Submit visible after 2+ variations */}
              {e.completedLines.length >= 2 && (
                <button onClick={submitExplore} disabled={submitting}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                  {submitting ? "Submitting…" : "Submit Answer"}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Puzzle info / answer card */}
              <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-[15px] font-black text-gray-900">Puzzle {idx + 1}</span>
                  <span className="text-[12px] text-gray-400">of {total}</span>
                  {autoMovePending && (
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-indigo-500">
                      <Cpu size={11} className="animate-pulse" />thinking…
                    </span>
                  )}
                </div>

                {/* PGN comment bubble (puzzle hint) */}
                {puzzleComments[pzl?.id] && !retrying && !currentSub && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-[12px] text-amber-800 font-medium">{puzzleComments[pzl.id]}</p>
                  </div>
                )}

                {/* Re-attempt feedback bubble */}
                {bubble && (
                  <div className={cn("mb-3 px-3 py-2.5 rounded-xl border flex items-start gap-2",
                    bubble.type === 'correct'
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-red-50 border-red-200")}>
                    {bubble.type === 'correct'
                      ? <Check size={13} className="text-emerald-600 shrink-0 mt-0.5" strokeWidth={3} />
                      : <X size={13} className="text-red-500 shrink-0 mt-0.5" strokeWidth={3} />}
                    <p className={cn("text-[12px] font-medium whitespace-pre-line",
                      bubble.type === 'correct' ? "text-emerald-700" : "text-red-700")}>
                      {bubble.msg}
                    </p>
                  </div>
                )}

                {/* Moves display */}
                <div className="min-h-[40px] mb-3">
                  {retrying ? (
                    movesUCI.length > 0 ? (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Re-attempt moves</p>
                        <p className="font-mono text-[12px] text-gray-700">{movesSAN.join(" ")}</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-indigo-500 italic">Make your move…</p>
                    )
                  ) : currentSub ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Your answer</p>
                      <p className="font-mono text-[13px] text-gray-700">
                        {submittedSan.length ? submittedSan.join(" ") : <span className="italic text-gray-400">(no moves)</span>}
                      </p>
                    </div>
                  ) : movesUCI.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Your moves</p>
                      <p className="font-mono text-[13px] text-gray-700">{movesSAN.join(" ")}</p>
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-400 italic">Make your move on the board…</p>
                  )}
                </div>

                {/* Status / action */}
                {retrying ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button onClick={reset} disabled={movesUCI.length === 0}
                        className="flex-1 h-10 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-gray-600 hover:border-gray-300 disabled:opacity-40 transition-colors">
                        Reset
                      </button>
                      <button onClick={() => submitAnswer()} disabled={submitting || movesUCI.length === 0}
                        className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold disabled:opacity-40 transition-colors">
                        {submitting ? "Submitting…" : "Submit"}
                      </button>
                    </div>
                    <button onClick={() => setRetrying(false)}
                      className="w-full h-8 text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                      Cancel retry
                    </button>
                  </div>
                ) : currentSub ? (
                  currentSub.reviewed ? (
                    currentSub.correct ? (
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <Check size={16} className="text-emerald-600 shrink-0" strokeWidth={3} />
                        <span className="text-[13px] font-bold text-emerald-700">Correct!</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
                          <X size={16} className="text-red-500 shrink-0" strokeWidth={3} />
                          <span className="text-[13px] font-bold text-red-600">Wrong answer</span>
                        </div>
                        <button onClick={startRetry}
                          className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-1.5">
                          Try Again
                        </button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                      <Clock size={14} className="text-blue-500 shrink-0" />
                      <span className="text-[12px] font-medium text-blue-700">Submitted — awaiting review</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button onClick={reset} disabled={movesUCI.length === 0}
                        className="flex-1 h-10 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-gray-600 hover:border-gray-300 disabled:opacity-40 transition-colors">
                        Reset
                      </button>
                      <button onClick={() => submitAnswer()} disabled={submitting || movesUCI.length === 0}
                        className="flex-[2] h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold disabled:opacity-40 transition-colors">
                        {submitting ? "Submitting…" : "Submit Answer"}
                      </button>
                    </div>
                    {hw.engineExplore && (
                      <button onClick={startExplore}
                        className="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors">
                        <Zap size={13} />Explore with Engine
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Puzzle nav card */}
              <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5">
                <p className="text-[12px] font-bold text-gray-500 mb-3">All Puzzles</p>
                {!puzzlesOk ? (
                  <p className="text-[12px] text-gray-400">Loading…</p>
                ) : (
                  <div ref={posListRef} className="flex flex-wrap gap-2 items-center mb-4">
                    {circleItems.map((item, ki) => {
                      if (typeof item === "string") return <span key={item + ki} className="text-gray-300 font-bold px-0.5">...</span>;
                      const pz  = puzzles[item];
                      const sub = pz ? submissionsMap[pz.id] : null;
                      const isCurrent = item === idx;
                      return (
                        <button key={item} data-idx={item} type="button" onClick={() => loadPuzzle(item)}
                          className={cn(
                            "w-9 h-9 rounded-full text-[12px] font-black transition-all flex items-center justify-center shrink-0",
                            sub?.correct === true  ? "bg-emerald-500 text-white" :
                            sub?.correct === false ? "bg-red-500 text-white" :
                            sub                    ? "bg-blue-500 text-white" :
                            isCurrent              ? "bg-gray-900 text-white" :
                                                     "border-2 border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-700"
                          )}>
                          {item + 1}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button type="button"
                  onClick={() => loadPuzzle(Math.min(idx + 1, puzzles.length - 1))}
                  disabled={idx >= puzzles.length - 1}
                  className="w-full h-12 rounded-2xl bg-[#f97316] hover:bg-[#ea6c00] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20">
                  Next <ArrowRight size={16} strokeWidth={2.5} />
                </button>
              </div>

              {hw.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">Instructions</p>
                  <p className="text-[12px] text-amber-800 leading-relaxed">{hw.notes}</p>
                </div>
              )}
            </>
          )}
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

export const STATUS_CFG = {
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

function StudentHomeworkView({ homework, progressMap, allProgress, notifications = [], onOpen }) {
  const [tab,         setTab]         = useState('all');
  const [batchFilter, setBatchFilter] = useState('');
  const [sortBy,      setSortBy]      = useState('newest');

  function getStatus(hw) {
    const p         = progressMap[hw.id];
    const total     = p?.total     || 0;
    const submitted = p?.submitted || 0;
    const overdue   = hw.dueDate && new Date(hw.dueDate) < new Date();
    if (total > 0 && submitted >= total) return 'completed';
    if (submitted > 0) return overdue ? 'overdue' : 'in-progress';
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
    allProgress.forEach(r => {
      const d = new Date(r.submitted_at);
      if (d >= startOfWeek) counts[(d.getDay() + 6) % 7]++;
    });
    return { days: DAYS, counts };
  }, [allProgress]);

  const weeklySolved = weeklyData.counts.reduce((a, b) => a + b, 0);
  const timeH        = 0;
  const timeM        = 0;

  // Recent activity: latest submission per homework
  const recentActivity = useMemo(() => {
    const byHw = {};
    allProgress.forEach(r => {
      const d = new Date(r.submitted_at);
      if (!byHw[r.homework_id] || d > byHw[r.homework_id].latest) {
        byHw[r.homework_id] = { count: (byHw[r.homework_id]?.count || 0) + 1, latest: d };
      } else {
        byHw[r.homework_id].count++;
      }
    });
    return Object.entries(byHw)
      .map(([hwId, { count, latest }]) => {
        const hw = homework.find(h => h.id === hwId);
        const p  = progressMap[hwId];
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
    <div className="bg-[#f6f8fc] p-4 md:p-6">

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

          {/* Notifications banner */}
          {notifications.length > 0 && (
            <div className="mb-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
              <p className="text-[13px] font-bold text-indigo-800 mb-2">📬 {notifications.length} homework result{notifications.length > 1 ? 's' : ''} reviewed!</p>
              <div className="space-y-1.5">
                {notifications.map((n, i) => (
                  <p key={i} className="text-[12px] text-indigo-700">
                    <strong>{n.title}</strong> — {n.message}
                  </p>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Homework Assignments</p>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 text-[14px] border border-gray-100">
                No homework here yet.
              </div>
            ) : filtered.map((hw, i) => {
              const p         = progressMap[hw.id];
              const submitted = p?.submitted || 0;
              const total     = p?.total     || 0;
              const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0;
              const status    = getStatus(hw);
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
                          <p className="text-[11px] text-gray-400 mt-1">{submitted}/{total} answered</p>
                          {(p?.correct > 0 || p?.wrong > 0) && (
                            <div className="flex items-center gap-3 mt-2">
                              {p.correct > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                  <Check size={9} strokeWidth={3} />{p.correct} correct
                                </span>
                              )}
                              {p.wrong > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                                  <X size={9} strokeWidth={3} />{p.wrong} wrong
                                </span>
                              )}
                              {p.correct + p.wrong > 0 && (
                                <span className="text-[11px] text-gray-400">
                                  {Math.round((p.correct / (p.correct + p.wrong)) * 100)}%
                                </span>
                              )}
                            </div>
                          )}
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

// ── Coach Review Panel ────────────────────────────────────────────────────────

function CoachReviewPanel({ hw, pgns, students, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [puzzles,     setPuzzles]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [reviewing,   setReviewing]   = useState(false);

  const totalPuzzles = pgns.find(p => p.id === hw.pgnId)?.puzzleCount || 0;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAllSubmissionsForHomework(hw.id),
      hw.pgnId ? getPuzzlesByPgnId(hw.pgnId) : Promise.resolve([]),
    ]).then(([subs, pzls]) => {
      setSubmissions(subs);
      setPuzzles(pzls);
      setLoading(false);
    });
  }, [hw.id, hw.pgnId]);

  const puzzleMap = useMemo(() => {
    const m = {};
    puzzles.forEach(p => { m[p.id] = p; });
    return m;
  }, [puzzles]);

  const byStudent = useMemo(() => {
    const m = {};
    submissions.forEach(sub => {
      const sid = String(sub.studentId);
      if (!m[sid]) {
        const profile = students.find(p => String(p.id) === sid);
        m[sid] = { studentId: sub.studentId, name: sub.studentName || profile?.name || `Student #${sub.studentId}`, submissions: [] };
      }
      m[sid].submissions.push(sub);
    });
    return Object.values(m).sort((a, b) => b.submissions.length - a.submissions.length);
  }, [submissions, students]);

  const notSubmittedStudents = useMemo(() => {
    const submittedIds = new Set(byStudent.map(s => String(s.studentId)));
    return students.filter(p => p.batchCode === hw.batchName && !submittedIds.has(String(p.id)));
  }, [byStudent, students, hw.batchName]);

  const totalSubCount = submissions.length;
  const reviewedCount = submissions.filter(s => s.reviewed).length;
  const correctCount  = submissions.filter(s => s.correct === true).length;
  const wrongCount    = submissions.filter(s => s.correct === false).length;

  function uciToSanSingle(pzl, uci) {
    if (!uci || !pzl) return uci || "—";
    try {
      const g = new Chess(pzl.fen);
      const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
      return m?.san || uci;
    } catch { return uci; }
  }

  async function autoReview() {
    setReviewing(true);
    try {
      const unreviewed = submissions.filter(s => !s.reviewed);
      if (!unreviewed.length) return;
      const updates = unreviewed.map(sub => {
        const pzl = puzzleMap[sub.puzzleId];
        if (!pzl || !sub.moves.length) return null;
        // Compare all user moves (even indices) vs solution
        let allCorrect = true;
        const solution = pzl.solution || [];
        for (let i = 0; i < sub.moves.length; i += 2) {
          const expected = solution[i]?.slice(0, 4);
          const actual   = sub.moves[i]?.slice(0, 4);
          if (!actual || !expected || actual !== expected) { allCorrect = false; break; }
        }
        return { studentId: sub.studentId, puzzleId: sub.puzzleId, correct: allCorrect };
      }).filter(Boolean);
      if (!updates.length) return;
      await Promise.all(updates.map(u => saveSubmissionReview(hw.id, u.studentId, u.puzzleId, u.correct)));
      const updatedSubs = submissions.map(sub => {
        const u = updates.find(x => x.studentId === sub.studentId && x.puzzleId === sub.puzzleId);
        return u ? { ...sub, reviewed: true, correct: u.correct } : sub;
      });
      setSubmissions(updatedSubs);

      // Send notifications per student
      const byStudentId = {};
      updatedSubs.forEach(sub => {
        if (!sub.reviewed) return;
        const sid = String(sub.studentId);
        if (!byStudentId[sid]) byStudentId[sid] = { studentId: sub.studentId, correct: 0, wrong: 0, total: 0 };
        byStudentId[sid].total++;
        if (sub.correct === true)  byStudentId[sid].correct++;
        if (sub.correct === false) byStudentId[sid].wrong++;
      });
      const notifications = Object.values(byStudentId).map(s => ({
        userId:  s.studentId,
        type:    'homework_review',
        title:   `${hw.title} reviewed`,
        message: `Correct: ${s.correct} | Wrong: ${s.wrong} | ${Math.round((s.correct / Math.max(s.total, 1)) * 100)}%`,
        data:    { hwId: hw.id, hwTitle: hw.title, correct: s.correct, wrong: s.wrong, total: s.total },
      }));
      await createNotifications(notifications);
    } catch (err) {
      console.error("Auto-review failed:", err);
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full max-w-[540px] h-full bg-[#f6f8fc] border-l border-gray-200 shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">{hw.id}</span>
              <h2 className="text-[18px] font-black text-gray-900 leading-tight mt-0.5">{hw.title}</h2>
              <p className="text-[12px] text-gray-400 mt-1">Batch: <strong>{hw.batchName}</strong> · {totalPuzzles} puzzles</p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 shrink-0 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: "Students",  value: byStudent.length,                     color: "text-brand-600"  },
              { label: "Reviewed",  value: `${reviewedCount}/${totalSubCount}`,  color: "text-gray-800"   },
              { label: "Correct",   value: correctCount,                         color: "text-emerald-600" },
              { label: "Wrong",     value: wrongCount,                           color: "text-red-500"    },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                <p className={cn("text-[18px] font-black leading-none", color)}>{value}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>

          {submissions.some(s => !s.reviewed) && (
            <button onClick={autoReview} disabled={reviewing}
              className="mt-3 w-full h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {reviewing
                ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Reviewing…</>
                : <><TrendingUp size={14} />Auto-Review All</>
              }
            </button>
          )}
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <span className="w-6 h-6 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && byStudent.length === 0 && notSubmittedStudents.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <AlertCircle size={32} className="text-gray-300 mb-3" />
              <p className="text-[14px] font-bold text-gray-500">No submissions yet</p>
              <p className="text-[12px] text-gray-400 mt-1">Students haven&apos;t submitted answers.</p>
            </div>
          )}

          {byStudent.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1">Submitted</p>
              {byStudent.map((s, i) => {
                const subCorrect = s.submissions.filter(x => x.correct === true).length;
                const subWrong   = s.submissions.filter(x => x.correct === false).length;
                const subPending = s.submissions.filter(x => !x.reviewed).length;
                return (
                  <motion.div key={s.studentId}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[13px] font-black shrink-0">
                        {s.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-gray-400">{s.submissions.length}/{totalPuzzles} answered</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {subCorrect > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{subCorrect} ✓</span>}
                        {subWrong   > 0 && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{subWrong} ✗</span>}
                        {subPending > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{subPending} pending</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {s.submissions.map(sub => {
                        const pzl         = puzzleMap[sub.puzzleId];
                        const pzlIdx      = puzzles.findIndex(p => p.id === sub.puzzleId);
                        const studentSan  = uciToSanSingle(pzl, sub.moves[0]);
                        const correctSan  = uciToSanSingle(pzl, pzl?.solution[0]);
                        return (
                          <div key={sub.puzzleId} className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[11px]",
                            sub.reviewed ? (sub.correct ? "bg-emerald-50" : "bg-red-50") : "bg-gray-50"
                          )}>
                            <span className="font-bold text-gray-400 shrink-0 w-5">#{pzlIdx + 1}</span>
                            <span className="font-mono text-gray-700 flex-1 truncate">{studentSan}</span>
                            {sub.reviewed ? (
                              sub.correct
                                ? <span className="flex items-center gap-1 text-emerald-600 font-bold shrink-0"><Check size={10} strokeWidth={3} />Correct</span>
                                : <div className="flex items-center gap-2 shrink-0">
                                    <span className="flex items-center gap-1 text-red-500 font-bold"><X size={10} strokeWidth={3} />Wrong</span>
                                    <span className="text-gray-500">→ <span className="font-mono font-bold">{correctSan}</span></span>
                                  </div>
                            ) : (
                              <span className="text-blue-400 shrink-0">pending</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </>
          )}

          {notSubmittedStudents.length > 0 && (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-1 mt-2">Not Submitted</p>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {notSubmittedStudents.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <p className="text-[12px] text-gray-500 flex-1">{s.name}</p>
                    <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">0/{totalPuzzles}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </motion.div>
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
  // coach review panel
  const [reviewHw,    setReviewHw]    = useState(null);
  // student notifications
  const [notifications, setNotifications] = useState([]);

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

  // Refresh progress + notifications — runs on initial load and after returning from player
  useEffect(() => {
    if (user?.role !== "student" || !user?.id || homework.length === 0) return;
    Promise.all([
      getFullSubmissionsForStudent(user.id),
      getNotificationsForUser(user.id),
    ]).then(([rows, notifs]) => {
      setAllProgress(rows);
      setNotifications(notifs.filter(n => !n.read));
      const map = {};
      homework.forEach(h => {
        const total     = pgns.find(pgn => pgn.id === h.pgnId)?.puzzleCount || 0;
        const hwRows    = rows.filter(r => r.homework_id === h.id);
        const submitted = hwRows.length;
        const correct   = hwRows.filter(r => r.reviewed && r.correct === true).length;
        const wrong     = hwRows.filter(r => r.reviewed && r.correct === false).length;
        if (total > 0) map[h.id] = { submitted, total, correct, wrong };
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
      <div className="bg-[#f6f8fc] p-4 md:p-6 lg:p-8">
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
        notifications={notifications}
        onOpen={setActiveHw}
      />
    );
  }

  // ── List view (coach / admin) ────────────────────────────────────────────────
  return (
    <div className="bg-[#f6f8fc]">
      <AnimatePresence>
        {reviewHw && (
          <CoachReviewPanel
            hw={reviewHw}
            pgns={pgns}
            students={students}
            onClose={() => setReviewHw(null)}
          />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-6">

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
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <button onClick={e => { e.stopPropagation(); setReviewHw(hw); }}
                        className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brand-50 text-brand-600 text-[12px] font-bold hover:bg-brand-100 transition-colors">
                        <BarChart2 size={13} /> Review
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(hw.id); }}
                        className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
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
