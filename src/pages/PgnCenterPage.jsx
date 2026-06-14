import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Zap, Trash2, Sparkles } from "lucide-react";
import { Chess } from "chess.js";
import { cn } from "../lib/utils";
import { getPgns, createPgn, deletePgn } from "../lib/db";

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

const TYPE_STYLES = {
  racer:  "bg-orange-50 text-orange-700",
  puzzle: "bg-brand-50 text-brand-700",
  demo:   "bg-emerald-50 text-emerald-700",
};

const inputCls = "w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

export default function PgnCenterPage({ search }) {
  const [pgns, setPgns]                   = useState([]);
  const [form, setForm]                   = useState({ name: "", type: "racer", content: "" });
  const [lastExtracted, setLastExtracted] = useState(null);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    getPgns().then(setPgns);
  }, []);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, content: ev.target.result, name: f.name || file.name.replace(".pgn", "") }));
    reader.readAsText(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim() || saving) return;
    setSaving(true);
    try {
      const id       = `PGN-${String(pgns.length + 1).padStart(3, "0")}`;
      const puzzles  = extractPuzzles(id, form.content);
      const pgnData  = {
        id, name: form.name || "Unnamed", type: form.type,
        content: form.content, date: new Date().toLocaleDateString(),
        puzzleCount: puzzles.length,
      };
      const created = await createPgn(pgnData, puzzles);
      setPgns(prev => [...prev, created]);
      setLastExtracted(puzzles.length);
      setForm({ name: "", type: "racer", content: "" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    await deletePgn(id);
    setPgns(prev => prev.filter(p => p.id !== id));
    setLastExtracted(null);
  }

  const filtered = pgns.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Upload form */}
          <div className="w-full lg:w-80 shrink-0">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] border border-gray-200 p-7 shadow-sm space-y-5"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                  <Upload size={18} className="text-brand-600" />
                </div>
                <div>
                  <h2 className="font-black text-[15px] text-gray-900">Upload PGN</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Add games to your library</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">PGN Name</label>
                  <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kasparov vs Deep Blue" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Type</label>
                  <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="racer">Racer</option>
                    <option value="puzzle">Puzzle</option>
                    <option value="demo">Demo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">PGN Content</label>
                  <textarea className={cn(inputCls, "h-auto py-3 resize-none font-mono text-xs")} rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Paste PGN here..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Upload .pgn file</label>
                  <input type="file" accept=".pgn" onChange={handleFile} className="text-sm text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-600 file:text-xs file:font-semibold cursor-pointer" />
                </div>
                <button type="submit" disabled={saving}
                  className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Upload size={14} />{saving ? "Saving…" : "Add PGN"}
                </button>
              </form>
              {lastExtracted !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-[13px] font-semibold text-emerald-700"
                >
                  <Zap size={13} className="text-emerald-500" />
                  {lastExtracted} puzzle positions extracted
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Library */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-[15px] text-gray-900">PGN Library <span className="text-gray-400 font-normal text-sm">({filtered.length})</span></h2>
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-[20px] bg-brand-500/10 flex items-center justify-center mb-4">
                  <FileText size={26} className="text-brand-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">{search ? "No PGNs match your search" : "No PGNs Yet"}</h3>
                <p className="text-gray-400 mt-2 text-sm">Upload your first PGN file to get started</p>
              </div>
            ) : (
              <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Puzzles</th>
                      <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-6 py-4" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((p, i) => (
                      <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">{p.id}</span></td>
                        <td className="px-6 py-4 font-semibold text-[13.5px] text-gray-800">{p.name}</td>
                        <td className="px-6 py-4"><span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", TYPE_STYLES[p.type] || "bg-gray-100 text-gray-600")}>{p.type}</span></td>
                        <td className="px-6 py-4 font-bold text-gray-700">{p.puzzleCount ?? "—"}</td>
                        <td className="px-6 py-4 text-gray-400 text-[13px] hidden sm:table-cell">{p.date}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(p.id)} className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all ml-auto">
                            <Trash2 size={13} />
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
    </div>
  );
}
