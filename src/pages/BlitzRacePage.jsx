import { useState, useRef, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Play, Square, Trophy, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { BOARD_THEMES } from "../lib/boardThemes";
import racerPgnText from "../assets/racer_puzzles.pgn?raw";
import { getRaceLeaderboard, saveRaceScore } from "../lib/db";

// ── PGN parser ────────────────────────────────────────────────────────────────

function parsePgn(pgnText) {
  const puzzles = [];
  const games = pgnText.split(/(?=\[Event\s)/).filter(g => g.trim());

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const fenMatch = game.match(/\[FEN "([^"]+)"\]/);
    if (!fenMatch) continue;
    const fen = fenMatch[1];

    const moveSection = game
      .replace(/\[.*?\]/gs, "")   // strip headers
      .replace(/\{[^}]*\}/g, "")  // strip comments
      .replace(/\([^)]*\)/g, "")  // strip variations
      .replace(/\$\d+/g, "")      // strip NAGs
      .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
      .trim();

    const tokens = moveSection.split(/\s+/).filter(t => t && !t.match(/^\d+\.+$/));

    const chess = new Chess(fen);
    const uci = [];
    for (const san of tokens) {
      try {
        const mv = chess.move(san);
        if (!mv) break;
        uci.push(mv.from + mv.to + (mv.promotion || ""));
      } catch { break; }
    }

    if (uci.length > 0) puzzles.push({ id: `p${i}`, fen, solution: uci });
  }
  return puzzles;
}

let SOURCE_PUZZLES = [];
try { SOURCE_PUZZLES = parsePgn(racerPgnText); } catch (e) { console.error("PGN parse error:", e); }

// ── helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ── Circular timer ────────────────────────────────────────────────────────────

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
            stroke={running ? "#ea580c" : "#e5e7eb"} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={running ? circ * 0.25 : circ}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        {running && (
          <motion.div className="absolute inset-0 rounded-full border-4 border-brand-400/20"
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BlitzRacePage() {
  const { user }   = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

  const [fen,            setFen]          = useState("");
  const [orientation,    setOrientation]  = useState("white");
  const [solution,       setSolution]     = useState([]);
  const [solutionStep,   setSolutionStep] = useState(0);
  const [feedback,       setFeedback]     = useState("");
  const [score,          setScore]        = useState(0);
  const [wrongCount,     setWrongCount]   = useState(0);
  const [timer,          setTimer]        = useState(0);
  const [running,        setRunning]      = useState(false);
  const [leaderboard,    setLeaderboard]  = useState([]);
  const [selectedSq,     setSelectedSq]   = useState(null);
  const [squareStyles,   setSquareStyles] = useState({});

  const timerInterval   = useRef(null);
  const remainingRef    = useRef([]);
  const scoreRef        = useRef(0);
  const wrongRef        = useRef(0);
  const timerRef        = useRef(0);
  const allPuzzlesRef   = useRef([]);
  const puzzleStatusRef = useRef({});
  const currentPuzzleRef = useRef(null);
  const processingRef   = useRef(false);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { timerRef.current = timer;  }, [timer]);
  useEffect(() => () => clearInterval(timerInterval.current), []);

  // Load leaderboard from DB on mount
  useEffect(() => {
    getRaceLeaderboard(10).then(scores => {
      setLeaderboard(scores.map(e => ({ name: e.name, score: e.score, time: e.time })));
    });
  }, []);

  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

  function applyPuzzle(pzl) {
    processingRef.current = false;
    currentPuzzleRef.current = pzl;
    setFen(pzl.fen);
    setOrientation(new Chess(pzl.fen).turn() === "b" ? "black" : "white");
    setSolution(pzl.solution);
    setSolutionStep(0);
    setFeedback("Find the best move!");
  }

  function startRace() {
    if (SOURCE_PUZZLES.length === 0) { setFeedback("No puzzles found in asset file."); return; }
    const puzzles = shuffle([...SOURCE_PUZZLES]);
    allPuzzlesRef.current   = puzzles;
    puzzleStatusRef.current = {};
    remainingRef.current    = [...puzzles];
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

  async function pushLB() {
    const s    = scoreRef.current;
    const t    = timerRef.current;
    const tFmt = fmt(t);
    const name = user?.name || "Anonymous";

    // Optimistic update
    setLeaderboard(prev =>
      [...prev.filter(e => e.name !== name), { name, score: s, time: tFmt }]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
    );

    try {
      await saveRaceScore({
        userId:      user?.id   || null,
        userName:    name,
        score:       s,
        wrongCount:  wrongRef.current,
        timeSeconds: t,
        timeFmt:     tFmt,
      });
      // Refresh from DB to get global leaderboard
      const fresh = await getRaceLeaderboard(10);
      setLeaderboard(fresh.map(e => ({ name: e.name, score: e.score, time: e.time })));
    } catch (err) {
      console.error("Failed to save race score:", err);
    }
  }

  function stopRace() {
    setRunning(false); clearInterval(timerInterval.current);
    pushLB(); setFeedback(`Race stopped — Score: ${scoreRef.current}`);
  }

  // ── square highlighting ──────────────────────────────────────────────────────

  function computeSquareStyles(square, currentFen) {
    const game  = new Chess(currentFen);
    const moves = game.moves({ square, verbose: true });
    const styles = {
      [square]: { backgroundColor: "rgba(234, 88, 12, 0.70)" },
    };
    moves.forEach(m => {
      styles[m.to] = {
        backgroundColor: game.get(m.to)
          ? "rgba(234, 88, 12, 0.50)"   // capture destination
          : "rgba(0, 0, 0, 0.22)",      // empty destination
      };
    });
    return styles;
  }

  function clearSelection() { setSelectedSq(null); setSquareStyles({}); }

  // Clear highlights whenever position changes (new puzzle / opponent move)
  useEffect(() => { clearSelection(); }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── shared move handler ──────────────────────────────────────────────────────
  // Returns: "invalid" | "wrong" | "correct"

  function handleMove(from, to) {
    if (processingRef.current || !running || !fen || !solution.length) return "invalid";

    // 1. Check chess legality first
    const testGame = new Chess(fen);
    let testMove;
    try { testMove = testGame.move({ from, to, promotion: "q" }); } catch { testMove = null; }
    if (!testMove) return "invalid";   // illegal chess move — snap back, do nothing

    // 2. Check solution match
    const uci      = from + to;
    const expected = solution[solutionStep].slice(0, 4);

    if (uci !== expected) {
      // Valid chess move but wrong solution → count wrong + go to next puzzle
      const id = currentPuzzleRef.current?.id;
      if (id && puzzleStatusRef.current[id] !== "correct")
        puzzleStatusRef.current = { ...puzzleStatusRef.current, [id]: "wrong" };
      const nw = wrongRef.current + 1; wrongRef.current = nw; setWrongCount(nw);
      setFeedback("Wrong! Moving to next puzzle...");
      processingRef.current = true;
      const sid = currentPuzzleRef.current?.id;
      setTimeout(() => advanceNext(sid), 700);
      return "wrong";
    }

    // 3. Correct — apply with proper promotion char from solution
    const game = new Chess(fen);
    let move;
    try { move = game.move({ from, to, promotion: solution[solutionStep][4] || "q" }); }
    catch { return "invalid"; }
    if (!move) return "invalid";

    const newFen   = game.fen();
    const nextStep = solutionStep + 1;

    if (nextStep >= solution.length) {
      setFen(newFen);
      const ns = scoreRef.current + 1; setScore(ns); scoreRef.current = ns;
      setFeedback("Correct! +1");
      processingRef.current = true;
      setTimeout(() => advanceNext(currentPuzzleRef.current?.id), 800);
      return "correct";
    }

    // Show player's move, then delay opponent response
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

  function onDrop({ sourceSquare, targetSquare }) {
    clearSelection();
    const result = handleMove(sourceSquare, targetSquare);
    // return false = piece snaps back; return true = board accepts position
    return result === "correct";
  }

  function onSquareClick({ piece, square }) {
    if (!running) return;

    if (selectedSq) {
      if (selectedSq === square) { clearSelection(); return; }

      const result = handleMove(selectedSq, square);
      clearSelection();

      if (result === "invalid") {
        // Maybe the user wants to select a different own piece
        const game = new Chess(fen);
        const p    = game.get(square);
        if (p && p.color === game.turn()) {
          setSelectedSq(square);
          setSquareStyles(computeSquareStyles(square, fen));
        }
      }
      return;
    }

    // Select own piece
    const game = new Chess(fen);
    const p    = game.get(square);
    if (p && p.color === game.turn()) {
      setSelectedSq(square);
      setSquareStyles(computeSquareStyles(square, fen));
    }
  }

  const feedbackType = feedback.includes("Correct") || feedback.includes("Good") || feedback.includes("solved")
    ? "good" : feedback.includes("Wrong") ? "bad" : "neutral";

  return (
    <div className="flex bg-white overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>

      {/* ── Board column ── */}
      <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden p-4">
        <div style={{ width: "min(70%, calc(100vh - 140px))", maxWidth: "min(70%, calc(100vh - 140px))" }}>
          <div className="overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <Chessboard options={{
              position: fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
              boardOrientation: orientation,
              onPieceDrop: onDrop,
              onSquareClick: onSquareClick,
              allowDragging: running,
              canDragPiece: ({ piece }) => {
                if (!running || !fen) return false;
                return piece.pieceType[0] === new Chess(fen).turn();
              },
              dragActivationDistance: 3,
              squareStyles: squareStyles,
              darkSquareStyle:  { backgroundColor: boardTheme.dark },
              lightSquareStyle: { backgroundColor: boardTheme.light },
              boardStyle: { borderRadius: 0 },
            }} />
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-[340px] shrink-0 flex flex-col gap-4 p-4 overflow-y-auto">

        {/* ── Stats + timer card ── */}
        <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex gap-8">
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Correct</p>
                <p className="text-[34px] font-black text-emerald-500 leading-none">{score}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400 mb-1">Wrong</p>
                <p className="text-[34px] font-black text-red-500 leading-none">{wrongCount}</p>
              </div>
            </div>
            {/* Timer badge */}
            <div className="flex flex-col items-center justify-center w-20 h-16 rounded-[16px] border-2 border-gray-100 bg-gray-50 shrink-0">
              <p className="text-[22px] font-black text-gray-900 font-mono leading-none">{fmt(timer)}</p>
              <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-wide">{running ? "running" : "stopped"}</p>
            </div>
          </div>

          {/* Start / Stop */}
          {!running ? (
            <button onClick={startRace}
              className="w-full h-11 rounded-2xl bg-[#f97316] hover:bg-[#ea6c00] text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20">
              <Play size={15} />Start Race
            </button>
          ) : (
            <button onClick={stopRace}
              className="w-full h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-colors">
              <Square size={13} />Stop Race
            </button>
          )}
        </div>

        {/* ── Feedback + leaderboard card ── */}
        <div className="bg-white border border-gray-200 rounded-[20px] shadow-sm p-5 flex flex-col gap-5">

          {/* Feedback */}
          <div className="flex flex-col items-center py-4 border-b border-gray-100">
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
                <p className={cn("text-[20px] font-black leading-tight",
                  feedbackType === "good" ? "text-gray-900"
                  : feedbackType === "bad" ? "text-red-600"
                  : "text-gray-700")}>
                  {feedbackType === "good" ? "Correct !!"
                  : feedbackType === "bad" ? "Wrong!"
                  : running ? "Your turn" : "Ready?"}
                </p>
                <p className="text-[12px] text-gray-400 text-center">
                  {feedbackType === "good" ? "Great job! Keep it going."
                  : feedbackType === "bad" ? "Next puzzle coming up."
                  : running ? "Find the best move!" : "Press Start Race to begin."}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={13} className="text-amber-500" />
              <p className="text-[12px] font-bold text-gray-500">Leaderboard</p>
            </div>
            <div className="space-y-1.5">
              {leaderboard.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-2">No scores yet</p>
              ) : leaderboard.map((e, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] border",
                  e.name === user?.name ? "bg-orange-50 border-orange-200 font-bold" : "bg-gray-50 border-gray-100"
                )}>
                  <span className="w-5 text-center text-[11px] shrink-0 font-bold text-gray-500">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="flex-1 text-gray-700 truncate">{e.name}</span>
                  <span className={cn("font-bold shrink-0", e.name === user?.name ? "text-[#f97316]" : "text-gray-500")}>{e.score}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
