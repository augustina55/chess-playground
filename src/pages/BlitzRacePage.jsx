import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Play, Square, Trophy, Zap } from "lucide-react";
import { cn } from "../lib/utils";

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

export default function BlitzRacePage() {
  const [racerPgns, setRacerPgns]         = useState([]);
  const [selectedPgnId, setSelectedPgnId] = useState("");
  const [fen, setFen]                     = useState("");
  const [solution, setSolution]           = useState([]);
  const [solutionStep, setSolutionStep]   = useState(0);
  const [feedback, setFeedback]           = useState("");
  const [score, setScore]                 = useState(0);
  const [timer, setTimer]                 = useState(0);
  const [running, setRunning]             = useState(false);
  const [leaderboard, setLeaderboard]     = useState(MOCK_LB);
  const [allPuzzles, setAllPuzzles]       = useState([]);
  const [currentPuzzleId, setCurrentPuzzleId] = useState(null);
  const [puzzleStatus, setPuzzleStatus]   = useState({});

  const timerInterval    = useRef(null);
  const remainingRef     = useRef([]);
  const scoreRef         = useRef(0);
  const timerRef         = useRef(0);
  const allPuzzlesRef    = useRef([]);
  const puzzleStatusRef  = useRef({});
  const currentPuzzleRef = useRef(null);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { timerRef.current = timer; }, [timer]);
  useEffect(() => { puzzleStatusRef.current = puzzleStatus; }, [puzzleStatus]);

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
    setCurrentPuzzleId(pzl.id);
    setFen(pzl.fen);
    setSolution(pzl.solution);
    setSolutionStep(0);
    setFeedback("Find the best move!");
  }

  function startRace() {
    if (!selectedPgnId) return;
    const puzzles = loadPuzzles().filter(p => p.pgnId === selectedPgnId);
    if (puzzles.length === 0) { setFeedback("No puzzles found. Re-upload this PGN."); return; }
    allPuzzlesRef.current = puzzles;
    puzzleStatusRef.current = {};
    remainingRef.current = shuffle([...puzzles]);
    setAllPuzzles(puzzles);
    setPuzzleStatus({});
    setScore(0); setTimer(0);
    scoreRef.current = 0; timerRef.current = 0;
    clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => setTimer(t => { timerRef.current = t + 1; return t + 1; }), 1000);
    setRunning(true);
    applyPuzzle(remainingRef.current.shift());
  }

  function advanceNext(solvedId) {
    const newStatus = { ...puzzleStatusRef.current, [solvedId]: "correct" };
    puzzleStatusRef.current = newStatus;
    setPuzzleStatus(newStatus);
    if (remainingRef.current.length === 0) {
      const unsolved = allPuzzlesRef.current.filter(p => newStatus[p.id] !== "correct");
      if (unsolved.length === 0) { setRunning(false); clearInterval(timerInterval.current); setFeedback("All puzzles solved! 🎉"); pushLB(); return; }
      remainingRef.current = shuffle(unsolved);
    }
    applyPuzzle(remainingRef.current.shift());
  }

  function pushLB() {
    const s = scoreRef.current, t = fmt(timerRef.current);
    setLeaderboard(prev => [...prev.filter(e => e.name !== "You"), { name: "You", score: s, time: t }].sort((a, b) => b.score - a.score));
  }

  function stopRace() { setRunning(false); clearInterval(timerInterval.current); pushLB(); setFeedback(`Race stopped — Score: ${scoreRef.current}`); }

  function onDrop({ sourceSquare, targetSquare }) {
    if (!running || !fen || solution.length === 0) return false;
    const uci = sourceSquare + targetSquare;
    const expected = solution[solutionStep].slice(0, 4);
    if (uci !== expected) {
      const id = currentPuzzleRef.current?.id;
      if (id && puzzleStatusRef.current[id] !== "correct") {
        const upd = { ...puzzleStatusRef.current, [id]: "wrong" };
        puzzleStatusRef.current = upd; setPuzzleStatus(upd);
      }
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
      setLeaderboard(prev => [...prev.filter(e => e.name !== "You"), { name: "You", score: ns, time: fmt(timerRef.current) }].sort((a, b) => b.score - a.score));
      setFeedback("Correct! +1 — Next puzzle...");
      const sid = currentPuzzleRef.current?.id;
      setTimeout(() => advanceNext(sid), 900); return true;
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
  const feedbackType = feedback.includes("Correct") || feedback.includes("Good") ? "good" : feedback.includes("Wrong") ? "bad" : "neutral";

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main */}
      <div className="flex-1 flex flex-col p-8 md:p-10 overflow-y-auto border-r border-black/[0.05] dark:border-white/[0.05] min-w-0">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
            <Zap size={20} className="text-brand-500" />Blitz Race
          </h1>
          {!running ? (
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={selectedPgnId}
                onChange={e => setSelectedPgnId(e.target.value)}
                disabled={racerPgns.length === 0}
                className="px-4 py-2.5 text-[14px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 min-w-44"
              >
                {racerPgns.length === 0
                  ? <option>No racer PGNs uploaded</option>
                  : racerPgns.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}
              </select>
              <button onClick={startRace} disabled={!selectedPgnId || racerPgns.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[14px] font-semibold transition-colors shadow-sm">
                <Play size={14} />Start
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-slate-700 dark:text-slate-300 font-mono tabular-nums">⏱ {fmt(timer)}</span>
              <span className="px-4 py-2 rounded-2xl bg-brand-600 text-white font-bold text-[14px]">Score: {score}</span>
              <button onClick={stopRace} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-terra-700 hover:bg-terra-900 text-white text-[14px] font-semibold transition-colors">
                <Square size={14} />Stop
              </button>
            </div>
          )}
        </div>

        {racerPgns.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="max-w-sm text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)]">
              <p className="text-[14px] text-slate-500 dark:text-slate-400">No racer PGNs found. Go to <strong>PGN Center</strong>, upload a PGN with type <strong>Racer</strong>.</p>
            </div>
          </div>
        ) : (
          <>
            {selectedPgn && !running && (
              <p className="text-[13px] text-slate-400 mb-5">📦 {poolCount} puzzles — "{selectedPgn.name}"</p>
            )}
            {/* Feedback */}
            <div className={cn(
              "px-5 py-4 rounded-2xl text-[14px] font-semibold mb-6 border transition-colors",
              feedbackType === "good"   ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              : feedbackType === "bad" ? "bg-terra-50 dark:bg-terra-900/20 text-terra-700 dark:text-terra-400 border-terra-200 dark:border-terra-900"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-black/[0.06] dark:border-white/[0.06]"
            )}>
              {feedback || "Select a PGN and press Start."}
            </div>
            {/* Board */}
            {fen && (
              <div className="rounded-2xl overflow-hidden shadow-xl max-w-[480px]">
                <Chessboard options={{
                  position: fen, onPieceDrop: onDrop, arePiecesDraggable: running,
                  darkSquareStyle: { backgroundColor: "#b45309" },
                  lightSquareStyle: { backgroundColor: "#fde68a" },
                }} />
              </div>
            )}
            {/* Puzzle grid */}
            {allPuzzles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 max-h-32 overflow-y-auto">
                {allPuzzles.map((p, i) => {
                  const st = puzzleStatus[p.id];
                  const isCur = p.id === currentPuzzleId;
                  return (
                    <div key={p.id} title={p.name}
                      className={cn(
                        "w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center border-2 transition-colors",
                        st === "correct" ? "bg-emerald-500 border-emerald-500 text-white"
                        : st === "wrong" ? "bg-terra-700 border-terra-700 text-white"
                        : isCur         ? "bg-brand-500 border-brand-500 text-white"
                        : "bg-white dark:bg-slate-800 border-black/[0.08] dark:border-white/[0.08] text-slate-400"
                      )}>{i + 1}</div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Leaderboard */}
      <div className="w-56 shrink-0 p-6 bg-white dark:bg-slate-900 border-l border-black/[0.05] dark:border-white/[0.05] overflow-y-auto">
        <div className="flex items-center gap-2.5 mb-5">
          <Trophy size={15} className="text-amber-500" />
          <h2 className="font-bold text-[14px] text-slate-800 dark:text-slate-200">Leaderboard</h2>
        </div>
        <div className="space-y-2">
          {leaderboard.map((e, i) => (
            <div key={i} className={cn(
              "flex items-center gap-2.5 p-3 rounded-2xl text-[13px] border",
              e.name === "You"
                ? "bg-brand-50 dark:bg-brand-900/40 border-brand-200 dark:border-brand-800 font-bold"
                : "bg-slate-50 dark:bg-slate-800/60 border-black/[0.06] dark:border-white/[0.04]"
            )}>
              <span className="w-5 text-slate-400 font-mono text-[12px]">{i + 1}</span>
              <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{e.name}</span>
              <span className="font-bold text-brand-600 dark:text-brand-400">{e.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
