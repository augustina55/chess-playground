import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GraduationCap, Trash2, Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";

function useSaved(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

const inputCls = "w-full px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm transition-colors";
const BLANK = { name: "", phone: "", email: "", username: "", password: "", academyId: "" };

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export default function AcademyPage({ search }) {
  const [users,     saveUsers]    = useSaved("ca_users",    []);
  const [academies]               = useSaved("ca_academies", []);
  const [form,      setForm]      = useState(BLANK);
  const [error,     setError]     = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [formOpen,  setFormOpen]  = useState(false);

  const students = users
    .filter(u => u.role === "student")
    .filter(u => !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()));

  function addStudent(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setError("Name, username and password are required."); return; }
    if (users.some(u => u.username.toLowerCase() === form.username.trim().toLowerCase())) { setError("Username already exists."); return; }
    setError("");
    saveUsers([...users, { id: Date.now(), username: form.username.trim(), password: form.password, name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(), role: "student", avatar: form.name.trim()[0].toUpperCase(), academyId: form.academyId || null }]);
    setForm(BLANK);
    setFormOpen(false);
  }

  return (
    <div className="p-6 md:p-8 page-enter">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Academy</h1>
          <p className="text-[14px] text-slate-400 mt-1">{students.length} student{students.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setFormOpen(o => !o)} className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold rounded-2xl shadow-sm transition-colors">
          <Plus size={16} />Add Student
        </button>
      </div>

      {formOpen && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] mb-8"
        >
          <h2 className="font-bold text-[16px] text-slate-800 dark:text-slate-200 mb-6">New Student</h2>
          {error && <p className="text-[13px] text-terra-700 dark:text-terra-400 bg-terra-50 dark:bg-terra-900/30 border border-terra-200 dark:border-terra-900 px-4 py-3 rounded-2xl mb-5">{error}</p>}
          <form onSubmit={addStudent}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
              <Field label="Student Name"><input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arjun Kumar" autoFocus /></Field>
              <Field label="Phone"><input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 99999 00000" /></Field>
              <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="arjun@email.com" /></Field>
              <Field label="Username"><input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. arjun_k" /></Field>
              <Field label="Password">
                <div className="relative">
                  <input type={showPw ? "text" : "password"} className={cn(inputCls, "pr-12")} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Create password" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              {academies.length > 0 && (
                <Field label="Academy">
                  <select className={inputCls} value={form.academyId} onChange={e => setForm(f => ({ ...f, academyId: e.target.value }))}>
                    <option value="">— Select Academy —</option>
                    {academies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setFormOpen(false); setError(""); }} className="px-6 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-[14px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold transition-colors shadow-sm">Add Student</button>
            </div>
          </form>
        </motion.div>
      )}

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-5 shadow-[var(--shadow-card)]">
            <GraduationCap size={26} className="text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-semibold text-slate-500 dark:text-slate-400 text-[15px]">{search ? "No students match your search" : "No students added yet"}</p>
          {!search && <button onClick={() => setFormOpen(true)} className="mt-3 text-[14px] text-brand-600 hover:underline font-semibold">Add your first student →</button>}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left" style={{ background: "rgba(0,0,0,0.02)" }}>
                <th className="px-7 py-4">Name</th>
                <th className="px-7 py-4">Username</th>
                <th className="px-7 py-4 hidden sm:table-cell">Phone</th>
                <th className="px-7 py-4 hidden md:table-cell">Email</th>
                <th className="px-7 py-4 hidden lg:table-cell">Academy</th>
                <th className="px-7 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {students.map((u, i) => {
                const acad = academies.find(a => String(a.id) === String(u.academyId));
                return (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-7 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{u.avatar}</span>
                        <span className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-7 py-4 font-mono text-[13px] text-slate-500">{u.username}</td>
                    <td className="px-7 py-4 text-[13px] text-slate-400 hidden sm:table-cell">{u.phone || "—"}</td>
                    <td className="px-7 py-4 text-[13px] text-slate-400 hidden md:table-cell">{u.email || "—"}</td>
                    <td className="px-7 py-4 hidden lg:table-cell">
                      {acad ? <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400">{acad.name}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-7 py-4 text-right">
                      <button onClick={() => saveUsers(users.filter(x => x.id !== u.id))} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
