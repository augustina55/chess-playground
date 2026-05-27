import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  BookOpen,
  ChevronLeft,
  Trash2,
  Calendar,
  User,
  Sparkles,
  Clock3,
  Layers3,
  FileText,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

function useSaved(key, def = []) {
  const [val, setVal] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(def));
    } catch {
      return def;
    }
  });

  function save(v) {
    setVal(v);
    localStorage.setItem(key, JSON.stringify(v));
  }

  return [val, save];
}

const inputCls =
  "w-full h-14 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-slate-900 px-5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

function Field({ label, children }) {
  return (
    <div className="space-y-2.5">
      <label className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function HomeworkPage({ search }) {
  const { user } = useAuth();

  const [homework, saveHomework] = useSaved("ca_homework");
  const [batches] = useSaved("ca_batches");
  const [pgns] = useSaved("ca_pgns");

  const [view, setView] = useState("list");

  const [form, setForm] = useState({
    title: "",
    batchId: "",
    pgnId: "",
    dueDate: "",
    notes: "",
  });

  const filtered = homework.filter(
    (hw) =>
      !search ||
      hw.title.toLowerCase().includes(search.toLowerCase()) ||
      hw.batchName?.toLowerCase().includes(search.toLowerCase())
  );

  function assign(e) {
    e.preventDefault();

    if (!form.title.trim() || !form.batchId) return;

    const batch = batches.find((b) => b.id === form.batchId);
    const pgn = pgns.find((p) => p.id === form.pgnId);

    saveHomework([
      ...homework,
      {
        id: `HW-${String(homework.length + 1).padStart(3, "0")}`,
        title: form.title,
        batchId: form.batchId,
        batchName: batch?.name || "—",
        pgnId: form.pgnId,
        pgnName: pgn?.name || "—",
        dueDate: form.dueDate,
        notes: form.notes,
        assignedBy: user?.name,
        createdAt: new Date().toLocaleDateString(),
      },
    ]);

    setForm({
      title: "",
      batchId: "",
      pgnId: "",
      dueDate: "",
      notes: "",
    });

    setView("list");
  }

  if (view === "assign") {
    return (
      <div className="min-h-screen bg-[#f6f8fc] dark:bg-[#020617] p-5 md:p-8 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setView("list")}
              className="w-12 h-12 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                Assign Homework
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Create chess assignments for students
              </p>
            </div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={assign}
            className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] rounded-[32px] p-6 md:p-8 lg:p-10 shadow-[0_10px_60px_rgba(0,0,0,0.06)] space-y-6"
          >
            <div className="flex items-center gap-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              <div className="w-14 h-14 rounded-3xl bg-brand-500/10 flex items-center justify-center">
                <Sparkles className="text-brand-600 dark:text-brand-400" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Homework Details
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Fill all required fields below
                </p>
              </div>
            </div>

            <Field label="Homework Title">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                  }))
                }
                placeholder="Opening Principles - Week 1"
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Select Batch">
                <select
                  className={inputCls}
                  value={form.batchId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      batchId: e.target.value,
                    }))
                  }
                >
                  <option value="">Choose batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Attach PGN">
                <select
                  className={inputCls}
                  value={form.pgnId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pgnId: e.target.value,
                    }))
                  }
                >
                  <option value="">No PGN</option>
                  {pgns.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} — {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Due Date">
              <input
                type="date"
                className={inputCls}
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dueDate: e.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Instructions">
              <textarea
                rows={5}
                className={cn(inputCls, "h-auto py-4 resize-none")}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    notes: e.target.value,
                  }))
                }
                placeholder="Add notes or instructions for students..."
              />
            </Field>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex-1 h-14 rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-gray-300 font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex-1 h-14 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-500/20 transition-all"
              >
                Assign Homework
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f8fc] dark:bg-[#020617]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 p-8 md:p-10 lg:p-12 shadow-[0_20px_80px_rgba(99,102,241,0.25)] mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm font-medium mb-5">
                <Sparkles size={15} />
                Smart Homework Management
              </div>

              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
                Modern Homework
                <br />
                Dashboard
              </h1>

              <p className="text-white/75 text-base md:text-lg mt-5 max-w-xl leading-relaxed">
                Organize chess assignments, manage PGNs, and track student progress with a clean modern interface.
              </p>
            </div>

            {user?.role !== "student" && (
              <button
                onClick={() => setView("assign")}
                className="h-16 px-7 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <Plus size={18} />
                Create Homework
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="rounded-[28px] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-400 font-medium">
                  Total Homework
                </p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                  {homework.length}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <BookOpen className="text-brand-600 dark:text-brand-400" />
              </div>
            </div>

            <p className="text-sm text-gray-400">
              All created assignments
            </p>
          </div>

          <div className="rounded-[28px] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-400 font-medium">
                  Active Batches
                </p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                  {batches.length}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Layers3 className="text-violet-500" />
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Connected training groups
            </p>
          </div>

          <div className="rounded-[28px] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-gray-400 font-medium">
                  PGN Library
                </p>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-2">
                  {pgns.length}
                </h3>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <FileText className="text-emerald-500" />
              </div>
            </div>

            <p className="text-sm text-gray-400">
              Saved training PGNs
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[32px] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] py-24 px-6 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-[30px] bg-brand-500/10 flex items-center justify-center mb-6">
              <BookOpen
                size={40}
                className="text-brand-500 dark:text-brand-400"
              />
            </div>

            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              No Homework Yet
            </h3>

            <p className="text-gray-400 mt-3 max-w-md leading-relaxed">
              Create assignments for your students and keep everything organized beautifully.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[...filtered].reverse().map((hw, i) => (
              <motion.div
                key={hw.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative overflow-hidden rounded-[30px] bg-white dark:bg-slate-950 border border-gray-200 dark:border-white/[0.05] p-6 md:p-7 shadow-sm hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)] transition-all"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-violet-500 to-brand-400" />

                <div className="flex items-start justify-between gap-5 mb-6">
                  <div className="min-w-0 flex-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[11px] font-bold tracking-wide mb-4">
                      {hw.id}
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight break-words">
                      {hw.title}
                    </h3>
                  </div>

                  {user?.role !== "student" && (
                    <button
                      onClick={() =>
                        saveHomework(
                          homework.filter((h) => h.id !== hw.id)
                        )
                      }
                      className="opacity-0 group-hover:opacity-100 transition-all w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      <Layers3 size={14} />
                      Batch
                    </div>

                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {hw.batchName}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/[0.04] p-4">
                    <div className="flex items-center gap-2 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                      <Clock3 size={14} />
                      Due Date
                    </div>

                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      {hw.dueDate || "No Due Date"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {hw.pgnId && (
                    <div className="px-4 py-2 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 text-sm font-semibold">
                      {hw.pgnName}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <User size={14} />
                    {hw.assignedBy}
                  </div>
                </div>

                {hw.notes && (
                  <div className="rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-white/[0.04] p-5">
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {hw.notes}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
