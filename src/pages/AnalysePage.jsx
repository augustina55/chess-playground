import { useState, useEffect, useRef, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  RotateCcw, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  Cpu, Edit3, Copy, Check, RefreshCw,
} from "lucide-react";
import { cn } from "../lib/utils";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.min.js";

function spawnEngine() {
  const blob = new Blob([`importScripts('${SF_CDN}')`], { type: "text/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

function flipTurn(fen) {
  const p = fen.split(" ");
  p[1] = p[1] === "w" ? "b" : "w";
  p[3] = "-";
  return p.join(" ");
}

// FEN → v5 position object { [sq]: { pieceType: "wP" } }
function fenToPositionObj(fen) {
  const pos = {};
  const rows = fen.split(" ")[0].split("/");
  const files = "abcdefgh";
  const pieceMap = {
    P: "wP", N: "wN", B: "wB", R: "wR", Q: "wQ", K: "wK",
    p: "bP", n: "bN", b: "bB", r: "bR", q: "bQ", k: "bK",
  };
  rows.forEach((row, ri) => {
    let fi = 0;
    for (const ch of row) {
      if ("12345678".includes(ch)) { fi += parseInt(ch); }
      else {
        const sq = files[fi] + (8 - ri);
        if (pieceMap[ch]) pos[sq] = { pieceType: pieceMap[ch] };
        fi++;
      }
    }
  });
  return pos;
}

const PIECE_PALETTE = [
  { key: "wK", sym: "♔" }, { key: "wQ", sym: "♕" }, { key: "wR", sym: "♖" },
  { key: "wB", sym: "♗" }, { key: "wN", sym: "♘" }, { key: "wP", sym: "♙" },
  { key: "bK", sym: "♚" }, { key: "bQ", sym: "♛" }, { key: "bR", sym: "♜" },
  { key: "bB", sym: "♝" }, { key: "bN", sym: "♞" }, { key: "bP", sym: "♟" },
];

function useEngine(enabled, fen) {
  const [info, setInfo] = useState(null);
  const [ready, setReady] = useState(false);
  const workerRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      workerRef.current?.terminate();
      workerRef.current = null;
      setInfo(null);
      setReady(false);
      return;
    }
    const w = spawnEngine();
    workerRef.current = w;
    let initialized = false;
    w.onmessage = (e) => {
      const msg = e.data;
      if (!initialized && msg.includes("uciok")) { w.postMessage("isready"); }
      if (msg.includes("readyok")) { initialized = true; setReady(true); }
      if (msg.startsWith("info") && msg.includes("score")) {
        const depthM = msg.match(/depth (\d+)/);
        const cpM    = msg.match(/score cp (-?\d+)/);
        const mateM  = msg.match(/score mate (-?\d+)/);
        const pvM    = msg.match(/ pv (.+)/);
        setInfo(prev => ({
          ...prev,
          depth:  depthM ? parseInt(depthM[1]) : prev?.depth,
          score:  cpM ? parseInt(cpM[1]) : mateM ? (parseInt(mateM[1]) > 0 ? 9999 : -9999) : prev?.score,
          isMate: !!mateM,
          mateIn: mateM ? parseInt(mateM[1]) : null,
          pv:     pvM ? pvM[1].trim().split(" ").slice(0, 6) : prev?.pv,
        }));
      }
      if (msg.startsWith("bestmove")) {
        const bm = msg.split(" ")[1];
        if (bm && bm !== "(none)") setInfo(prev => ({ ...prev, bestMove: bm }));
      }
    };
    w.postMessage("uci");
    return () => { w.terminate(); workerRef.current = null; setReady(false); setInfo(null); };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !workerRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      workerRef.current?.postMessage("stop");
      workerRef.current?.postMessage(`position fen ${fen}`);
      workerRef.current?.postMessage("go movetime 3000 depth 22");
      setInfo(prev => prev ? { ...prev, bestMove: null } : null);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [ready, fen]);

  return { info, ready };
}

// Horizontal eval bar for right panel
function EvalBar({ score, isMate, mateIn }) {
  const whitePct = useMemo(() => {
    if (isMate) return mateIn > 0 ? 100 : 0;
    const s = Math.max(-1500, Math.min(1500, score ?? 0));
    return 50 + (s / 1500) * 50;
  }, [score, isMate, mateIn]);

  const label = useMemo(() => {
    if (score === undefined || score === null) return "0.0";
    if (isMate) return `#${Math.abs(mateIn)}`;
    const sign = score > 0 ? "+" : "";
    return `${sign}${(score / 100).toFixed(2)}`;
  }, [score, isMate, mateIn]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
        <span>Black</span>
        <span className="font-black text-[13px] text-gray-800 tabular-nums">{label}</span>
        <span>White</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-gray-800 relative">
        <div
          className="absolute right-0 top-0 h-full bg-gray-100 transition-all duration-500 rounded-r-full"
          style={{ width: `${whitePct}%` }}
        />
      </div>
    </div>
  );
}

function NavBtn({ icon: Icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-[#1a140f] bg-[#f0e8df] hover:bg-[#e8dcd0] text-[#1a140f] shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[2px] disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none transition-all"
    >
      <Icon size={14} />
    </button>
  );
}

export default function AnalysePage() {
  const [positions, setPositions] = useState([{ fen: START_FEN, san: null }]);
  const [posIdx, setPosIdx] = useState(0);
  const currentFen = positions[posIdx].fen;

  const [boardFlipped, setBoardFlipped] = useState(false);
  const [engineOn, setEngineOn] = useState(false);
  const { info, ready } = useEngine(engineOn, currentFen);

  // Edit position — uses v5 position object format
  const [editMode, setEditMode] = useState(false);
  const [editPos, setEditPos] = useState({});
  const [selectedPiece, setSelectedPiece] = useState("wP");
  const [eraserOn, setEraserOn] = useState(false);
  const [editTurn, setEditTurn] = useState("w");

  const [fenInput, setFenInput] = useState(START_FEN);
  const [fenCopied, setFenCopied] = useState(false);
  const [fenError, setFenError] = useState("");

  const notationRef = useRef(null);

  useEffect(() => { setFenInput(currentFen); }, [currentFen]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e) {
      if (editMode || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft")  { setPosIdx(i => Math.max(0, i - 1)); e.preventDefault(); }
      if (e.key === "ArrowRight") { setPosIdx(i => Math.min(positions.length - 1, i + 1)); e.preventDefault(); }
      if (e.key === "ArrowUp")    { setPosIdx(0); e.preventDefault(); }
      if (e.key === "ArrowDown")  { setPosIdx(positions.length - 1); e.preventDefault(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [positions.length, editMode]);

  useEffect(() => {
    notationRef.current?.querySelector("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [posIdx]);

  function addPosition(newFen, san) {
    setPositions(prev => [...prev.slice(0, posIdx + 1), { fen: newFen, san }]);
    setPosIdx(i => i + 1);
  }

  // Both-sides move — v5 API: { piece, sourceSquare, targetSquare }
  function handlePieceDrop({ piece, sourceSquare, targetSquare }) {
    for (const fenToTry of [currentFen, flipTurn(currentFen)]) {
      let g;
      try { g = new Chess(fenToTry); } catch { continue; }
      let move = null;
      try { move = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); } catch {}
      if (move) { addPosition(g.fen(), move.san); return true; }
    }
    return false;
  }

  // Engine arrows — v5 format: { startSquare, endSquare, color }
  const engineArrows = useMemo(() => {
    if (!info?.bestMove || !engineOn || !ready) return [];
    const bm = info.bestMove;
    if (bm.length < 4) return [];
    return [{ startSquare: bm.slice(0, 2), endSquare: bm.slice(2, 4), color: "rgba(21,130,21,0.85)" }];
  }, [info?.bestMove, engineOn, ready]);

  function applyFen(fen) {
    try {
      const g = new Chess(fen.trim());
      setPositions([{ fen: g.fen(), san: null }]);
      setPosIdx(0);
      setFenError("");
      setEditMode(false);
    } catch {
      setFenError("Invalid FEN");
    }
  }

  function copyFen() {
    navigator.clipboard.writeText(currentFen).then(() => {
      setFenCopied(true);
      setTimeout(() => setFenCopied(false), 1500);
    });
  }

  function resetBoard() {
    setPositions([{ fen: START_FEN, san: null }]);
    setPosIdx(0);
    setFenInput(START_FEN);
    setFenError("");
    setEditMode(false);
  }

  function enterEditMode() {
    setEditPos(fenToPositionObj(currentFen));
    setEditTurn(currentFen.split(" ")[1] || "w");
    setEditMode(true);
    setSelectedPiece("wP");
    setEraserOn(false);
  }

  function commitPosition() {
    const files = "abcdefgh";
    const pieceChar = { wP:"P",wN:"N",wB:"B",wR:"R",wQ:"Q",wK:"K",bP:"p",bN:"n",bB:"b",bR:"r",bQ:"q",bK:"k" };
    let fenRows = [];
    for (let rank = 8; rank >= 1; rank--) {
      let row = "";
      let empty = 0;
      for (let fi = 0; fi < 8; fi++) {
        const sq = files[fi] + rank;
        const p = editPos[sq];
        if (p) {
          if (empty) { row += empty; empty = 0; }
          row += (pieceChar[p.pieceType] || "?");
        } else { empty++; }
      }
      if (empty) row += empty;
      fenRows.push(row);
    }
    const rawFen = `${fenRows.join("/")} ${editTurn} - - 0 1`;
    try {
      const g = new Chess(rawFen);
      setPositions([{ fen: g.fen(), san: null }]);
      setPosIdx(0);
      setEditMode(false);
      setFenError("");
    } catch {
      setFenError("Invalid position — check kings");
    }
  }

  const moves = positions.slice(1);

  const scoreDisplay = useMemo(() => {
    if (!info) return null;
    if (info.isMate) return `#${info.mateIn}`;
    if (info.score === undefined || info.score === null) return null;
    const sign = info.score > 0 ? "+" : "";
    return `${sign}${(info.score / 100).toFixed(2)}`;
  }, [info]);

  // Edit mode Chessboard handlers (v5 API)
  const editBoardOptions = {
    position: editPos,
    boardOrientation: boardFlipped ? "black" : "white",
    allowDragging: true,
    onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
      setEditPos(prev => {
        const n = { ...prev };
        delete n[sourceSquare];
        n[targetSquare] = { pieceType: piece.pieceType };
        return n;
      });
      return true;
    },
    onSquareClick: ({ square }) => {
      setEditPos(prev => {
        const n = { ...prev };
        if (eraserOn) delete n[square];
        else n[square] = { pieceType: selectedPiece };
        return n;
      });
    },
    boardStyle: { borderRadius: 0 },
  };

  const mainBoardOptions = {
    position: currentFen,
    boardOrientation: boardFlipped ? "black" : "white",
    allowDragging: true,
    onPieceDrop: handlePieceDrop,
    arrows: engineArrows,
    animationDurationInMs: 100,
    boardStyle: { borderRadius: 0 },
  };

  return (
    <div className="flex bg-white overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>

      {/* ── Left column: toolbar + board ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b-2 border-[#1a140f] bg-white">
          <button
            onClick={() => setBoardFlipped(f => !f)}
            className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-[#1a140f] bg-[#f0e8df] hover:bg-[#e8dcd0] text-[#1a140f] shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[2px] transition-all"
            title="Flip board"
          >
            <RotateCcw size={14} />
          </button>

          <div className="flex items-center gap-1">
            <NavBtn icon={ChevronFirst}  onClick={() => setPosIdx(0)}                                            disabled={posIdx === 0} />
            <NavBtn icon={ChevronLeft}   onClick={() => setPosIdx(i => Math.max(0, i - 1))}                      disabled={posIdx === 0} />
            <NavBtn icon={ChevronRight}  onClick={() => setPosIdx(i => Math.min(positions.length - 1, i + 1))}   disabled={posIdx === positions.length - 1} />
            <NavBtn icon={ChevronLast}   onClick={() => setPosIdx(positions.length - 1)}                         disabled={posIdx === positions.length - 1} />
          </div>

          <button
            onClick={resetBoard}
            className="h-8 px-3 flex items-center gap-1.5 rounded-xl border-2 border-[#1a140f] bg-[#f0e8df] hover:bg-[#e8dcd0] text-[#1a140f] text-[12px] font-bold shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[2px] transition-all"
          >
            <RefreshCw size={12} /> Reset
          </button>

          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <input
              value={fenInput}
              onChange={e => { setFenInput(e.target.value); setFenError(""); }}
              onKeyDown={e => e.key === "Enter" && applyFen(fenInput)}
              placeholder="Paste FEN and press Enter…"
              className={cn(
                "flex-1 min-w-0 h-8 px-3 text-[11px] font-mono rounded-xl border-2 outline-none transition-all",
                fenError ? "border-red-400 bg-red-50" : "border-gray-300 bg-white focus:border-orange-400"
              )}
            />
            {fenError && <span className="text-[10px] text-red-500 shrink-0 font-medium">{fenError}</span>}
            <button
              onClick={() => applyFen(fenInput)}
              className="h-8 px-2.5 text-[11px] font-bold rounded-xl border-2 border-gray-300 bg-white hover:border-orange-400 hover:text-orange-600 transition-all shrink-0"
            >
              Go
            </button>
            <button
              onClick={copyFen}
              title="Copy FEN"
              className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-gray-300 bg-white hover:border-orange-400 hover:text-orange-600 transition-all shrink-0"
            >
              {fenCopied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Board area — same sizing as BlitzRacePage */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden p-4">
          <div style={{ width: "min(calc(100% - 8px), calc(100vh - 165px))", maxWidth: "min(calc(100% - 8px), calc(100vh - 165px))" }}>
            <div className="overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <Chessboard options={editMode ? editBoardOptions : mainBoardOptions} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-[272px] shrink-0 border-l-2 border-[#1a140f] bg-white flex flex-col overflow-hidden">

        {/* Engine section */}
        <div className="shrink-0 border-b border-gray-100 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-gray-500" />
              <span className="text-[12px] font-bold text-gray-700">Stockfish 10</span>
              {engineOn && ready  && <span className="text-[9px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">ON</span>}
              {engineOn && !ready && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full animate-pulse">LOADING</span>}
            </div>
            <button
              onClick={() => setEngineOn(e => !e)}
              className={cn("relative w-10 h-5 rounded-full transition-colors duration-200", engineOn ? "bg-green-500" : "bg-gray-300")}
            >
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200", engineOn ? "left-5" : "left-0.5")} />
            </button>
          </div>

          {engineOn && info && (
            <div className="space-y-2">
              <EvalBar score={info.score} isMate={info.isMate} mateIn={info.mateIn} />
              <div className="bg-gray-50 rounded-xl p-2 space-y-1">
                {info.depth && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Depth</span>
                    <span className="text-[11px] font-bold text-gray-600">{info.depth}</span>
                  </div>
                )}
                {info.bestMove && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Best move</span>
                    <span className="text-[12px] font-black text-green-700 font-mono">{info.bestMove}</span>
                  </div>
                )}
                {info.pv && info.pv.length > 0 && (
                  <div className="pt-0.5 border-t border-gray-200">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">PV </span>
                    <span className="text-[10px] text-gray-500 font-mono">{info.pv.join(" ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {engineOn && !info && ready && (
            <p className="text-[11px] text-gray-400 text-center py-1 italic">Analysing…</p>
          )}
        </div>

        {/* Move notation */}
        <div ref={notationRef} className="flex-1 min-h-0 overflow-y-auto p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">Moves</p>
          {moves.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">Make a move to start</p>
          ) : (
            <div className="leading-relaxed">
              {moves.map((pos, i) => {
                const moveNum = Math.floor(i / 2) + 1;
                const isWhiteMove = i % 2 === 0;
                const isActive = posIdx === i + 1;
                return (
                  <span key={i}>
                    {isWhiteMove && (
                      <span className="text-[11px] text-gray-400 select-none mr-0.5">{moveNum}.</span>
                    )}
                    <button
                      data-active={isActive}
                      onClick={() => setPosIdx(i + 1)}
                      className={cn(
                        "text-[12px] font-bold px-1.5 py-0.5 rounded-lg mr-1 transition-colors",
                        isActive ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-100"
                      )}
                    >
                      {pos.san}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit position */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          {!editMode ? (
            <button
              onClick={enterEditMode}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-[12px] font-bold hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all"
            >
              <Edit3 size={13} /> Edit Position
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">Edit Position</span>
                <button onClick={() => setEditMode(false)} className="text-[10px] text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
              </div>

              <div className="grid grid-cols-6 gap-1">
                {PIECE_PALETTE.map(({ key, sym }) => {
                  const isWhite = key.startsWith("w");
                  const isSelected = selectedPiece === key && !eraserOn;
                  return (
                    <button
                      key={key}
                      onClick={() => { setSelectedPiece(key); setEraserOn(false); }}
                      title={key}
                      className={cn(
                        "h-8 flex items-center justify-center rounded-lg border-2 text-[17px] transition-all",
                        isSelected ? "border-orange-500 scale-110 shadow-sm" : "border-gray-200 hover:border-gray-400"
                      )}
                      style={{
                        background: isWhite ? "#f5e8c8" : "#3a2510",
                        color: isWhite ? "#1a0c00" : "#f5e8c8",
                      }}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setEraserOn(e => !e)}
                  className={cn(
                    "flex-1 h-8 text-[11px] font-bold rounded-xl border-2 transition-all",
                    eraserOn ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >Eraser</button>
                <button
                  onClick={() => setEditPos({})}
                  className="flex-1 h-8 text-[11px] font-bold rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition-all"
                >Clear</button>
              </div>

              <div className="flex gap-1.5">
                {["w", "b"].map(side => (
                  <button
                    key={side}
                    onClick={() => setEditTurn(side)}
                    className={cn(
                      "flex-1 h-7 text-[10px] font-bold rounded-lg border-2 transition-all",
                      editTurn === side
                        ? side === "w" ? "border-gray-300 bg-white text-gray-900" : "border-gray-800 bg-gray-800 text-white"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    {side === "w" ? "White to move" : "Black to move"}
                  </button>
                ))}
              </div>

              {fenError && <p className="text-[10px] text-red-500 font-medium">{fenError}</p>}

              <button
                onClick={commitPosition}
                className="w-full h-9 rounded-xl border-2 border-[#1a140f] bg-[#f97316] text-white text-[12px] font-bold shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[1px] transition-all"
              >
                Set Position
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
