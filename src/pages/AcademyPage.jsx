import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, Trash2, X, Search, Eye, EyeOff,
  GraduationCap, Star, Phone, Mail, Calendar,
  ChevronRight, Link2, UserCheck, BookOpen, BarChart2,
} from "lucide-react";
import { cn } from "../lib/utils";

// ── storage hook ──────────────────────────────────────────────────────────────

function useSaved(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

// ── constants ─────────────────────────────────────────────────────────────────

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Open"];

const LEVEL_CHIP = {
  Beginner:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Intermediate: "bg-blue-50 text-blue-700 border-blue-200",
  Advanced:     "bg-orange-50 text-orange-700 border-orange-200",
  Open:         "bg-violet-50 text-violet-700 border-violet-200",
};

const inputCls =
  "w-full h-12 rounded-2xl border border-gray-200 bg-white px-4 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

// ── shared: Field label ───────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">{label}</p>
      {children}
    </div>
  );
}

// ── shared: Drawer shell ──────────────────────────────────────────────────────

function Drawer({ open, onClose, title, width = "max-w-[480px]", children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
        >
          <motion.aside
            initial={{ x: 600 }} animate={{ x: 0 }} exit={{ x: 600 }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className={cn("w-full bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl", width)}
          >
            <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-gray-200 shrink-0">
              <h2 className="font-black text-[16px] text-gray-900">{title}</h2>
              <button onClick={onClose}
                className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X size={17} />
              </button>
            </div>
            {children}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Academy tab (placeholder) ─────────────────────────────────────────────────

function AcademyTab() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-[24px] bg-brand-50 flex items-center justify-center mb-5">
        <GraduationCap size={34} className="text-brand-400" />
      </div>
      <h3 className="text-[20px] font-black text-gray-800">Academy Details</h3>
      <p className="text-[13px] text-gray-400 mt-2 max-w-xs">
        Configure your academy profile, settings, and branding here.
      </p>
      <span className="mt-4 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-bold text-amber-600">
        Coming Soon
      </span>
    </div>
  );
}

// ── Add Coach drawer ──────────────────────────────────────────────────────────

function AddCoachDrawer({ open, onClose, onSave }) {
  const blank = { name: "", rating: "", levels: [], dob: "", phone: "", email: "" };
  const [form, setForm] = useState(blank);

  function toggleLevel(l) {
    setForm(f => ({
      ...f,
      levels: f.levels.includes(l) ? f.levels.filter(x => x !== l) : [...f.levels, l],
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...form, id: Date.now(), avatar: form.name.trim()[0].toUpperCase() });
    setForm(blank);
    onClose();
  }

  return (
    <Drawer open={open} onClose={onClose} title="Add Coach">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          <Field label="Full Name">
            <input className={inputCls} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Coach full name" autoFocus required />
          </Field>

          <Field label="Rating">
            <input type="number" min="0" max="3500" className={inputCls} value={form.rating}
              onChange={e => setForm(f => ({ ...f, rating: e.target.value }))}
              placeholder="e.g. 2100" />
          </Field>

          <Field label="Level Expertise">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map(l => (
                <button key={l} type="button" onClick={() => toggleLevel(l)}
                  className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all",
                    form.levels.includes(l)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300")}>
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Date of Birth">
            <input type="date" className={inputCls} value={form.dob}
              onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
          </Field>

          <Field label="Phone">
            <input className={inputCls} value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 99999 00000" />
          </Field>

          <Field label="Email">
            <input type="email" className={inputCls} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="coach@email.com" />
          </Field>

        </div>
        <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
            Add Coach
          </button>
        </div>
      </form>
    </Drawer>
  );
}

// ── Coach detail drawer ───────────────────────────────────────────────────────

function CoachDetailDrawer({ coach, open, onClose }) {
  const batches = useMemo(() => {
    if (!coach) return [];
    try {
      const all = JSON.parse(localStorage.getItem("ca_batches") || "[]");
      return all.filter(b => b.coach?.toLowerCase() === coach.name?.toLowerCase());
    } catch { return []; }
  }, [coach]);

  if (!coach) return null;

  const age = coach.dob
    ? Math.floor((Date.now() - new Date(coach.dob)) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <Drawer open={open} onClose={onClose} title={coach.name}>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-600 to-violet-600 rounded-[24px] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center text-2xl font-black">
              {coach.avatar}
            </div>
            <div>
              <h3 className="text-[18px] font-black">{coach.name}</h3>
              {coach.rating && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Star size={13} className="text-yellow-300 fill-yellow-300" />
                  <span className="text-[13px] text-white/80">Rating {coach.rating}</span>
                </div>
              )}
            </div>
          </div>
          {coach.levels?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {coach.levels.map(l => (
                <span key={l} className="px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold text-white">{l}</span>
              ))}
            </div>
          )}
        </div>

        {/* Contact */}
        {(age !== null || coach.phone || coach.email) && (
          <div className="bg-white rounded-[20px] border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {age !== null && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Calendar size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.dob} · {age} yrs</span>
              </div>
            )}
            {coach.phone && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.phone}</span>
              </div>
            )}
            {coach.email && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{coach.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Batches */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Batches in this Academy ({batches.length})
          </p>
          {batches.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-gray-200 py-10 flex flex-col items-center text-center">
              <BookOpen size={24} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">No batches assigned to this coach</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{b.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.id} · {b.level}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[12px] text-gray-500 shrink-0">
                    <Users size={12} />{b.students?.length || 0}
                  </span>
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    b.isActive !== false ? "bg-emerald-500" : "bg-red-400")} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

// ── Coaches tab ───────────────────────────────────────────────────────────────

function CoachesTab() {
  const [coaches, saveCoaches] = useSaved("ca_coaches", []);
  const [showAdd, setShowAdd]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]    = useState("");

  const filtered = useMemo(() =>
    coaches.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase())),
    [coaches, filter]
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name…"
            className="w-full h-10 pl-9 pr-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-500 transition-colors" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold shadow-lg shadow-brand-500/20 transition-all shrink-0">
          <Plus size={15} />Add Coach
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
            <UserCheck size={28} className="text-brand-400" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-800">{filter ? "No matches" : "No coaches yet"}</h3>
          <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">
            {filter ? "Try a different name." : "Add your first coach to get started."}
          </p>
          {!filter && (
            <button onClick={() => setShowAdd(true)} className="mt-5 h-10 px-5 rounded-xl bg-brand-600 text-white text-[13px] font-semibold">
              Add Coach
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Coach</p>
            <p className="hidden sm:block w-20 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Rating</p>
            <p className="hidden md:block w-56 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Levels</p>
            <p className="hidden sm:block w-28 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Contact</p>
            <span className="w-14 shrink-0" />
          </div>

          {filtered.map(coach => (
            <div key={coach.id} onClick={() => setSelected(coach)}
              className="group flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
              {/* Avatar + name */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-brand-400 to-violet-600 text-white font-black text-[15px] flex items-center justify-center shrink-0">
                  {coach.avatar}
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{coach.name}</p>
                  {coach.email && <p className="text-[11px] text-gray-400 truncate">{coach.email}</p>}
                </div>
              </div>
              {/* Rating */}
              <div className="hidden sm:flex items-center gap-1 w-20 shrink-0">
                {coach.rating
                  ? <><Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" /><span className="text-[13px] font-semibold text-gray-700">{coach.rating}</span></>
                  : <span className="text-[13px] text-gray-300">—</span>}
              </div>
              {/* Level tags */}
              <div className="hidden md:flex flex-wrap gap-1 w-56 shrink-0">
                {coach.levels?.length > 0
                  ? coach.levels.map(l => (
                    <span key={l} className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full border", LEVEL_CHIP[l] || "bg-gray-50 text-gray-500 border-gray-200")}>
                      {l}
                    </span>
                  ))
                  : <span className="text-[12px] text-gray-300">—</span>}
              </div>
              {/* Phone */}
              <div className="hidden sm:block w-28 shrink-0">
                <p className="text-[12px] text-gray-400 truncate">{coach.phone || "—"}</p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                <button onClick={e => { e.stopPropagation(); saveCoaches(coaches.filter(c => c.id !== coach.id)); }}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddCoachDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={c => saveCoaches([...coaches, c])}
      />
      <CoachDetailDrawer
        coach={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ── Add Student drawer ────────────────────────────────────────────────────────

function AddStudentDrawer({ open, onClose, onSave, existingUsernames }) {
  const blank = { name: "", phone: "", email: "", username: "", password: "" };
  const [form, setForm]     = useState(blank);
  const [showPw, setShowPw] = useState(false);
  const [error, setError]   = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError("Name, username and password are required."); return;
    }
    if (existingUsernames.includes(form.username.trim().toLowerCase())) {
      setError("Username already taken."); return;
    }
    setError("");
    onSave({ ...form });
    setForm(blank);
    onClose();
  }

  function handleClose() { setError(""); onClose(); }

  return (
    <Drawer open={open} onClose={handleClose} title="Add Student">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] font-semibold text-red-700">
              {error}
            </div>
          )}

          <Field label="Full Name">
            <input className={inputCls} value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Arjun Kumar" autoFocus required />
          </Field>

          <Field label="Phone">
            <input className={inputCls} value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 99999 00000" />
          </Field>

          <Field label="Email">
            <input type="email" className={inputCls} value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="student@email.com" />
          </Field>

          <Field label="Username">
            <input className={inputCls} value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="e.g. arjun_k" required />
          </Field>

          <Field label="Password">
            <div className="relative">
              <input type={showPw ? "text" : "password"} className={cn(inputCls, "pr-12")} value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Create password" required />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0 flex gap-3">
          <button type="button" onClick={handleClose}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit"
            className="flex-1 h-12 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors">
            Add Student
          </button>
        </div>
      </form>
    </Drawer>
  );
}

// ── Student profile drawer ────────────────────────────────────────────────────

function StudentProfileDrawer({ student, open, onClose }) {
  const batches = useMemo(() => {
    if (!student) return [];
    try {
      const all = JSON.parse(localStorage.getItem("ca_batches") || "[]");
      return all.filter(b =>
        b.students?.some(s => s.name?.toLowerCase() === student.name?.toLowerCase())
      );
    } catch { return []; }
  }, [student]);

  const attendance = useMemo(() => {
    if (!student) return [];
    try {
      return JSON.parse(localStorage.getItem("ca_attendance") || "[]")
        .filter(a => a.studentId === student.id);
    } catch { return []; }
  }, [student]);

  if (!student) return null;

  const present = attendance.filter(a => a.present).length;
  const pct     = attendance.length ? Math.round((present / attendance.length) * 100) : null;

  return (
    <Drawer open={open} onClose={onClose} title="Student Profile" width="max-w-[560px]">
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 rounded-[24px] p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[18px] bg-white/20 flex items-center justify-center text-2xl font-black">
              {student.avatar || student.name?.[0]?.toUpperCase() || "S"}
            </div>
            <div>
              <h3 className="text-[18px] font-black">{student.name}</h3>
              <p className="text-[13px] text-white/70 mt-0.5">@{student.username}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Batches",    batches.length],
            ["Sessions",   attendance.length],
            ["Attendance", pct !== null ? `${pct}%` : "—"],
          ].map(([l, v]) => (
            <div key={l} className="rounded-[20px] bg-white border border-gray-200 p-5 text-center shadow-sm">
              <p className="text-2xl font-black text-brand-600 leading-none mb-1.5">{v}</p>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{l}</p>
            </div>
          ))}
        </div>

        {/* Contact info */}
        {(student.phone || student.email) && (
          <div className="bg-white rounded-[20px] border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {student.phone && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{student.phone}</span>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="text-[13px] text-gray-600">{student.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Connected accounts */}
        <div className="bg-white rounded-[20px] border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Connected Accounts</p>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Lichess */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-xs font-black text-gray-200 shrink-0">L</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-700">Lichess</p>
                  {student.lichessId
                    ? <p className="text-[11px] text-emerald-600 mt-0.5">@{student.lichessId}</p>
                    : <p className="text-[11px] text-gray-400 mt-0.5">Not connected</p>}
                </div>
              </div>
              {student.lichessId && (
                <a href={`https://lichess.org/@/${student.lichessId}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Link2 size={13} />
                </a>
              )}
            </div>
            {/* Chess.com */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-800 flex items-center justify-center text-xs font-black text-white shrink-0">C</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-700">Chess.com</p>
                  {student.chessComId
                    ? <p className="text-[11px] text-emerald-600 mt-0.5">@{student.chessComId}</p>
                    : <p className="text-[11px] text-gray-400 mt-0.5">Not connected</p>}
                </div>
              </div>
              {student.chessComId && (
                <a href={`https://chess.com/member/${student.chessComId}`} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
                  <Link2 size={13} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Batches assigned */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Batches Assigned ({batches.length})
          </p>
          {batches.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-gray-200 py-10 flex flex-col items-center text-center">
              <BookOpen size={24} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">Not assigned to any batch yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {batches.map(b => (
                <div key={b.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-gray-900 truncate">{b.name}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{b.id} · {b.coach || "—"} · {b.level}</p>
                  </div>
                  <span className={cn("w-2 h-2 rounded-full shrink-0",
                    b.isActive !== false ? "bg-emerald-500" : "bg-red-400")} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attendance */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-3">
            Attendance ({attendance.length} sessions)
          </p>
          {attendance.length === 0 ? (
            <div className="bg-white rounded-[20px] border border-gray-200 py-10 flex flex-col items-center text-center">
              <BarChart2 size={24} className="text-gray-300 mb-2" />
              <p className="text-[13px] text-gray-400">No attendance records yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-[20px] border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {attendance.slice(0, 15).map((a, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <p className="text-[13px] text-gray-700">{a.date}</p>
                  {a.batchName && <p className="text-[12px] text-gray-400">{a.batchName}</p>}
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                    a.present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
                    {a.present ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Drawer>
  );
}

// ── Students tab ──────────────────────────────────────────────────────────────

function StudentsTab() {
  const [users, saveUsers]      = useSaved("ca_users", []);
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("");

  const students = useMemo(() =>
    users.filter(u => u.role === "student" &&
      (!filter ||
        u.name?.toLowerCase().includes(filter.toLowerCase()) ||
        u.username?.toLowerCase().includes(filter.toLowerCase()))
    ),
    [users, filter]
  );

  const existingUsernames = useMemo(() => users.map(u => u.username?.toLowerCase()), [users]);

  function handleSave(form) {
    saveUsers([...users, {
      id: Date.now(),
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      role: "student",
      avatar: form.name.trim()[0].toUpperCase(),
    }]);
    setShowAdd(false);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-6">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by name…"
            className="w-full h-10 pl-9 pr-4 rounded-2xl border border-gray-200 bg-white text-[13px] text-gray-700 placeholder:text-gray-400 outline-none focus:border-brand-500 transition-colors" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-semibold shadow-lg shadow-brand-500/20 transition-all shrink-0">
          <Plus size={15} />Add Student
        </button>
      </div>

      {students.length === 0 ? (
        <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
            <Users size={28} className="text-brand-400" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-800">{filter ? "No matches" : "No students yet"}</h3>
          <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">
            {filter ? "Try a different name." : "Add your first student to get started."}
          </p>
          {!filter && (
            <button onClick={() => setShowAdd(true)} className="mt-5 h-10 px-5 rounded-xl bg-brand-600 text-white text-[13px] font-semibold">
              Add Student
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/80">
            <p className="flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Student</p>
            <p className="hidden sm:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Username</p>
            <p className="hidden md:block w-32 shrink-0 text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</p>
            <p className="hidden lg:block flex-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Email</p>
            <span className="w-14 shrink-0" />
          </div>

          {students.map(s => (
            <div key={s.id} onClick={() => setSelected(s)}
              className="group flex items-center gap-4 px-5 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/60 transition-colors cursor-pointer">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white font-black text-[14px] flex items-center justify-center shrink-0">
                  {s.avatar || s.name?.[0]?.toUpperCase()}
                </div>
                <p className="text-[14px] font-bold text-gray-900 truncate">{s.name}</p>
              </div>
              <p className="hidden sm:block w-32 shrink-0 font-mono text-[12px] text-gray-500 truncate">{s.username}</p>
              <p className="hidden md:block w-32 shrink-0 text-[12px] text-gray-400 truncate">{s.phone || "—"}</p>
              <p className="hidden lg:block flex-1 text-[12px] text-gray-400 truncate">{s.email || "—"}</p>
              <div className="flex items-center gap-1 shrink-0">
                <ChevronRight size={15} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                <button onClick={e => { e.stopPropagation(); saveUsers(users.filter(u => u.id !== s.id)); }}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddStudentDrawer
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleSave}
        existingUsernames={existingUsernames}
      />
      <StudentProfileDrawer
        student={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AcademyPage() {
  const [tab, setTab] = useState("coaches");

  return (
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Tabs */}
        <div className="flex items-center border-b-2 border-gray-200 mb-7">
          {[["academy", "Academy"], ["coaches", "Coaches"], ["students", "Students"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "relative px-5 py-3 text-[14px] font-bold transition-colors",
                tab === id ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
              )}>
              {label}
              {tab === id && (
                <motion.span
                  layoutId="academy-tab-line"
                  className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-brand-600 rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {tab === "academy"  && <AcademyTab />}
        {tab === "coaches"  && <CoachesTab />}
        {tab === "students" && <StudentsTab />}

      </div>
    </div>
  );
}
