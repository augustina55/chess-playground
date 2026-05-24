import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Zap, Trash2 } from "lucide-react";
import { Chess } from "chess.js";
import { cn } from "../lib/utils";

function extractPuzzles(pgnId, content) {
  const puzzles = [];
  const games = content.split(/(?=\[Event\s)/g).filter(g => g.trim().length > 10);
  games.forEach((gamePgn, gIdx) => {
    try {
      const fenMatch = gamePgn.match(/\[FEN\s+"([^"]+)"\]/);
      const startFen = fenMatch ? fenMatch[1] : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      const chess = new Chess();
      chess.loadPgn(gamePgn);
      const history = chess.history({ verbose: true });
      if (history.length < 1) return;
      const solution = history.map(mv => mv.from + mv.to + (mv.promotion || ""));
      const chapMatch  = gamePgn.match(/\[ChapterName\s+"([^"]+)"\]/);
      const eventMatch = gamePgn.match(/\[Event\s+"([^"]+)"\]/);
      const name = chapMatch ? chapMatch[1] : eventMatch ? eventMatch[1] : `Puzzle ${gIdx + 1}`;
      puzzles.push({ id: `${pgnId}-g${gIdx}`, pgnId, fen: startFen, solution, name });
    } catch { /**/ }
  });
  return puzzles;
}

function loadPgns()    { try { return JSON.parse(localStorage.getItem("ca_pgns")    || "[]"); } catch { return []; } }
function loadPuzzles() { try { return JSON.parse(localStorage.getItem("ca_puzzles") || "[]"); } catch { return []; } }
function savePgns(v)    { localStorage.setItem("ca_pgns",    JSON.stringify(v)); }
function savePuzzles(v) { localStorage.setItem("ca_puzzles", JSON.stringify(v)); }

const TYPE_STYLES = {
  racer:  "bg-terra-100  text-terra-700  dark:bg-terra-900/30  dark:text-terra-400",
  puzzle: "bg-brand-100  text-brand-700  dark:bg-brand-900/40  dark:text-brand-400",
  demo:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const inputCls = "w-full px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm transition-colors";

export default function PgnCenterPage({ search }) {
  const [pgns, setPgns]               = useState(loadPgns);
  const [form, setForm]               = useState({ name: "", type: "racer", content: "" });
  const [lastExtracted, setLastExtracted] = useState(null);

  function save(updated) { setPgns(updated); savePgns(updated); }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, content: ev.target.result, name: f.name || file.name.replace(".pgn", "") }));
    reader.readAsText(file);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim()) return;
    const id = `PGN-${String(pgns.length + 1).padStart(3, "0")}`;
    const puzzles = extractPuzzles(id, form.content);
    savePuzzles([...loadPuzzles().filter(p => p.pgnId !== id), ...puzzles]);
    setLastExtracted(puzzles.length);
    save([...pgns, { id, name: form.name || "Unnamed", type: form.type, content: form.content, date: new Date().toLocaleDateString(), puzzleCount: puzzles.length }]);
    setForm({ name: "", type: "racer", content: "" });
  }

  function deletePgn(id) {
    savePuzzles(loadPuzzles().filter(p => p.pgnId !== id));
    save(pgns.filter(p => p.id !== id));
    setLastExtracted(null);
  }

  const filtered = pgns.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 page-enter">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-10">PGN Center</h1>

      <div className="flex flex-col lg:flex-row gap-7 items-start">
        {/* Upload form */}
        <div className="w-full lg:w-88 shrink-0" style={{ width: "clamp(300px, 30%, 360px)" }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] space-y-5"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center">
                <Upload size={15} className="text-brand-600 dark:text-brand-400" />
              </div>
              <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-200">Upload PGN</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">PGN Name</label>
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kasparov vs Deep Blue" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Type</label>
                <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="racer">Racer</option>
                  <option value="puzzle">Puzzle</option>
                  <option value="demo">Demo</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">PGN Content</label>
                <textarea className={cn(inputCls, "resize-none font-mono text-xs")} rows={7} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Paste PGN here..." />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Upload .pgn file</label>
                <input type="file" accept=".pgn" onChange={handleFile} className="text-sm text-slate-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-xl file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 dark:file:text-slate-300 file:text-xs file:font-semibold cursor-pointer" />
              </div>
              <button type="submit" className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 mt-2">
                <Upload size={13} />Add PGN
              </button>
            </form>
            {lastExtracted !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-brand-50 dark:bg-brand-900/40 border border-brand-100 dark:border-brand-800 text-[13px] font-semibold text-brand-700 dark:text-brand-300"
              >
                <Zap size={13} className="text-brand-500" />
                {lastExtracted} puzzle positions extracted
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* PGN library */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-[15px] text-slate-700 dark:text-slate-200">PGN Library <span className="text-slate-400 font-normal">({filtered.length})</span></h2>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05]">
              <FileText size={28} className="text-slate-200 dark:text-slate-700 mb-3" />
              <p className="font-semibold text-slate-400 text-[14px]">{search ? "No PGNs match your search" : "No PGNs uploaded yet"}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left" style={{ background: "rgba(0,0,0,0.02)" }}>
                    <th className="px-7 py-4">ID</th>
                    <th className="px-7 py-4">Name</th>
                    <th className="px-7 py-4">Type</th>
                    <th className="px-7 py-4">Puzzles</th>
                    <th className="px-7 py-4 hidden sm:table-cell">Date</th>
                    <th className="px-7 py-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                  {filtered.map((p, i) => (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="px-7 py-4"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-lg">{p.id}</span></td>
                      <td className="px-7 py-4 font-semibold text-[14px] text-slate-700 dark:text-slate-200">{p.name}</td>
                      <td className="px-7 py-4"><span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", TYPE_STYLES[p.type])}>{p.type}</span></td>
                      <td className="px-7 py-4"><span className="font-bold text-slate-700 dark:text-slate-300">{p.puzzleCount ?? "—"}</span></td>
                      <td className="px-7 py-4 text-slate-400 text-[13px] hidden sm:table-cell">{p.date}</td>
                      <td className="px-7 py-4 text-right">
                        <button onClick={() => deletePgn(p.id)} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
