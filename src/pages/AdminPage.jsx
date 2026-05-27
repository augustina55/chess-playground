import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Building2, Users, Settings, Plus, Sparkles, Shield } from "lucide-react";
import { cn } from "../lib/utils";

const ROLES = ["admin", "coach", "student"];
const ROLE_STYLES = {
  admin:   "bg-red-50 text-red-700",
  coach:   "bg-brand-50 text-brand-700",
  student: "bg-emerald-50 text-emerald-700",
};

function useSaved(key, def) {
  const [val, setVal] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; }
  });
  function save(v) { setVal(v); localStorage.setItem(key, JSON.stringify(v)); }
  return [val, save];
}

const inputCls = "w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition-all focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500";

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function AcademyDetail({ academy, onBack, users }) {
  const students = users.filter(u => u.role === "student" && String(u.academyId) === String(academy.id));
  return (
    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="w-11 h-11 rounded-2xl border border-gray-200 bg-white flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
          <ChevronLeft size={17} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{academy.name}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{students.length} students enrolled</p>
        </div>
      </div>
      <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-7 grid grid-cols-2 md:grid-cols-3 gap-6">
        {[["Phone", academy.phone], ["Location", academy.location], ["Main Coach", academy.mainCoach]].map(([k, v]) => (
          <div key={k}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{k}</p>
            <p className="text-[15px] font-semibold text-gray-800">{v || "—"}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-gray-100">
          <Users size={15} className="text-gray-400" />
          <h3 className="text-[14px] font-bold text-gray-900">Students ({students.length})</h3>
        </div>
        {students.length === 0 ? (
          <p className="text-[14px] text-gray-400 text-center py-10">No students enrolled yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-[13.5px] text-gray-800">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center">{s.avatar}</span>
                      {s.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-[13px] text-gray-500">{s.username}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{s.phone || "—"}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{s.email || "—"}</td>
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
    <div className="min-h-screen bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10">

        {/* Hero */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-red-600 via-brand-600 to-violet-600 p-8 md:p-10 shadow-[0_20px_80px_rgba(99,102,241,0.25)] mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-black/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm font-medium mb-5">
              <Shield size={15} />Administration
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">Admin Panel</h1>
            <p className="text-white/70 text-base mt-4 max-w-xl">{users.length} users · {academies.length} academies</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-sm w-fit mb-6">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelected(null); }}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all",
                  tab === t.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>

        {/* Users tab */}
        {tab === "users" && (
          <div className="flex flex-wrap gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-7 w-full max-w-sm space-y-5"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Plus size={16} className="text-brand-600" />
                </div>
                <h2 className="font-black text-[15px] text-gray-900">Add User</h2>
              </div>
              <form onSubmit={addUser} className="space-y-4">
                <Field label="Full Name"><input className={inputCls} value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Ravi Kumar" /></Field>
                <Field label="Username"><input className={inputCls} value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. ravi_k" /></Field>
                <Field label="Password"><input type="password" className={inputCls} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Set password" /></Field>
                <Field label="Role">
                  <select className={inputCls} value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <button type="submit" className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20">Add User</button>
              </form>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-[15px] text-gray-900 mb-4">Users <span className="text-gray-400 font-normal text-sm">({filteredUsers.length})</span></h2>
              <div className="bg-white rounded-[28px] border border-gray-200 shadow-sm overflow-hidden">
                {filteredUsers.length === 0 ? (
                  <p className="text-[14px] text-gray-400 text-center py-12">No users found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Username</th>
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((u, i) => (
                        <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{u.avatar}</span>
                              <span className="font-semibold text-[13.5px] text-gray-800">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-[13px] text-gray-500">{u.username}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600")}>{u.role}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => saveUsers(users.filter(x => x.id !== u.id))}
                              className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all ml-auto">
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </motion.tr>
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
          <div className="flex flex-wrap gap-6 items-start">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-7 w-full max-w-sm space-y-5"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                  <Building2 size={16} className="text-brand-600" />
                </div>
                <h2 className="font-black text-[15px] text-gray-900">Add Academy</h2>
              </div>
              <form onSubmit={addAcademy} className="space-y-4">
                <Field label="Academy Name"><input className={inputCls} value={acForm.name} onChange={e => setAcForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Knight's Chess Club" /></Field>
                <Field label="Phone"><input className={inputCls} value={acForm.phone} onChange={e => setAcForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 99999 00000" /></Field>
                <Field label="Location"><input className={inputCls} value={acForm.location} onChange={e => setAcForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" /></Field>
                <Field label="Main Coach"><input className={inputCls} value={acForm.mainCoach} onChange={e => setAcForm(f => ({ ...f, mainCoach: e.target.value }))} placeholder="Coach name" /></Field>
                <button type="submit" className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20">Add Academy</button>
              </form>
            </motion.div>
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-[15px] text-gray-900 mb-4">Academies <span className="text-gray-400 font-normal text-sm">({filteredAcademies.length})</span></h2>
              {filteredAcademies.length === 0 ? (
                <div className="rounded-[28px] bg-white border border-gray-200 py-20 flex flex-col items-center justify-center text-center shadow-sm">
                  <div className="w-16 h-16 rounded-[20px] bg-brand-500/10 flex items-center justify-center mb-4">
                    <Building2 size={26} className="text-brand-500" />
                  </div>
                  <h3 className="text-base font-bold text-gray-700">No academies yet</h3>
                  <p className="text-gray-400 mt-1 text-sm">Add your first academy above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAcademies.map((a, i) => (
                    <motion.div key={a.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelected(a)}
                      className="group relative overflow-hidden rounded-[24px] bg-white border border-gray-200 p-6 shadow-sm hover:shadow-[0_15px_50px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-violet-500" />
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-black text-[15px] text-gray-900">{a.name}</h3>
                        <button onClick={e => { e.stopPropagation(); saveAcademies(academies.filter(x => x.id !== a.id)); }}
                          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="space-y-1 text-[13px] text-gray-400">
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-7 max-w-md space-y-5"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <Settings size={16} className="text-brand-600" />
              </div>
              <h2 className="font-black text-[15px] text-gray-900">Academy Settings</h2>
            </div>
            <Field label="Academy Name"><input className={inputCls} defaultValue="Chess Academy" /></Field>
            <Field label="Contact Email"><input type="email" className={inputCls} placeholder="info@chessacademy.com" /></Field>
            <button className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20">Save Settings</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
