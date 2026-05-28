import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Play, Square, Trophy, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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

export default function BlitzRacePage() {
  const { user }                           = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

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
      if (unsolved.length === 0) { setRunning(false); clearInterval(timerInterval.current); setFeedback("All puzzles solved!"); pushLB(); return; }
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
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-orange-500 via-brand-500 to-violet-600 p-8 md:p-10 shadow-[0_20px_80px_rgba(99,102,241,0.25)] mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium mb-5">
                <Sparkles size={15} />Blitz Race Mode
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">Blitz Race</h1>
              <p className="text-white/70 text-base mt-4 max-w-xl">
                {running ? `Score: ${score} · ${fmt(timer)} elapsed` : "Solve puzzles as fast as you can to climb the leaderboard"}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap shrink-0">
              {!running ? (
                <>
                  <select
                    value={selectedPgnId}
                    onChange={e => setSelectedPgnId(e.target.value)}
                    disabled={racerPgns.length === 0}
                    className="h-12 px-4 rounded-2xl border border-white/20 bg-white/10 text-white text-sm font-semibold backdrop-blur min-w-44 outline-none"
                  >
                    {racerPgns.length === 0
                      ? <option>No racer PGNs uploaded</option>
                      : racerPgns.map(p => <option key={p.id} value={p.id} className="text-gray-900">{p.id} — {p.name}</option>)}
                  </select>
                  <button onClick={startRace} disabled={!selectedPgnId || racerPgns.length === 0}
                    className="h-12 px-7 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-50">
                    <Play size={15} />Start Race
                  </button>
                </>
              ) : (
                <>
                  <div className="h-12 px-5 rounded-2xl bg-white/10 border border-white/20 text-white font-mono font-bold text-lg flex items-center gap-2">
                    <span className="text-sm font-normal">⏱</span>{fmt(timer)}
                  </div>
                  <div className="h-12 px-5 rounded-2xl bg-white/20 border border-white/20 text-white font-bold text-sm flex items-center">
                    Score: {score}
                  </div>
                  <button onClick={stopRace} className="h-12 px-6 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center gap-2 transition-colors">
                    <Square size={14} />Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main board area */}
          <div className="flex-1 min-w-0 space-y-5">
            {racerPgns.length === 0 ? (
              <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 rounded-[20px] bg-orange-500/10 flex items-center justify-center mb-4">
                  <Zap size={26} className="text-orange-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">No Racer PGNs Found</h3>
                <p className="text-gray-400 text-sm max-w-xs">Go to PGN Center, upload a PGN and set its type to <strong>Racer</strong> to get started.</p>
              </div>
            ) : (
              <>
                {selectedPgn && !running && (
                  <p className="text-[13px] text-gray-400 px-1">{poolCount} puzzles in "{selectedPgn.name}"</p>
                )}

                {/* Feedback bar */}
                <motion.div
                  key={feedback}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "px-6 py-4 rounded-[20px] text-[14px] font-semibold border",
                    feedbackType === "good"   ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : feedbackType === "bad"  ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-white text-gray-600 border-gray-200"
                  )}
                >
                  {feedback || "Select a PGN and press Start."}
                </motion.div>

                {/* Chessboard */}
                {fen && (
                  <div className="overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.10)] max-w-[500px]">
                    <Chessboard
                      position={fen}
                      onPieceDrop={onDrop}
                      arePiecesDraggable={running}
                      customDarkSquareStyle={{ backgroundColor: boardTheme.dark }}
                      customLightSquareStyle={{ backgroundColor: boardTheme.light }}
                      customBoardStyle={{ borderRadius: 0 }}
                    />
                  </div>
                )}

                {/* Puzzle tracker */}
                {allPuzzles.length > 0 && (
                  <div className="bg-white rounded-[20px] border border-gray-200 p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">Puzzle Progress</p>
                    <div className="flex flex-wrap gap-2">
                      {allPuzzles.map((p, i) => {
                        const st = puzzleStatus[p.id];
                        const isCur = p.id === currentPuzzleId;
                        return (
                          <div key={p.id} title={p.name}
                            className={cn(
                              "w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center border-2 transition-colors",
                              st === "correct" ? "bg-emerald-500 border-emerald-500 text-white"
                              : st === "wrong" ? "bg-red-500 border-red-500 text-white"
                              : isCur         ? "bg-brand-500 border-brand-500 text-white"
                              : "bg-gray-50 border-gray-200 text-gray-400"
                            )}>{i + 1}</div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full lg:w-64 shrink-0 bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Trophy size={15} className="text-amber-500" />
              </div>
              <h2 className="font-black text-[14px] text-gray-900">Leaderboard</h2>
            </div>
            <div className="p-4 space-y-2">
              {leaderboard.map((e, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-3 p-3.5 rounded-2xl text-[13px] border",
                  e.name === "You"
                    ? "bg-brand-50 border-brand-200 font-bold"
                    : "bg-gray-50 border-gray-100"
                )}>
                  <span className={cn("w-6 text-center font-mono text-[12px] font-bold",
                    i === 0 ? "text-amber-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-700" : "text-gray-300"
                  )}>{i + 1}</span>
                  <span className="flex-1 text-gray-700 truncate">{e.name}</span>
                  <span className={cn("font-bold", e.name === "You" ? "text-brand-600" : "text-gray-500")}>{e.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
