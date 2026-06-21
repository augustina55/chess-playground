import { useState, useEffect, useRef, useMemo } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import {
  RotateCcw, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Cpu, Edit3, Copy, Check,
} from "lucide-react";
import { cn } from "../lib/utils";
import { BOARD_THEMES } from "../lib/boardThemes";
import { useAuth } from "../context/AuthContext";

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

function fenToPositionObj(fen) {
  const pos = {};
  const rows = fen.split(" ")[0].split("/");
  const files = "abcdefgh";
  const pm = { P:"wP",N:"wN",B:"wB",R:"wR",Q:"wQ",K:"wK",p:"bP",n:"bN",b:"bB",r:"bR",q:"bQ",k:"bK" };
  rows.forEach((row, ri) => {
    let fi = 0;
    for (const ch of row) {
      if ("12345678".includes(ch)) fi += parseInt(ch);
      else { if (pm[ch]) pos[files[fi] + (8 - ri)] = { pieceType: pm[ch] }; fi++; }
    }
  });
  return pos;
}

function uciToSan(fen, uciMoves) {
  const san = [];
  let g;
  try { g = new Chess(fen); } catch { return []; }
  for (const uci of (uciMoves || []).slice(0, 10)) {
    try {
      const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || "q" });
      if (!m) break;
      san.push(m.san);
    } catch { break; }
  }
  return san;
}

function formatPv(fen, pvSan) {
  if (!pvSan || pvSan.length === 0) return "";
  const parts = fen.split(" ");
  let move = parseInt(parts[5] || "1");
  let white = parts[1] === "w";
  const out = [];
  for (const san of pvSan) {
    if (white) out.push(`${move}.`);
    else if (out.length === 0) out.push(`${move}...`);
    out.push(san);
    if (!white) move++;
    white = !white;
  }
  return out.join(" ");
}

function evalStr(score, isMate, mateIn) {
  if (isMate) return `#${mateIn}`;
  if (score == null) return "0.0";
  return `${score > 0 ? "+" : ""}${(score / 100).toFixed(2)}`;
}

const PALETTE = [
  { key:"wK",sym:"♔" },{ key:"wQ",sym:"♕" },{ key:"wR",sym:"♖" },
  { key:"wB",sym:"♗" },{ key:"wN",sym:"♘" },{ key:"wP",sym:"♙" },
  { key:"bK",sym:"♚" },{ key:"bQ",sym:"♛" },{ key:"bR",sym:"♜" },
  { key:"bB",sym:"♝" },{ key:"bN",sym:"♞" },{ key:"bP",sym:"♟" },
];

const ARROW_COLORS = [
  "rgba(21,130,21,0.88)",
  "rgba(30,80,220,0.80)",
  "rgba(140,30,140,0.80)",
  "rgba(210,100,20,0.80)",
  "rgba(190,30,30,0.80)",
];

// ── Engine hook ────────────────────────────────────────────────────────────────

function useEngine(enabled, fen, targetDepth, multiPV) {
  const [variations, setVariations] = useState([]);
  const [currentDepth, setCurrentDepth] = useState(0);
  const [ready, setReady] = useState(false);
  const wRef   = useRef(null);
  const mapRef = useRef({});
  const timer  = useRef(null);

  useEffect(() => {
    if (!enabled) {
      wRef.current?.terminate(); wRef.current = null;
      setVariations([]); setCurrentDepth(0); setReady(false);
      return;
    }
    const w = spawnEngine();
    wRef.current = w;
    let init = false;
    w.onmessage = ({ data: msg }) => {
      if (!init && msg.includes("uciok")) w.postMessage("isready");
      if (msg.includes("readyok")) { init = true; setReady(true); }
      if (msg.startsWith("info") && msg.includes("multipv")) {
        const lM = msg.match(/multipv (\d+)/);
        const dM = msg.match(/\bdepth (\d+)/);
        const cM = msg.match(/score cp (-?\d+)/);
        const mM = msg.match(/score mate (-?\d+)/);
        const pM = msg.match(/ pv (.+)/);
        if (dM) setCurrentDepth(parseInt(dM[1]));
        if (lM) {
          const n = parseInt(lM[1]);
          mapRef.current[n] = {
            line:   n,
            depth:  dM ? parseInt(dM[1]) : (mapRef.current[n]?.depth || 0),
            score:  cM ? parseInt(cM[1]) : mM ? (parseInt(mM[1]) > 0 ? 9999 : -9999) : (mapRef.current[n]?.score ?? 0),
            isMate: !!mM,
            mateIn: mM ? parseInt(mM[1]) : null,
            pv:     pM ? pM[1].trim().split(" ") : (mapRef.current[n]?.pv || []),
          };
          setVariations(Object.values(mapRef.current).sort((a, b) => a.line - b.line));
        }
      }
      if (msg.startsWith("bestmove"))
        setVariations(Object.values(mapRef.current).sort((a, b) => a.line - b.line));
    };
    w.postMessage("uci");
    return () => { w.terminate(); wRef.current = null; setReady(false); setVariations([]); setCurrentDepth(0); };
  }, [enabled]);

  useEffect(() => {
    if (!ready || !wRef.current) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      mapRef.current = {};
      setVariations([]); setCurrentDepth(0);
      const w = wRef.current; if (!w) return;
      w.postMessage("stop");
      w.postMessage(`setoption name MultiPV value ${multiPV}`);
      w.postMessage(`position fen ${fen}`);
      w.postMessage(`go depth ${targetDepth}`);
    }, 200);
    return () => clearTimeout(timer.current);
  }, [ready, fen, targetDepth, multiPV]);

  return { variations, currentDepth, ready };
}

