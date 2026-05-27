import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, GraduationCap, Trash2, Eye, EyeOff, Sparkles, Users } from "lucide-react";
import { cn } from "../lib/utils";

function useSaved(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

const inputCls = "w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";
const BLANK = { name: "", phone: "", email: "", username: "", password: "", academyId: "" };

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</label>
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
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-violet-600 via-brand-500 to-brand-600 p-8 md:p-10 shadow-[0_20px_80px_rgba(99,102,241,0.25)] mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium mb-5">
                <Sparkles size={15} />Academy
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">Students</h1>
              <p className="text-white/70 text-base mt-4 max-w-xl">{students.length} student{students.length !== 1 ? "s" : ""} enrolled</p>
            </div>
            <button onClick={() => setFormOpen(o => !o)} className="h-14 px-7 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-3 shrink-0">
              <Plus size={18} />Add Student
            </button>
          </div>
        </div>

        {/* Add form */}
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] border border-gray-200 p-7 shadow-sm mb-6 space-y-5"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                <GraduationCap size={18} className="text-brand-600" />
              </div>
              <div>
                <h2 className="font-black text-[15px] text-gray-900">New Student</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in student details below</p>
              </div>
            </div>
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] font-semibold text-red-700">{error}</div>
            )}
            <form onSubmit={addStudent}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mb-6">
                <Field label="Student Name">
                  <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arjun Kumar" autoFocus />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 99999 00000" />
                </Field>
                <Field label="Email">
                  <input type="email" className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="arjun@email.com" />
                </Field>
                <Field label="Username">
                  <input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. arjun_k" />
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <input type={showPw ? "text" : "password"} className={cn(inputCls, "pr-12")} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Create password" />
                    <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
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
                <button type="button" onClick={() => { setFormOpen(false); setError(""); }}
                  className="h-12 px-6 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm">Cancel</button>
                <button type="submit"
                  className="h-12 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold transition-colors shadow-lg shadow-brand-500/20 text-sm">Add Student</button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Students table */}
        {students.length === 0 ? (
          <div className="rounded-[32px] bg-white border border-gray-200 py-24 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-20 h-20 rounded-[24px] bg-brand-500/10 flex items-center justify-center mb-5">
              <Users size={34} className="text-brand-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{search ? "No students match your search" : "No Students Yet"}</h3>
            <p className="text-gray-400 text-sm max-w-xs">{search ? "Try a different search term." : "Add your first student to get started."}</p>
            {!search && (
              <button onClick={() => setFormOpen(true)} className="mt-5 h-11 px-6 rounded-xl bg-brand-600 text-white font-semibold text-[14px]">Add Student</button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Academy</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((u, i) => {
                  const acad = academies.find(a => String(a.id) === String(u.academyId));
                  return (
                    <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{u.avatar}</span>
                          <span className="font-semibold text-[13.5px] text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[13px] text-gray-500">{u.username}</td>
                      <td className="px-6 py-4 text-[13px] text-gray-400 hidden sm:table-cell">{u.phone || "—"}</td>
                      <td className="px-6 py-4 text-[13px] text-gray-400 hidden md:table-cell">{u.email || "—"}</td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {acad
                          ? <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-brand-50 text-brand-600">{acad.name}</span>
                          : <span className="text-gray-300 text-[13px]">—</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => saveUsers(users.filter(x => x.id !== u.id))}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all ml-auto">
                          <Trash2 size={13} />
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
    </div>
  );
}
