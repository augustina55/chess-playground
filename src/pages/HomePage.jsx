import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, FileText, BookOpen, Zap, ArrowRight, ArrowUpRight,
  Trophy,
  Calendar, ChevronRight,
  UserPlus, BarChart2, Lightbulb, CalendarDays,
  NotebookPen, X, Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import {
  getAcademies,
  getBatches, getBatchesByAcademy, getBatchesForStudent,
  getProfiles, getProfilesByAcademy,
  getHomework, getHomeworkByAcademy, getHomeworkForBatch,
  getPgns,
  getBatchStudentCounts,
  getClassSessionByBatchDate,
} from "../lib/db";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

const LEVEL_CFG = {
  Beginner:     { abbr: "BEG", bg: "bg-indigo-100",  text: "text-indigo-600"  },
  Intermediate: { abbr: "INT", bg: "bg-orange-100",  text: "text-orange-600"  },
  Advanced:     { abbr: "ADV", bg: "bg-purple-100",  text: "text-purple-600"  },
  Open:         { abbr: "OPN", bg: "bg-emerald-100", text: "text-emerald-600" },
};

const LEVEL_BADGE = {
  Beginner:     "bg-emerald-50 text-emerald-700",
  Intermediate: "bg-blue-50 text-blue-700",
  Advanced:     "bg-orange-50 text-orange-700",
  Open:         "bg-violet-50 text-violet-700",
};

// ── Batch session drawer ──────────────────────────────────────────────────────

