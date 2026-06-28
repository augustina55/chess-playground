import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Trash2, Building2, Users, Settings, Plus, Search, X, GraduationCap, BookOpen, Pencil, Check } from "lucide-react";
import { cn } from "../lib/utils";
import {
  getProfiles, createProfile, deleteProfile,
  getAcademies, createAcademy, deleteAcademy,
} from "../lib/db";

const ROLES = ["admin", "coach", "student"];
const ROLE_STYLES = {
  admin:   "bg-red-50 text-red-700",
  coach:   "bg-brand-50 text-brand-700",
  student: "bg-emerald-50 text-emerald-700",
};

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

const CHAPTER_COLORS = ['emerald', 'blue', 'violet', 'amber', 'orange', 'gray']

const BLANK_CHAPTER = { title: '', description: '', icon: '♙', colorKey: 'emerald', lessons: '' }

function CoursesTab() {
  const [chapters, setChapters] = useState([
    { id: 1, title: 'Foundations',  description: 'Learn the basics of chess and understand how the game works.', icon: '♙', colorKey: 'emerald', lessons: 'The Chessboard & Pieces\nHow Each Piece Moves\nBasic Rules & Turn Order\nCheck, Checkmate & Stalemate' },
    { id: 2, title: 'Tactics',      description: 'Build tactical skills and learn to spot winning opportunities.', icon: '♖', colorKey: 'blue',    lessons: 'Forks & Double Attacks\nPins & Skewers\nDiscovered Attacks\nBack Rank Tactics\nCombinations Practice' },
    { id: 3, title: 'Strategy',     description: 'Understand strategic principles and position planning.', icon: '♗', colorKey: 'violet', lessons: 'Pawn Structure Basics\nOpen & Closed Positions\nPiece Coordination\nWeak Squares & Outposts\nLong-term Planning\nProphylaxis' },
    { id: 4, title: 'Middlegame',   description: 'Master middlegame plans, combinations and tactics.', icon: '♕', colorKey: 'amber',  lessons: 'Attack & Defence Principles\nKing Safety\nPawn Breaks\nPiece Activity\nCalculation Techniques\nTypical Middlegame Plans' },
    { id: 5, title: 'Endgame',      description: 'Learn endgame techniques and convert your advantage.', icon: '♔', colorKey: 'orange', lessons: 'King & Pawn Endgames\nRook Endgames\nMinor Piece Endings\nConversion Techniques\nPractical Endgame Skills' },
    { id: 6, title: 'Mastery',      description: 'Advanced concepts and polishing your complete game.', icon: '🏆', colorKey: 'gray',   lessons: 'Opening Repertoire Building\nPositional Sacrifices\nComplex Calculation\nPsychological Preparation\nGame Analysis & Improvement\nTournament Preparation' },
  ])
  const [form,    setForm]    = useState(BLANK_CHAPTER)
  const [editId,  setEditId]  = useState(null)
  const [nextId,  setNextId]  = useState(7)

  function startEdit(ch) {
    setForm({ title: ch.title, description: ch.description, icon: ch.icon, colorKey: ch.colorKey, lessons: ch.lessons })
    setEditId(ch.id)
  }

  function handleSave(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    if (editId) {
      setChapters(prev => prev.map(c => c.id === editId ? { ...c, ...form } : c))
      setEditId(null)
    } else {
      setChapters(prev => [...prev, { id: nextId, ...form }])
      setNextId(n => n + 1)
    }
    setForm(BLANK_CHAPTER)
  }

  function handleDelete(id) {
    setChapters(prev => prev.filter(c => c.id !== id))
    if (editId === id) { setEditId(null); setForm(BLANK_CHAPTER) }
  }

  function cancelEdit() { setEditId(null); setForm(BLANK_CHAPTER) }

  const COLOR_PREVIEW = { emerald: 'bg-emerald-500', blue: 'bg-blue-500', violet: 'bg-violet-500', amber: 'bg-amber-400', orange: 'bg-orange-400', gray: 'bg-gray-400' }
  const COLOR_ICON_BG = { emerald: 'bg-emerald-100', blue: 'bg-blue-100', violet: 'bg-violet-100', amber: 'bg-amber-100', orange: 'bg-orange-100', gray: 'bg-gray-100' }

  return (
    <div className="flex flex-wrap gap-6 items-start">
      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[28px] border border-gray-200 shadow-sm p-7 w-full max-w-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
              {editId ? <Pencil size={16} className="text-brand-600" /> : <Plus size={16} className="text-brand-600" />}
            </div>
            <h2 className="font-black text-[15px] text-gray-900">{editId ? 'Edit Chapter' : 'Add Chapter'}</h2>
          </div>
          {editId && (
            <button onClick={cancelEdit} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-[48px_1fr] gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Icon</label>
              <input className={cn(inputCls, "text-center text-[20px] px-2")} value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={2} />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 block mb-2">Title</label>
              <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Tactics" required />
            </div>
          </div>

          <Field label="Description">
            <textarea className={cn(inputCls, "h-20 py-3 resize-none")} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description of this chapter" />
          </Field>

          <Field label="Color">
            <div className="flex gap-2 flex-wrap">
              {CHAPTER_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, colorKey: c }))}
                  className={cn('w-7 h-7 rounded-full transition-all border-2', COLOR_PREVIEW[c],
                    form.colorKey === c ? 'border-gray-900 scale-110' : 'border-transparent')}>
                  {form.colorKey === c && <Check size={12} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Lessons (one per line)">
            <textarea className={cn(inputCls, "h-32 py-3 resize-none text-[12px]")} value={form.lessons}
              onChange={e => setForm(f => ({ ...f, lessons: e.target.value }))}
              placeholder={"Lesson 1\nLesson 2\nLesson 3"} />
          </Field>

          <button type="submit"
            className="w-full h-12 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-500/20">
            {editId ? 'Save Changes' : 'Add Chapter'}
          </button>
        </form>
      </motion.div>

      {/* Chapter list */}
      <div className="flex-1 min-w-0">
        <h2 className="font-black text-[15px] text-gray-900 mb-4">
          Chapters <span className="text-gray-400 font-normal text-sm">({chapters.length})</span>
        </h2>
        <div className="space-y-3">
          {chapters.map((ch, i) => {
            const lessonList = ch.lessons.split('\n').filter(Boolean)
            return (
              <motion.div key={ch.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className={cn('group bg-white rounded-[20px] border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 transition-all',
                  editId === ch.id && 'border-brand-300 shadow-md')}>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-[22px] shrink-0',
                  COLOR_ICON_BG[ch.colorKey])}>
                  {ch.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-black text-gray-900">{ch.title}</span>
                    <span className={cn('w-2 h-2 rounded-full shrink-0', COLOR_PREVIEW[ch.colorKey])} />
                  </div>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{ch.description}</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    <BookOpen size={10} className="inline mr-1" />{lessonList.length} lesson{lessonList.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(ch)}
                    className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(ch.id)}
                    className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const TABS = [
  { id: "users",    label: "Users",    icon: Users },
  { id: "academy",  label: "Academy",  icon: Building2 },
  { id: "courses",  label: "Courses",  icon: GraduationCap },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminPage({ search }) {
  const [users,     setUsers]     = useState([]);
  const [academies, setAcademies] = useState([]);
  const [userForm,  setUserForm]  = useState({ username: "", name: "", role: "student", password: "" });
  const [acForm,    setAcForm]    = useState({ name: "", phone: "", location: "", mainCoach: "", mainCoachId: null });
  const [coachSearch, setCoachSearch] = useState("");
  const [coachOpen,   setCoachOpen]   = useState(false);
  const [tab,      setTab]      = useState("users");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getProfiles().then(setUsers);
    getAcademies().then(setAcademies);
  }, []);

  const filteredUsers = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  );
  const filteredAcademies = academies.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase())
  );

  async function addUser(e) {
    e.preventDefault();
    if (!userForm.username.trim() || !userForm.name.trim()) return;
    const created = await createProfile({
      username: userForm.username,
      password: userForm.password,
      name:     userForm.name,
      role:     userForm.role,
    });
    setUsers(prev => [...prev, created]);
    setUserForm({ username: "", name: "", role: "student", password: "" });
  }

  async function addAcademy(e) {
    e.preventDefault();
    if (!acForm.name.trim()) return;
    const created = await createAcademy(acForm);
    setAcademies(prev => [...prev, created]);
    setAcForm({ name: "", phone: "", location: "", mainCoach: "", mainCoachId: null });
    setCoachSearch(""); setCoachOpen(false);
  }

  async function removeUser(id) {
    await deleteProfile(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }

  async function removeAcademy(id) {
    await deleteAcademy(id);
    setAcademies(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div className="bg-[#f6f8fc]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-4 md:pt-5 pb-6">

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
                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">User ID</th>
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
                          <td className="px-6 py-4 font-mono text-[12px] text-gray-400 hidden sm:table-cell">{u.id}</td>
                          <td className="px-6 py-4">
                            <span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full", ROLE_STYLES[u.role] || "bg-gray-100 text-gray-600")}>{u.role}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => removeUser(u.id)}
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
                <Field label="Main Coach">
                  {acForm.mainCoachId ? (
                    <div className="flex items-center gap-3 h-12 px-4 rounded-xl border border-brand-300 bg-brand-50">
                      <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {acForm.mainCoach[0]}
                      </div>
                      <span className="flex-1 text-[13px] font-semibold text-brand-700 truncate">{acForm.mainCoach}</span>
                      <button type="button" onClick={() => { setAcForm(f => ({ ...f, mainCoach: "", mainCoachId: null })); setCoachSearch(""); }}
                        className="text-brand-400 hover:text-brand-700 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input className={cn(inputCls, "pl-10")} value={coachSearch}
                        onChange={e => { setCoachSearch(e.target.value); setCoachOpen(true); }}
                        onFocus={() => setCoachOpen(true)}
                        onBlur={() => setTimeout(() => setCoachOpen(false), 150)}
                        placeholder="Search by name or username…" />
                      {coachOpen && (
                        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                          {(() => {
                            const coaches = users.filter(u => u.role === "coach" &&
                              (!coachSearch || u.name.toLowerCase().includes(coachSearch.toLowerCase()) ||
                               u.username.toLowerCase().includes(coachSearch.toLowerCase()) ||
                               String(u.id).includes(coachSearch))
                            );
                            return coaches.length === 0 ? (
                              <p className="px-4 py-3 text-[13px] text-gray-400">No coaches found</p>
                            ) : coaches.slice(0, 6).map(c => (
                              <button key={c.id} type="button"
                                onMouseDown={() => { setAcForm(f => ({ ...f, mainCoach: c.name, mainCoachId: c.id })); setCoachSearch(""); setCoachOpen(false); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                                  {c.avatar || c.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-bold text-gray-800 truncate">{c.name}</p>
                                  <p className="text-[11px] text-gray-400">@{c.username} · ID {c.id}</p>
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </Field>
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
                        <button onClick={e => { e.stopPropagation(); removeAcademy(a.id); }}
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

        {/* Courses tab */}
        {tab === "courses" && <CoursesTab />}

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