// ── Nav button ─────────────────────────────────────────────────────────────────

function NavBtn({ icon: Icon, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-[#1a140f] bg-[#f0e8df] hover:bg-[#e8dcd0] text-[#1a140f] shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[2px] disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none transition-all">
      <Icon size={14} />
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const { user } = useAuth();
  const boardTheme = BOARD_THEMES.find(t => t.id === (user?.settings?.boardTheme ?? "brown")) || BOARD_THEMES[0];

  const [positions, setPositions] = useState([{ fen: START_FEN, san: null }]);
  const [posIdx,    setPosIdx]    = useState(0);
  const currentFen = positions[posIdx].fen;

  const [boardFlipped,  setBoardFlipped]  = useState(false);

  // Engine
  const [engineOn,     setEngineOn]     = useState(false);
  const [engineDepth,  setEngineDepth]  = useState(15);
  const [multiPV,      setMultiPV]      = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedVars, setExpandedVars] = useState(new Set());
  const { variations, currentDepth, ready } = useEngine(engineOn, currentFen, engineDepth, multiPV);

  // Edit position
  const [editMode,  setEditMode]  = useState(false);
  const [editPos,   setEditPos]   = useState({});
  const [selPiece,  setSelPiece]  = useState("wP");
  const [eraserOn,  setEraserOn]  = useState(false);
  const [editTurn,  setEditTurn]  = useState("w");

  // FEN
  const [fenInput,  setFenInput]  = useState(START_FEN);
  const [fenCopied, setFenCopied] = useState(false);
  const [fenError,  setFenError]  = useState("");

  const notationRef = useRef(null);

  useEffect(() => { setFenInput(currentFen); }, [currentFen]);

  useEffect(() => {
    function onKey(e) {
      if (editMode || e.target.tagName === "INPUT") return;
      if (e.key === "ArrowLeft")  { setPosIdx(i => Math.max(0, i - 1));                     e.preventDefault(); }
      if (e.key === "ArrowRight") { setPosIdx(i => Math.min(positions.length - 1, i + 1));   e.preventDefault(); }
      if (e.key === "ArrowUp")    { setPosIdx(0);                                             e.preventDefault(); }
      if (e.key === "ArrowDown")  { setPosIdx(positions.length - 1);                         e.preventDefault(); }
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

  function handlePieceDrop({ sourceSquare, targetSquare }) {
    for (const fenToTry of [currentFen, flipTurn(currentFen)]) {
      let g;
      try { g = new Chess(fenToTry); } catch { continue; }
      let move = null;
      try { move = g.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); } catch {}
      if (move) { addPosition(g.fen(), move.san); return true; }
    }
    return false;
  }

  function toggleVar(line) {
    setExpandedVars(prev => {
      const n = new Set(prev);
      n.has(line) ? n.delete(line) : n.add(line);
      return n;
    });
  }

  const engineArrows = useMemo(() => {
    if (!engineOn || !ready || !variations.length) return [];
    return variations.slice(0, 3).map((v, i) => {
      const bm = v.pv?.[0];
      if (!bm || bm.length < 4) return null;
      return { startSquare: bm.slice(0, 2), endSquare: bm.slice(2, 4), color: ARROW_COLORS[i] };
    }).filter(Boolean);
  }, [variations, engineOn, ready]);

  const variationsSan = useMemo(() =>
    variations.map(v => ({ ...v, pvSan: uciToSan(currentFen, v.pv) })),
    [variations, currentFen]
  );

  const topVar = variationsSan[0];

  // White's share of eval bar (0–100)
  const evalPct = useMemo(() => {
    if (!topVar) return 50;
    if (topVar.isMate) return topVar.mateIn > 0 ? 100 : 0;
    const s = Math.max(-1500, Math.min(1500, topVar.score ?? 0));
    return Math.round(50 + (s / 1500) * 50);
  }, [topVar]);

  function applyFen(fen) {
    try {
      const g = new Chess(fen.trim());
      setPositions([{ fen: g.fen(), san: null }]);
      setPosIdx(0); setFenError(""); setEditMode(false);
    } catch { setFenError("Invalid FEN"); }
  }

  function copyFen() {
    navigator.clipboard.writeText(currentFen).then(() => {
      setFenCopied(true); setTimeout(() => setFenCopied(false), 1500);
    });
  }

  function enterEditMode() {
    setEditPos(fenToPositionObj(currentFen));
    setEditTurn(currentFen.split(" ")[1] || "w");
    setEditMode(true); setSelPiece("wP"); setEraserOn(false);
  }

  function commitPosition() {
    const files = "abcdefgh";
    const pc = { wP:"P",wN:"N",wB:"B",wR:"R",wQ:"Q",wK:"K",bP:"p",bN:"n",bB:"b",bR:"r",bQ:"q",bK:"k" };
    const rows = [];
    for (let rank = 8; rank >= 1; rank--) {
      let row = ""; let empty = 0;
      for (let fi = 0; fi < 8; fi++) {
        const p = editPos[files[fi] + rank];
        if (p) { if (empty) { row += empty; empty = 0; } row += (pc[p.pieceType] || "?"); }
        else empty++;
      }
      if (empty) row += empty;
      rows.push(row);
    }
    try {
      const g = new Chess(`${rows.join("/")} ${editTurn} - - 0 1`);
      setPositions([{ fen: g.fen(), san: null }]);
      setPosIdx(0); setEditMode(false); setFenError("");
    } catch { setFenError("Invalid position — check kings"); }
  }

  const moves    = positions.slice(1);
  const depthPct = ((engineDepth - 5) / 25) * 100;
  const showEval = engineOn && variationsSan.length > 0;

  const squareColors = {
    darkSquareStyle:  { backgroundColor: boardTheme.dark },
    lightSquareStyle: { backgroundColor: boardTheme.light },
  };

  const editOpts = {
    position: editPos,
    boardOrientation: boardFlipped ? "black" : "white",
    allowDragging: true,
    onPieceDrop: ({ piece, sourceSquare, targetSquare }) => {
      setEditPos(prev => { const n = { ...prev }; delete n[sourceSquare]; n[targetSquare] = { pieceType: piece.pieceType }; return n; });
      return true;
    },
    onSquareClick: ({ square }) => {
      setEditPos(prev => { const n = { ...prev }; if (eraserOn) delete n[square]; else n[square] = { pieceType: selPiece }; return n; });
    },
    ...squareColors,
    boardStyle: { borderRadius: 0 },
  };

  const mainOpts = {
    position: currentFen,
    boardOrientation: boardFlipped ? "black" : "white",
    allowDragging: true,
    onPieceDrop: handlePieceDrop,
    arrows: engineArrows,
    animationDurationInMs: 100,
    ...squareColors,
    boardStyle: { borderRadius: 0 },
  };

  return (
    <div className="flex bg-white overflow-hidden" style={{ height: "calc(100vh - 70px)" }}>

      {/* ── Left: toolbar + board ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b-2 border-[#1a140f] bg-white">
          <button onClick={() => setBoardFlipped(f => !f)} title="Flip board"
            className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-[#1a140f] bg-[#f0e8df] hover:bg-[#e8dcd0] text-[#1a140f] shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[2px] transition-all">
            <RotateCcw size={14} />
          </button>
          <div className="flex items-center gap-1">
            <NavBtn icon={ChevronFirst} onClick={() => setPosIdx(0)}                                           disabled={posIdx === 0} />
            <NavBtn icon={ChevronLeft}  onClick={() => setPosIdx(i => Math.max(0, i - 1))}                     disabled={posIdx === 0} />
            <NavBtn icon={ChevronRight} onClick={() => setPosIdx(i => Math.min(positions.length - 1, i + 1))}  disabled={posIdx === positions.length - 1} />
            <NavBtn icon={ChevronLast}  onClick={() => setPosIdx(positions.length - 1)}                        disabled={posIdx === positions.length - 1} />
          </div>
        </div>

        {/* Board — vertical eval bar left, board right */}
        <div className="flex-1 flex items-center justify-center min-w-0 overflow-hidden py-4 pl-8 pr-4">
          <div className="relative" style={{ width: "min(calc(100% - 8px), calc(100vh - 165px))" }}>

            {/* Vertical eval bar (absolute, left of board) */}
            {showEval && (
              <div className="absolute top-0 bottom-0 -left-6 w-4 rounded-full overflow-hidden flex flex-col bg-gray-900">
                {/* Black section — top */}
                <div className="bg-gray-900 transition-all duration-700" style={{ flex: 100 - evalPct }} />
                {/* White section — bottom */}
                <div className="bg-gray-100 transition-all duration-700" style={{ flex: evalPct }} />
              </div>
            )}

            <div className="overflow-hidden rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
              <Chessboard options={editMode ? editOpts : mainOpts} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-[272px] shrink-0 border-l-2 border-[#1a140f] bg-white flex flex-col overflow-hidden">

        {/* Engine — toggle + collapsible settings */}
        <div className="shrink-0 border-b border-gray-100">

          {/* Header row (always visible) */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-gray-500" />
              <span className="text-[12px] font-bold text-gray-700">Stockfish</span>
              {engineOn && ready  && <span className="text-[9px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">ON</span>}
              {engineOn && !ready && <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full animate-pulse">LOADING</span>}
            </div>
            <div className="flex items-center gap-2">
              {/* Settings collapse toggle */}
              {engineOn && (
                <button onClick={() => setSettingsOpen(o => !o)}
                  className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-gray-600 transition-colors select-none">
                  <span>d:{engineDepth} · L:{multiPV}</span>
                  {settingsOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                </button>
              )}
              {/* Engine on/off */}
              <button onClick={() => { setEngineOn(e => !e); setSettingsOpen(false); }}
                className={cn("relative w-10 h-5 rounded-full transition-colors duration-200", engineOn ? "bg-green-500" : "bg-gray-300")}>
                <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200", engineOn ? "left-5" : "left-0.5")} />
              </button>
            </div>
          </div>

          {/* Collapsible settings */}
          {engineOn && settingsOpen && (
            <div className="px-3 pb-3 space-y-2.5 border-t border-gray-50">
              {/* Depth */}
              <div className="space-y-1 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Depth</span>
                  <span className="text-[12px] font-black text-gray-800 tabular-nums">
                    {currentDepth > 0 ? `${currentDepth} / ${engineDepth}` : engineDepth}
                  </span>
                </div>
                <input type="range" min="5" max="30" step="1" value={engineDepth}
                  onChange={e => setEngineDepth(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
                  style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${depthPct}%, #e5e7eb ${depthPct}%, #e5e7eb 100%)` }}
                />
                <div className="flex justify-between text-[9px] text-gray-400 select-none"><span>5 (fast)</span><span>30 (slow)</span></div>
              </div>
              {/* Lines */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Lines</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setMultiPV(n)}
                      className={cn("flex-1 h-7 text-[12px] font-bold rounded-lg border-2 transition-all",
                        multiPV === n ? "border-orange-500 bg-orange-500 text-white" : "border-gray-200 text-gray-500 hover:border-gray-400"
                      )}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Variation lines */}
        {engineOn && variationsSan.length > 0 && (
          <div className="shrink-0 border-b border-gray-100 p-2 space-y-1">
            {variationsSan.map((v, i) => {
              const expanded = expandedVars.has(v.line);
              const pv = formatPv(currentFen, v.pvSan.slice(0, expanded ? 8 : 4));
              return (
                <div key={v.line}
                  className={cn("rounded-xl border", i === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100")}>
                  <div className="flex items-start gap-1.5 px-2 py-1.5">
                    {/* Eval + depth */}
                    <div className="flex flex-col items-start shrink-0 pt-px">
                      <span className={cn("text-[11px] font-black tabular-nums leading-none",
                        i === 0 ? "text-green-700" : "text-gray-700")}>
                        {evalStr(v.score, v.isMate, v.mateIn)}
                      </span>
                      <span className="text-[8px] text-gray-400 mt-0.5">d{v.depth}</span>
                    </div>
                    {/* PV moves */}
                    <p className={cn("text-[10.5px] text-gray-600 font-mono flex-1 min-w-0 leading-snug",
                      expanded ? "" : "truncate"
                    )}>
                      {pv || "…"}
                    </p>
                    {/* Expand toggle */}
                    <button onClick={() => toggleVar(v.line)}
                      className="shrink-0 mt-0.5 text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded">
                      {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Move notation */}
        <div ref={notationRef} className="flex-1 min-h-0 overflow-y-auto p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">Moves</p>
          {moves.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">Make a move to start</p>
          ) : (
            <div className="leading-relaxed">
              {moves.map((pos, i) => {
                const mn = Math.floor(i / 2) + 1;
                const isActive = posIdx === i + 1;
                return (
                  <span key={i}>
                    {i % 2 === 0 && <span className="text-[11px] text-gray-400 select-none mr-0.5">{mn}.</span>}
                    <button data-active={isActive} onClick={() => setPosIdx(i + 1)}
                      className={cn("text-[12px] font-bold px-1.5 py-0.5 rounded-lg mr-1 transition-colors",
                        isActive ? "bg-orange-500 text-white" : "text-gray-700 hover:bg-gray-100")}>
                      {pos.san}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* FEN */}
        <div className="shrink-0 border-t border-gray-100 p-3 space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Position (FEN)</p>
          <div className="flex gap-1.5">
            <input value={fenInput}
              onChange={e => { setFenInput(e.target.value); setFenError(""); }}
              onKeyDown={e => e.key === "Enter" && applyFen(fenInput)}
              placeholder="Paste FEN…"
              className={cn("flex-1 min-w-0 h-8 px-2.5 text-[10px] font-mono rounded-xl border-2 outline-none transition-all",
                fenError ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-orange-400 focus:bg-white"
              )}
            />
            <button onClick={copyFen} title="Copy FEN"
              className="h-8 w-8 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-orange-400 hover:text-orange-600 transition-all shrink-0">
              {fenCopied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            </button>
          </div>
          {fenError && <p className="text-[10px] text-red-500 font-medium">{fenError}</p>}
          <button onClick={() => applyFen(fenInput)}
            className="w-full h-8 text-[11px] font-bold rounded-xl border-2 border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all">
            Load Position
          </button>
        </div>

        {/* Edit position */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          {!editMode ? (
            <button onClick={enterEditMode}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-[12px] font-bold hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
              <Edit3 size={13} /> Edit Position
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-700">Edit Position</span>
                <button onClick={() => setEditMode(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {PALETTE.map(({ key, sym }) => {
                  const isW = key.startsWith("w");
                  return (
                    <button key={key} onClick={() => { setSelPiece(key); setEraserOn(false); }}
                      className={cn("h-8 flex items-center justify-center rounded-lg border-2 text-[17px] transition-all",
                        selPiece === key && !eraserOn ? "border-orange-500 scale-110 shadow-sm" : "border-gray-200 hover:border-gray-400"
                      )}
                      style={{ background: isW ? "#f5e8c8" : "#3a2510", color: isW ? "#1a0c00" : "#f5e8c8" }}>
                      {sym}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setEraserOn(e => !e)}
                  className={cn("flex-1 h-8 text-[11px] font-bold rounded-xl border-2 transition-all",
                    eraserOn ? "border-red-400 bg-red-50 text-red-600" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}>Eraser</button>
                <button onClick={() => setEditPos({})}
                  className="flex-1 h-8 text-[11px] font-bold rounded-xl border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition-all">Clear</button>
              </div>
              <div className="flex gap-1.5">
                {["w","b"].map(side => (
                  <button key={side} onClick={() => setEditTurn(side)}
                    className={cn("flex-1 h-7 text-[10px] font-bold rounded-lg border-2 transition-all",
                      editTurn === side
                        ? (side === "w" ? "border-gray-300 bg-white text-gray-900" : "border-gray-800 bg-gray-800 text-white")
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}>
                    {side === "w" ? "White" : "Black"}
                  </button>
                ))}
              </div>
              {fenError && <p className="text-[10px] text-red-500">{fenError}</p>}
              <button onClick={commitPosition}
                className="w-full h-9 rounded-xl border-2 border-[#1a140f] bg-[#f97316] text-white text-[12px] font-bold shadow-[0_3px_0_#1a140f] active:shadow-none active:translate-y-[1px] transition-all">
                Set Position
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