function BatchDrawer({ batch, todayISO, onClose, onNav }) {
  const { user } = useAuth();
  const [session, setSession] = useState(undefined); // undefined = loading, null = none

  useEffect(() => {
    if (!batch) return;
    getClassSessionByBatchDate(batch.id, todayISO)
      .then(setSession)
      .catch(() => setSession(null));
  }, [batch?.id, todayISO]);

  if (!batch) return null;
  const lvl = LEVEL_CFG[batch.level] || LEVEL_CFG.Beginner;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-white z-50 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", lvl.bg)}>
              <span className={cn("text-[10px] font-black", lvl.text)}>{lvl.abbr}</span>
            </div>
            <div>
              <h2 className="text-[16px] font-black text-gray-900">{batch.name}</h2>
              <p className="text-[11px] text-gray-400">{batch.level} · {batch.studentCount} students</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Schedule info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Schedule</p>
              <p className="text-[13px] font-bold text-gray-800">{batch.days?.join(", ") || "—"}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Today's Time</p>
              <p className="text-[13px] font-bold text-gray-800">
                {batch.todayTime ? fmtTime12(batch.todayTime) : "—"}
              </p>
            </div>
          </div>

          {/* Today's class notes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Today's Class Notes</p>
              {(user?.role === "coach" || user?.role === "admin") && (
                <button
                  onClick={() => onNav("class-notes")}
                  className="text-[11px] font-semibold text-brand-600 hover:underline">
                  {session ? "Edit" : "Add notes"} →
                </button>
              )}
            </div>

            {session === undefined && (
              <div className="flex items-center gap-2 text-[12px] text-gray-400 py-3">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
                Loading…
              </div>
            )}

            {session === null && (
              <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-5 text-center">
                <NotebookPen size={22} className="text-gray-300 mx-auto mb-2" />
                <p className="text-[12px] text-gray-400">No notes recorded for today's session.</p>
                {(user?.role === "coach" || user?.role === "admin") && (
                  <button onClick={() => onNav("class-notes")}
                    className="mt-2 flex items-center gap-1 text-[12px] text-brand-600 font-semibold hover:underline mx-auto">
                    <Plus size={12} />Add class notes
                  </button>
                )}
              </div>
            )}

            {session && (
              <div className="space-y-3">
                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                  {session.title && (
                    <p className="text-[14px] font-black text-gray-900 mb-2">{session.title}</p>
                  )}
                  {session.notes ? (
                    <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-6">
                      {session.notes}
                    </p>
                  ) : (
                    <p className="text-[12px] text-gray-400 italic">No notes text.</p>
                  )}
                </div>
                {session.pgnIds.length > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <FileText size={12} className="text-violet-400" />
                    <span className="text-[12px] text-gray-500">
                      {session.pgnIds.length} PGN{session.pgnIds.length !== 1 ? "s" : ""} attached
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 shrink-0">
          <button onClick={() => onNav("class-notes")}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-brand-50 text-brand-600 text-[12px] font-bold hover:bg-brand-100 transition-colors">
            <NotebookPen size={13} />All Class Notes
          </button>
          <button onClick={() => onNav("batches")}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-gray-100 text-gray-700 text-[12px] font-bold hover:bg-gray-200 transition-colors">
            <Users size={13} />Batch Details
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ── Coach / Admin dashboard ───────────────────────────────────────────────────

function CoachDashboard({ onNav }) {
  const { user } = useAuth();

  const [academyName] = useState(() => localStorage.getItem("ca_academy_name") || "Your Academy");
  const [academyLogo] = useState(() => localStorage.getItem("ca_academy_logo") || null);

  const [loading,     setLoading]     = useState(true);
  const [batches,     setBatches]     = useState([]);
  const [homework,    setHomework]    = useState([]);
  const [students,    setStudents]    = useState([]);
  const [pgns,        setPgns]        = useState([]);
  const [batchCounts, setBatchCounts] = useState({});
  const [drawerBatch, setDrawerBatch] = useState(null);

  useEffect(() => {
    async function load() {
      const academies = await getAcademies();
      let ac = null;
      if (user?.role === "coach")
        ac = academies.find(a => String(a.mainCoachId) === String(user?.id));
      else if (user?.role === "admin")
        ac = academies[0] || null;
      const id = ac?.id || null;

      const [b, hw, p, pgnsData, counts] = await Promise.all([
        id ? getBatchesByAcademy(id) : getBatches(),
        id ? getHomeworkByAcademy(id) : getHomework(),
        id ? getProfilesByAcademy(id) : getProfiles(),
        getPgns(),
        getBatchStudentCounts(),
      ]);
      setBatches(b);
      setHomework(hw);
      setStudents(p.filter(x => x.role === "student"));
      setPgns(pgnsData);
      setBatchCounts(counts);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <span className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  // Today's classes
  const todayDayISO   = new Date().toISOString().slice(0, 10);
  const todayDayValue = new Date().toLocaleDateString("en", { weekday: "short" });
  const todaysClasses = batches
    .filter(b => b.isActive !== false && b.days?.includes(todayDayValue))
    .map(b => ({
      ...b,
      todayTime: b.times?.[todayDayValue] || null,
      studentCount: batchCounts[b.id] || b.students?.length || 0,
    }))
    .sort((a, bx) => (a.todayTime || "99:99").localeCompare(bx.todayTime || "99:99"));

  const nextClass = todaysClasses[0];
  const overdueHw = homework.filter(hw => hw.dueDate && new Date(hw.dueDate) < new Date());

  const QUICK = [
    { icon: CalendarDays, label: "Add Class",       page: "batches",    color: "text-blue-500",   bg: "bg-blue-50"   },
    { icon: BookOpen,     label: "Assign Homework", page: "homework",   color: "text-orange-500", bg: "bg-orange-50" },
    { icon: UserPlus,     label: "Add Student",     page: "academy",    color: "text-blue-500",   bg: "bg-blue-50"   },
    { icon: Users,        label: "Create Batch",    page: "batches",    color: "text-pink-500",   bg: "bg-pink-50"   },
    { icon: FileText,     label: "PGN Center",      page: "pgn-center", color: "text-violet-500", bg: "bg-violet-50" },
    { icon: BarChart2,    label: "View Activity",   page: "activity",   color: "text-orange-500", bg: "bg-orange-50" },
  ];

  const STATS = [
    {
      icon: Users,
      label: "Total Students",
      value: students.length,
      sub: "In your academy",
      subGreen: false,
    },
    {
      icon: Users,
      label: "Active Batches",
      value: batches.filter(b => b.isActive !== false).length,
      sub: `${todaysClasses.length} class${todaysClasses.length !== 1 ? "es" : ""} today`,
      subGreen: false,
    },
    {
      icon: Calendar,
      label: "Classes Today",
      value: todaysClasses.length,
      sub: nextClass ? `Next: ${fmtTime12(nextClass.todayTime)}` : "None scheduled",
      subGreen: false,
    },
    {
      icon: BookOpen,
      label: "Homework",
      value: homework.length,
      sub: overdueHw.length > 0 ? `${overdueHw.length} overdue` : "Up to date",
      subGreen: overdueHw.length === 0,
    },
    {
      icon: Trophy,
      label: "PGN Library",
      value: pgns.length,
      sub: "Games uploaded",
      subGreen: false,
    },
  ];

  return (
    <div className="bg-[#f5f6fa]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-6 space-y-5">

        {/* ── Dashboard header ── */}
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gray-900 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            {academyLogo
              ? <img src={academyLogo} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-white text-base font-black">{academyName.slice(0, 2).toUpperCase()}</span>
            }
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{academyName}</p>
            <h1 className="text-[24px] font-black text-gray-900 leading-tight">Coach Dashboard</h1>
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STATS.map(({ icon: Icon, label, value, sub, subGreen }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Icon size={18} className="text-gray-500" />
                </div>
              </div>
              <p className="text-[13px] text-gray-500 mb-0.5">{label}</p>
              <p className="text-[32px] font-black text-gray-900 leading-none">{value}</p>
              {sub && (
                <p className={cn("text-[11px] mt-1.5 flex items-center gap-1",
                  subGreen ? "text-emerald-500" : "text-gray-400")}>
                  {subGreen && <span>↑</span>}{sub}
                </p>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Two-column main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">

          {/* ── Left column ── */}
          <div className="space-y-5">

            {/* Today's Classes */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-black text-[15px] text-gray-900">Today's Classes</h3>
                <button onClick={() => onNav("batches")}
                  className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                  View all
                </button>
              </div>

              {todaysClasses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays size={28} className="text-gray-200 mb-2" />
                  <p className="text-[13px] text-gray-400">No classes scheduled for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {todaysClasses.map(b => {
                    const lvl = LEVEL_CFG[b.level] || LEVEL_CFG.Beginner;
                    return (
                      <button key={b.id} onClick={() => setDrawerBatch(b)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                        {b.todayTime && (
                          <span className="text-[13px] font-black text-gray-600 w-20 shrink-0">
                            {fmtTime12(b.todayTime)}
                          </span>
                        )}
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", lvl.bg)}>
                          <span className={cn("text-[10px] font-black", lvl.text)}>{lvl.abbr}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-gray-900">{b.name}</p>
                          <p className="text-[12px] text-gray-400">{b.level}</p>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <Users size={10} />{b.studentCount} students
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold shrink-0">
                          Upcoming
                        </span>
                        <ChevronRight size={14} className="text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Batch Performance Overview */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-black text-[15px] text-gray-900">Batch Performance Overview</h3>
                <button onClick={() => onNav("batches")}
                  className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-colors">
                  View all
                </button>
              </div>

              {batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users size={28} className="text-gray-200 mb-2" />
                  <p className="text-[13px] text-gray-400">No batches yet. Create your first batch.</p>
                  <button onClick={() => onNav("batches")}
                    className="mt-4 h-9 px-5 rounded-xl bg-brand-600 text-white text-[12px] font-semibold hover:bg-brand-700 transition-colors">
                    Create batch
                  </button>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Batch</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Students</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Level</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Schedule</th>
                      <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {batches.slice(0, 6).map(b => {
                      const count = batchCounts[b.id] || b.students?.length || 0;
                      const lvl   = LEVEL_CFG[b.level] || LEVEL_CFG.Beginner;
                      const days  = b.days?.join(", ") || "—";
                      return (
                        <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-3.5 text-[13px] font-bold text-gray-800">{b.name}</td>
                          <td className="px-4 py-3.5 text-[13px] text-gray-600">{count}</td>
                          <td className="px-4 py-3.5">
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold", lvl.bg, lvl.text)}>
                              {b.level}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[12px] text-gray-400">{days}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button onClick={() => onNav("batches")} className="text-gray-300 hover:text-gray-500 transition-colors">
                              <ChevronRight size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </motion.div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-4">

            {/* Upcoming Events — placeholder */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-black text-[15px] text-gray-900">Upcoming Events</h3>
              </div>
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <CalendarDays size={24} className="text-gray-200 mb-2" />
                <p className="text-[12px] text-gray-400">No upcoming events</p>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-black text-[15px] text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 grid grid-cols-3 gap-2">
                {QUICK.map(({ icon: Icon, label, page, bg, color }) => (
                  <button key={label} onClick={() => onNav(page)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors text-center">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", bg)}>
                      <Icon size={16} className={color} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Coach's Tip */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-black text-[15px] text-gray-900 mb-3">Coach's Tip</h3>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Lightbulb size={18} className="text-blue-500" />
                </div>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  Consistency is key in chess improvement. Encourage <strong>daily</strong> practice and game review for faster progress.
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-[12px] text-gray-400 pb-2">Keep inspiring. Every move counts! ♟</p>
      </div>

      {/* ── Batch drawer ── */}
      <AnimatePresence>
        {drawerBatch && (
          <BatchDrawer
            batch={drawerBatch}
            todayISO={todayDayISO}
            onClose={() => setDrawerBatch(null)}
            onNav={page => { setDrawerBatch(null); onNav(page); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Homework row (shared) ─────────────────────────────────────────────────────

function HWRow({ hw, onClick }) {
  const isOverdue = hw.dueDate && new Date(hw.dueDate) < new Date();
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-100">
      <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
        <BookOpen size={16} className="text-violet-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{hw.title}</p>
        <p className="text-xs text-gray-400">{hw.batchName || hw.batchId}</p>
      </div>
      {hw.dueDate && (
        <span className={cn("text-xs font-semibold shrink-0 px-2.5 py-1 rounded-full",
          isOverdue ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500")}>
          {isOverdue ? "Overdue" : hw.dueDate}
        </span>
      )}
    </button>
  );
}

// ── Student dashboard ─────────────────────────────────────────────────────────

function StudentDashboard({ onNav }) {
  const { user } = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [batches,  setBatches]  = useState([]);
  const [homework, setHomework] = useState([]);

  useEffect(() => {
    async function load() {
      const [b, hw] = await Promise.all([
        getBatchesForStudent(user.id),
        user?.batchCode ? getHomeworkForBatch(user.batchCode) : Promise.resolve([]),
      ]);
      setBatches(b);
      setHomework(hw);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <span className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-brand-500 animate-spin" />
    </div>
  );

  return (
    <div className="bg-[#f4f6fb]">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-6 space-y-5">

        {/* Welcome banner */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-brand-600 to-violet-600 rounded-3xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center text-3xl font-black shrink-0">
              {user?.avatar || user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white/70 text-sm">Welcome back</p>
              <h2 className="text-2xl font-black">{user?.name}</h2>
              {user?.batchCode && (
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                  Batch: {user.batchCode}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: BookOpen, label: "My Homework", value: homework.length, sub: "Assigned to you", color: "bg-violet-50", ic: "text-violet-500" },
            { icon: Users,    label: "My Batches",  value: batches.length,  sub: "Enrolled in",     color: "bg-indigo-50", ic: "text-indigo-500" },
          ].map(({ icon: Icon, label, value, sub, color, ic }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", color)}>
                <Icon size={18} className={ic} />
              </div>
              <p className="text-[13px] text-gray-500">{label}</p>
              <p className="text-[28px] font-black text-gray-900 leading-none mt-0.5">{value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Homework */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">My Homework</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {user?.batchCode ? `Batch ${user.batchCode}` : "All assignments"}
                </p>
              </div>
              <button onClick={() => onNav("homework")}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors">
                Open <ArrowUpRight size={11} />
              </button>
            </div>
            {homework.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No homework assigned yet</p>
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {homework.slice(0, 5).map(hw => <HWRow key={hw.id} hw={hw} onClick={() => onNav("homework")} />)}
              </div>
            )}
          </motion.div>

          {/* My batches */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">My Batches</h3>
                <p className="text-xs text-gray-400 mt-0.5">Your enrolled classes</p>
              </div>
              <button onClick={() => onNav("batches")}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors">
                View <ArrowUpRight size={11} />
              </button>
            </div>
            {batches.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Not enrolled in any batch yet</p>
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {batches.map(b => (
                  <button key={b.id} onClick={() => onNav("batches")}
                    className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {b.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{b.name}</p>
                      <p className="text-xs text-gray-400">{b.days?.length ? b.days.join(", ") : "No schedule"}</p>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold shrink-0", LEVEL_BADGE[b.level] || "bg-gray-100 text-gray-600")}>
                      {b.level}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900">Blitz Race</p>
              <p className="text-sm text-gray-500 mt-0.5">Solve puzzles and beat the clock!</p>
            </div>
          </div>
          <button onClick={() => onNav("blitz-race")}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm shadow hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0">
            Play now <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function HomePage({ onNav }) {
  const { user } = useAuth();
  if (user?.role === "student") return <StudentDashboard onNav={onNav} />;
  return <CoachDashboard onNav={onNav} />;
}
