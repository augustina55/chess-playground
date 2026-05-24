import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Building2, Users, Settings } from "lucide-react";
import { cn } from "../lib/utils";

const ROLES = ["admin", "coach", "student"];
const ROLE_STYLES = {
  admin:   "bg-terra-100  text-terra-700  dark:bg-terra-900/30  dark:text-terra-400",
  coach:   "bg-brand-100  text-brand-700  dark:bg-brand-900/40  dark:text-brand-400",
  student: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

function useSaved(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

const inputCls = "w-full px-4 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50/80 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 text-sm transition-colors";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function AcademyDetail({ academy, onBack, users }) {
  const students = users.filter(u => u.role === "student" && String(u.academyId) === String(academy.id));
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2.5 rounded-2xl hover:bg-white/80 dark:hover:bg-slate-800 text-slate-500 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{academy.name}</h2>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-7 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] grid grid-cols-2 md:grid-cols-3 gap-6">
        {[["Phone", academy.phone], ["Location", academy.location], ["Main Coach", academy.mainCoach]].map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{k}</p>
            <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">{v || "—"}</p>
          </div>
        ))}
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-7 py-5 border-b border-black/[0.03] dark:border-white/[0.04]">
          <Users size={15} className="text-slate-400" />
          <h3 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Students ({students.length})</h3>
        </div>
        {students.length === 0 ? (
          <p className="text-[14px] text-slate-400 text-center py-10">No students enrolled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left" style={{ background: "rgba(0,0,0,0.02)" }}>
              <th className="px-7 py-4">Name</th><th className="px-7 py-4">Username</th><th className="px-7 py-4">Phone</th><th className="px-7 py-4">Email</th>
            </tr></thead>
            <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-7 py-4 font-semibold text-[14px] text-slate-800 dark:text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center">{s.avatar}</span>
                      {s.name}
                    </div>
                  </td>
                  <td className="px-7 py-4 font-mono text-[13px] text-slate-500">{s.username}</td>
                  <td className="px-7 py-4 text-[13px] text-slate-400">{s.phone || "—"}</td>
                  <td className="px-7 py-4 text-[13px] text-slate-400">{s.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}

const TABS = [
  { id: "users",    label: "Users",    icon: Users },
  { id: "academy",  label: "Academy",  icon: Building2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPage({ search }) {
  const [users, saveUsers] = useSaved("ca_users", [
    { id: 1, username: "admin",   name: "Admin User",  role: "admin",   avatar: "A" },
    { id: 2, username: "coach",   name: "Coach Ravi",  role: "coach",   avatar: "R" },
    { id: 3, username: "student", name: "Arjun Kumar", role: "student", avatar: "K" },
  ]);
  const [academies, saveAcademies] = useSaved("ca_academies", []);
  const [userForm,  setUserForm]   = useState({ username: "", name: "", role: "student", password: "" });
  const [acForm,    setAcForm]     = useState({ name: "", phone: "", location: "", mainCoach: "" });
  const [tab,       setTab]        = useState("users");
  const [selected,  setSelected]   = useState(null);

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );
  const filteredAcademies = academies.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  function addUser(e) {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.name.trim()) return;
    saveUsers([...users, { id: Date.now(), username: userForm.username.trim(), password: userForm.password, name: userForm.name.trim(), role: userForm.role, avatar: userForm.name.trim()[0].toUpperCase() }]);
    setUserForm({ username: "", name: "", role: "student", password: "" });
  }

  function addAcademy(e) {
    e.preventDefault();
    if (!acForm.name.trim()) return;
    saveAcademies([...academies, { id: Date.now(), ...acForm }]);
    setAcForm({ name: "", phone: "", location: "", mainCoach: "" });
  }

  return (
    <div className="p-6 md:p-8 page-enter">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 rounded-2xl w-fit mb-8" style={{ background: "rgba(0,0,0,0.05)" }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSelected(null); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-all",
                tab === t.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="flex flex-wrap gap-7 items-start">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] w-full max-w-sm space-y-5">
            <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-200">Add User</h2>
            <form onSubmit={addUser} className="space-y-4">
              <Field label="Full Name"><input className={inputCls} value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" /></Field>
              <Field label="Username"><input className={inputCls} value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. ravi_k" /></Field>
              <Field label="Password"><input type="password" className={inputCls} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Set password" /></Field>
              <Field label="Role">
                <select className={inputCls} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <button type="submit" className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold transition-colors shadow-sm">Add User</button>
            </form>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[15px] text-slate-700 dark:text-slate-200 mb-4">Users <span className="text-slate-400 font-normal">({filteredUsers.length})</span></h2>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] overflow-hidden">
              {filteredUsers.length === 0 ? <p className="text-[14px] text-slate-400 text-center py-10">No users found.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-left" style={{ background: "rgba(0,0,0,0.02)" }}>
                    <th className="px-7 py-4">Name</th><th className="px-7 py-4">Username</th><th className="px-7 py-4">Role</th><th className="px-7 py-4" />
                  </tr></thead>
                  <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="px-7 py-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white text-xs font-bold flex items-center justify-center">{u.avatar}</span>
                            <span className="font-semibold text-[14px] text-slate-800 dark:text-slate-200">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-7 py-4 font-mono text-[13px] text-slate-500">{u.username}</td>
                        <td className="px-7 py-4"><span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", ROLE_STYLES[u.role])}>{u.role}</span></td>
                        <td className="px-7 py-4 text-right">
                          <button onClick={() => saveUsers(users.filter(x => x.id !== u.id))} className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Academy tab */}
      {tab === "academy" && !selected && (
        <div className="flex flex-wrap gap-7 items-start">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] w-full max-w-sm space-y-5">
            <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-200">Add Academy</h2>
            <form onSubmit={addAcademy} className="space-y-4">
              <Field label="Academy Name"><input className={inputCls} value={acForm.name} onChange={e => setAcForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Knight's Chess Club" /></Field>
              <Field label="Phone"><input className={inputCls} value={acForm.phone} onChange={e => setAcForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 99999 00000" /></Field>
              <Field label="Location"><input className={inputCls} value={acForm.location} onChange={e => setAcForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" /></Field>
              <Field label="Main Coach"><input className={inputCls} value={acForm.mainCoach} onChange={e => setAcForm(f => ({ ...f, mainCoach: e.target.value }))} placeholder="Coach name" /></Field>
              <button type="submit" className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold transition-colors shadow-sm">Add Academy</button>
            </form>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-[15px] text-slate-700 dark:text-slate-200 mb-4">Academies <span className="text-slate-400 font-normal">({filteredAcademies.length})</span></h2>
            {filteredAcademies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.06] dark:border-white/[0.05]">
                <Building2 size={26} className="text-slate-200 dark:text-slate-700 mb-3" />
                <p className="text-[14px] text-slate-400">No academies yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAcademies.map(a => (
                  <motion.div key={a.id} whileHover={{ y: -2 }}
                    className="card-hover bg-white dark:bg-slate-900 rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] cursor-pointer group relative"
                    onClick={() => setSelected(a)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-[15px] text-slate-900 dark:text-white">{a.name}</h3>
                      <button onClick={e => { e.stopPropagation(); saveAcademies(academies.filter(x => x.id !== a.id)); }}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-[13px] text-slate-400">
                      {a.location && <p>📍 {a.location}</p>}
                      {a.mainCoach && <p>👤 {a.mainCoach}</p>}
                      {a.phone && <p>📞 {a.phone}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "academy" && selected && (
        <AcademyDetail academy={selected} onBack={() => setSelected(null)} users={users} />
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-black/[0.06] dark:border-white/[0.05] shadow-[var(--shadow-card)] max-w-md space-y-5">
          <h2 className="font-bold text-[15px] text-slate-800 dark:text-slate-200">Academy Settings</h2>
          <Field label="Academy Name"><input className={inputCls} defaultValue="Chess Academy" /></Field>
          <Field label="Contact Email"><input type="email" className={inputCls} placeholder="info@chessacademy.com" /></Field>
          <button className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-[14px] font-semibold transition-colors shadow-sm">Save Settings</button>
        </div>
      )}
    </div>
  );
}
