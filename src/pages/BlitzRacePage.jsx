import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Play, Square, Trophy, Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { BOARD_THEMES } from "../lib/boardThemes";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadPgns()    { try { return JSON.parse(localStorage.getItem("ca_pgns")    || "[]"); } catch { return []; } }
function loadPuzzles() { try { return JSON.parse(localStorage.getItem("ca_puzzles") || "[]"); } catch { return []; } }

const MOCK_LB = [
  { name: "Magnus",  score: 14, time: "1:32" },
  { name: "Hikaru",  score: 12, time: "1:48" },
  { name: "Fabiano", score: 10, time: "2:05" },
];

// ── Circular timer ─────────────────────────────────────────────────────────────

function RoundTimer({ timer, running, fmt }) {
  const radius = 52;
  const circ   = 2 * Math.PI * radius;

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-5 flex flex-col items-center gap-2">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Timer</p>
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="64" cy="64" r={radius} fill="none"
            stroke={running ? "#ea580c" : "#e5e7eb"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={running ? circ * 0.25 : circ}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        {running && (
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-brand-400/20"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        )}
        <div className="relative text-center z-10">
          <p className="text-[26px] font-black text-gray-900 font-mono leading-none">{fmt(timer)}</p>
          <p className="text-[10px] font-bold text-gray-400 mt-1">{running ? "running" : "stopped"}</p>
        </div>
      </div>
    </div>
  );
}

export default function BlitzRacePage() {
  const { user }       = useAuth();
  const boardTheme     = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

  const [racerPgns,      setRacerPgns]      = useState([]);
  const [selectedPgnId,  setSelectedPgnId]  = useState("");
  const [fen,            setFen]            = useState("");
  const [solution,       setSolution]       = useState([]);
  const [solutionStep,   setSolutionStep]   = useState(0);
  const [feedback,       setFeedback]       = useState("");
  const [score,          setScore]          = useState(0);
  const [wrongCount,     setWrongCount]     = useState(0);
  const [timer,          setTimer]          = useState(0);
  const [running,        setRunning]        = useState(false);
  const [leaderboard,    setLeaderboard]    = useState(MOCK_LB);

  const timerInterval    = useRef(null);
  const remainingRef     = useRef([]);
  const scoreRef         = useRef(0);
  const wrongRef         = useRef(0);
  const timerRef         = useRef(0);
  const allPuzzlesRef    = useRef([]);
  const puzzleStatusRef  = useRef({});
  const currentPuzzleRef = useRef(null);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { timerRef.current = timer;  }, [timer]);

  useEffect(() => {
    const all    = loadPgns();
    const racers = all.filter(p => p.type === "racer");
    setRacerPgns(racers);
    if (racers.length > 0) setSelectedPgnId(racers[0].id);
    return () => clearInterval(timerInterval.current);
  }, []);

  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

  function applyPuzzle(pzl) {
    currentPuzzleRef.current = pzl;
    setFen(pzl.fen);
    setSolution(pzl.solution);
    setSolutionStep(0);
    setFeedback("Find the best move!");
  }

  function startRace() {
    if (!selectedPgnId) return;
    const puzzles = loadPuzzles().filter(p => p.pgnId === selectedPgnId);
    if (puzzles.length === 0) { setFeedback("No puzzles found. Re-upload this PGN."); return; }
    allPuzzlesRef.current   = puzzles;
    puzzleStatusRef.current = {};
    remainingRef.current    = shuffle([...puzzles]);
    setScore(0); setWrongCount(0); setTimer(0);
    scoreRef.current = 0; wrongRef.current = 0; timerRef.current = 0;
    clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => setTimer(t => { timerRef.current = t + 1; return t + 1; }), 1000);
    setRunning(true);
    applyPuzzle(remainingRef.current.shift());
  }

  function advanceNext(solvedId) {
    const newStatus = { ...puzzleStatusRef.current, [solvedId]: "correct" };
    puzzleStatusRef.current = newStatus;
    if (remainingRef.current.length === 0) {
      const unsolved = allPuzzlesRef.current.filter(p => newStatus[p.id] !== "correct");
      if (unsolved.length === 0) {
        setRunning(false); clearInterval(timerInterval.current);
        setFeedback("All puzzles solved! 🎉"); pushLB(); return;
      }
      remainingRef.current = shuffle(unsolved);
    }
    applyPuzzle(remainingRef.current.shift());
  }

  function pushLB() {
    const s = scoreRef.current, t = fmt(timerRef.current);
    setLeaderboard(prev =>
      [...prev.filter(e => e.name !== "You"), { name: "You", score: s, time: t }]
        .sort((a, b) => b.score - a.score)
    );
  }

  function stopRace() {
    setRunning(false); clearInterval(timerInterval.current);
    pushLB(); setFeedback(`Race stopped — Score: ${scoreRef.current}`);
  }

  function onDrop({ sourceSquare, targetSquare }) {
    if (!running || !fen || solution.length === 0) return false;
    const uci      = sourceSquare + targetSquare;
    const expected = solution[solutionStep].slice(0, 4);
    if (uci !== expected) {
      const id = currentPuzzleRef.current?.id;
      if (id && puzzleStatusRef.current[id] !== "correct") {
        puzzleStatusRef.current = { ...puzzleStatusRef.current, [id]: "wrong" };
      }
      const nw = wrongRef.current + 1; wrongRef.current = nw; setWrongCount(nw);
      setFeedback("Wrong! Try again."); return false;
    }
    const game = new Chess(fen);
    let move;
    try { move = game.move({ from: sourceSquare, to: targetSquare, promotion: solution[solutionStep][4] || "q" }); } catch { return false; }
    if (!move) return false;
    const newFen = game.fen(), nextStep = solutionStep + 1;
    if (nextStep >= solution.length) {
      setFen(newFen);
      const ns = scoreRef.current + 1; setScore(ns); scoreRef.current = ns;
      setLeaderboard(prev =>
        [...prev.filter(e => e.name !== "You"), { name: "You", score: ns, time: fmt(timerRef.current) }]
          .sort((a, b) => b.score - a.score)
      );
      setFeedback("Correct! +1");
      const sid = currentPuzzleRef.current?.id;
      setTimeout(() => advanceNext(sid), 800); return true;
    }
    const opp = solution[nextStep], g2 = new Chess(newFen);
    let oppOk = false;
    try { oppOk = !!g2.move({ from: opp.slice(0, 2), to: opp.slice(2, 4), promotion: opp[4] || "q" }); } catch { /**/ }
    setFen(oppOk ? g2.fen() : newFen);
    setSolutionStep(oppOk ? nextStep + 1 : nextStep);
    setFeedback("Good! Keep going..."); return true;
  }

  const selectedPgn  = racerPgns.find(p => p.id === selectedPgnId);
  const poolCount    = selectedPgnId ? loadPuzzles().filter(p => p.pgnId === selectedPgnId).length : 0;
  const feedbackType = feedback.includes("Correct") || feedback.includes("Good") || feedback.includes("solved")
    ? "good" : feedback.includes("Wrong") ? "bad" : "neutral";

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Setup bar — only shown before race starts */}
        {!running && (
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {racerPgns.length > 0 && (
              <div className="relative">
                <select value={selectedPgnId} onChange={e => setSelectedPgnId(e.target.value)}
                  className="h-11 pl-4 pr-10 rounded-2xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 outline-none appearance-none focus:border-brand-500 min-w-44">
                  {racerPgns.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
            <button onClick={startRace} disabled={!selectedPgnId || racerPgns.length === 0}
              className="flex items-center gap-2 h-11 px-6 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-bold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50">
              <Play size={15} />Start Race
            </button>
            {selectedPgn && (
              <span className="text-[13px] text-gray-400">{poolCount} puzzles in "{selectedPgn.name}"</span>
            )}
          </div>
        )}

        {racerPgns.length === 0 ? (
          <div className="rounded-[28px] bg-white border border-gray-200 py-24 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-16 h-16 rounded-[20px] bg-orange-500/10 flex items-center justify-center mb-4">
              <Zap size={26} className="text-orange-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No Racer PGNs Found</h3>
            <p className="text-gray-400 text-sm max-w-xs">Go to PGN Center, upload a PGN and set its type to <strong>Racer</strong> to get started.</p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Left — board */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Feedback — only shown when there's a message */}
              <AnimatePresence mode="wait">
                {feedback && (
                  <motion.div key={feedback}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cn(
                      "px-5 py-3.5 rounded-[18px] text-[14px] font-semibold border",
                      feedbackType === "good" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : feedbackType === "bad" ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-white text-gray-600 border-gray-200"
                    )}>
                    {feedback}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Board — capped so it never exceeds viewport height */}
              <div style={{ width: "min(100%, calc(100vh - 260px))", maxWidth: 540 }}>
                {fen ? (
                  <div className="overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
                    <Chessboard options={{
                      position: fen,
                      boardOrientation: fen.split(" ")[1] === "b" ? "black" : "white",
                      onPieceDrop: onDrop,
                      arePiecesDraggable: running,
                      darkSquareStyle:  { backgroundColor: boardTheme.dark },
                      lightSquareStyle: { backgroundColor: boardTheme.light },
                      boardStyle: { borderRadius: 0 },
                    }} />
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Chessboard options={{
                      position: "start",
                      arePiecesDraggable: false,
                      darkSquareStyle:  { backgroundColor: boardTheme.dark },
                      lightSquareStyle: { backgroundColor: boardTheme.light },
                      boardStyle: { borderRadius: 0 },
                    }} />
                  </div>
                )}
              </div>
            </div>

            {/* Right — stats + leaderboard */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">

              {/* Circular timer + stop */}
              <div className="space-y-3">
                <RoundTimer timer={timer} running={running} fmt={fmt} />
                {running && (
                  <button onClick={stopRace}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold transition-colors">
                    <Square size={13} />Stop Race
                  </button>
                )}
              </div>

              {/* Correct / Wrong */}
              <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3 text-center">Score</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center py-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[32px] font-black text-emerald-600 leading-none">{score}</span>
                    <span className="text-[11px] font-bold text-emerald-500 mt-1.5 uppercase tracking-wide">Correct</span>
                  </div>
                  <div className="flex flex-col items-center py-4 rounded-2xl bg-red-50 border border-red-100">
                    <span className="text-[32px] font-black text-red-500 leading-none">{wrongCount}</span>
                    <span className="text-[11px] font-bold text-red-400 mt-1.5 uppercase tracking-wide">Wrong</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Trophy size={13} className="text-amber-500" />
                  </div>
                  <h2 className="font-black text-[13px] text-gray-900">Leaderboard</h2>
                </div>
                <div className="p-3 space-y-1.5">
                  {leaderboard.map((e, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] border",
                      e.name === "You" ? "bg-brand-50 border-brand-200 font-bold" : "bg-gray-50 border-gray-100"
                    )}>
                      <span className={cn("w-5 text-center font-mono text-[11px] font-black shrink-0",
                        i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-700" : "text-gray-300"
                      )}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <span className="flex-1 text-gray-700 truncate">{e.name}</span>
                      <span className={cn("font-bold shrink-0", e.name === "You" ? "text-brand-600" : "text-gray-500")}>{e.score}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
