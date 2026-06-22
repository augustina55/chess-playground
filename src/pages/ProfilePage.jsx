import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, LogOut, Check, ExternalLink, Unlink, Eye, EyeOff,
  Bell, Palette, Building2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { startLichessOAuth } from "../utils/lichess";
import { cn } from "../lib/utils";
import { getCoachAcademies, getAcademies } from "../lib/db";

// ── chess.com verification ────────────────────────────────────────────────────

function genCode() {
  const ex = sessionStorage.getItem("ca_cc_code");
  if (ex) return ex;
  const c = "VERIFY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  sessionStorage.setItem("ca_cc_code", c);
  return c;
}

// ── constants ─────────────────────────────────────────────────────────────────

const ROLE_GRADIENTS = {
  admin:   "from-red-500 to-red-700",
  coach:   "from-brand-400 to-brand-700",
  student: "from-emerald-400 to-emerald-700",
};

const ROLE_BADGE = {
  admin:   "bg-red-100 text-red-700",
  coach:   "bg-brand-100 text-brand-700",
  student: "bg-emerald-100 text-emerald-700",
};

const ROLE_OPTIONS = [
  { role: "admin",   label: "Admin",   desc: "Full access, system settings",  color: "bg-red-50 text-red-700 border-red-200",         active: "bg-red-600 text-white border-red-600"         },
  { role: "coach",   label: "Coach",   desc: "Batches, homework, PGN tools",  color: "bg-indigo-50 text-indigo-700 border-indigo-200", active: "bg-indigo-600 text-white border-indigo-600"   },
  { role: "student", label: "Student", desc: "Assignments and progress",      color: "bg-emerald-50 text-emerald-700 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
];

import { BOARD_THEMES } from "../lib/boardThemes";

// ── Tab bar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }) {
  return (
    <div className="flex border-b border-gray-100 px-7 bg-white shrink-0">
      {[["profile", "My Profile"], ["settings", "Settings"]].map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)}
          className={cn(
            "relative py-3.5 px-4 text-[13px] font-bold transition-colors",
            tab === id ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
          )}>
          {label}
          {tab === id && (
            <motion.span
              layoutId="profile-tab-line"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ── My Profile tab ────────────────────────────────────────────────────────────

function MyAcademiesSection() {
  const { user, updateUser } = useAuth();
  const [academies, setAcademies] = useState([]);
  const [ownAcademy, setOwnAcademy] = useState(null);
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    if (user?.role !== "coach" || !user?.id) return;
    Promise.all([
      getCoachAcademies(user.id),
      getAcademies(),
    ]).then(([invAcademies, allAcademies]) => {
      const own = allAcademies.find(a => String(a.mainCoachId) === String(user.id));
      setOwnAcademy(own || null);
      setAcademies(invAcademies);
    }).catch(() => {});
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setActive(academyId, academyName, academyLogo) {
    setSwitching(academyId);
    try {
      const newSettings = { ...(user?.settings || {}), activeAcademyId: academyId };
      await updateUser({ settings: newSettings });
      // Broadcast new logo/name
      localStorage.setItem("ca_academy_name", academyName || "");
      localStorage.setItem("ca_academy_logo", academyLogo || "");
      window.dispatchEvent(new CustomEvent("ca-logo-update"));
    } catch (err) {
      console.error("Failed to switch academy:", err);
    } finally {
      setSwitching(null);
    }
  }

  // Combine own academy + invited academies (deduplicated)
  const allAcademies = [];
  if (ownAcademy) {
    allAcademies.push({ id: ownAcademy.id, name: ownAcademy.name, logo: ownAcademy.logo, isOwn: true });
  }
  academies.forEach(a => {
    if (!allAcademies.find(x => String(x.id) === String(a.academyId))) {
      allAcademies.push({ id: a.academyId, name: a.academyName, logo: a.academyLogo, isOwn: false });
    }
  });

  if (user?.role !== "coach" || allAcademies.length === 0) return null;

  const activeId = user?.settings?.activeAcademyId || ownAcademy?.id;

  return (
    <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">My Academies</p>
      </div>
      <div className="p-4 space-y-2">
        {allAcademies.map(ac => {
          const isActive = String(ac.id) === String(activeId);
          return (
            <div key={ac.id} className={cn(
              "flex items-center gap-3 p-3.5 rounded-2xl border transition-all",
              isActive ? "bg-brand-50 border-brand-200" : "bg-gray-50 border-gray-100"
            )}>
              <div className="w-10 h-10 rounded-full bg-[#f97316] text-white flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#1a140f]">
                {ac.logo
                  ? <img src={ac.logo} alt="" className="w-full h-full object-cover" />
                  : <Building2 size={16} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 truncate">{ac.name}</p>
                <p className="text-[11px] text-gray-400">{ac.isOwn ? "Your academy" : "Member"}</p>
              </div>
              {isActive ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600 bg-white border border-brand-200 px-2.5 py-1 rounded-full shrink-0">
                  <Check size={10} strokeWidth={3} />Active
                </span>
              ) : (
                <button
                  onClick={() => setActive(ac.id, ac.name, ac.logo)}
                  disabled={!!switching}
                  className="text-[11px] font-bold text-gray-500 border border-gray-200 hover:border-brand-400 hover:text-brand-600 px-3 py-1 rounded-full transition-all disabled:opacity-50 shrink-0">
                  {switching === ac.id ? "…" : "Set Active"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MyProfileTab({ onBack }) {
  const { user, realUser, logout, updateUser, switchToRole, revertRole } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const [ccStep,    setCcStep]      = useState("idle");
  const [ccUser,    setCcUser]      = useState("");
  const [ccCode]                    = useState(genCode);
  const [ccLoading, setCcLoading]   = useState(false);
  const [ccError,   setCcError]     = useState("");

  async function verifyChessCom() {
    if (!ccUser.trim()) return;
    setCcLoading(true); setCcError("");
    try {
      const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(ccUser.trim().toLowerCase())}`);
      if (res.status === 404) { setCcError("Username not found on chess.com."); return; }
      if (!res.ok) { setCcError("Could not reach chess.com. Try again."); return; }
      const data = await res.json();
      if ((data.bio || "").includes(ccCode)) {
        sessionStorage.removeItem("ca_cc_code");
        updateUser({ chessComId: ccUser.trim().toLowerCase() });
        setCcStep("done");
      } else {
        setCcError(`Code not found in bio. Make sure your bio contains: ${ccCode}`);
      }
    } catch { setCcError("Network error — please try again."); }
    finally { setCcLoading(false); }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

        {/* Profile identity card */}
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm p-5 flex items-center gap-4">
          <div className={cn(
            "w-16 h-16 rounded-full bg-gradient-to-br text-white text-2xl font-black flex items-center justify-center shadow-lg shrink-0",
            ROLE_GRADIENTS[user?.role] || "from-brand-400 to-brand-700"
          )}>
            {user?.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-black text-gray-900 truncate">{user?.name}</h3>
            <p className="text-[12px] text-gray-400 mt-0.5">@{user?.username}</p>
            <span className={cn("inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize", ROLE_BADGE[user?.role] || "bg-gray-100 text-gray-600")}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Switch role (admin only) */}
        {(realUser?.role === "admin" || user?.role === "admin") && (
          <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Preview As Role</p>
                {realUser && (
                  <p className="text-[12px] text-amber-600 font-medium mt-0.5">Currently previewing — not your real session</p>
                )}
              </div>
              <Eye size={15} className="text-gray-300" />
            </div>
            <div className="p-4 space-y-2">
              {ROLE_OPTIONS.map(({ role, label, desc, color, active }) => {
                const isCurrent = user?.role === role;
                return (
                  <button key={role}
                    onClick={() => isCurrent ? null : switchToRole(role)}
                    disabled={isCurrent}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all",
                      isCurrent ? active + " cursor-default" : color + " hover:opacity-80"
                    )}>
                    <div>
                      <p className="text-[13px] font-bold leading-tight">{label}</p>
                      <p className={cn("text-[11px] mt-0.5", isCurrent ? "text-white/70" : "opacity-60")}>{desc}</p>
                    </div>
                    {isCurrent && <span className="text-[11px] font-black uppercase tracking-wide opacity-80">Active</span>}
                  </button>
                );
              })}
              {realUser && (
                <button
                  onClick={() => { revertRole(); onBack(); }}
                  className="w-full mt-1 h-10 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-[13px] font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
                  <EyeOff size={14} />Exit Preview — return to Admin
                </button>
              )}
            </div>
          </div>
        )}

        {/* My Academies (coaches only) */}
        <MyAcademiesSection />

        {/* Connected accounts */}
        <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Connected Accounts</p>
          </div>
          <div className="p-4 space-y-3">

            {/* Lichess */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center text-sm font-black text-gray-200">L</div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">Lichess</p>
                  {user?.lichessId
                    ? <p className="text-[12px] text-emerald-600 font-medium">@{user.lichessId}</p>
                    : <p className="text-[12px] text-gray-400">Not connected</p>}
                </div>
              </div>
              {user?.lichessId ? (
                <div className="flex gap-2">
                  <button onClick={startLichessOAuth} className="px-3 py-1.5 text-[12px] font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">Change</button>
                  <button onClick={() => updateUser({ lichessId: null })} className="w-8 h-8 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><Unlink size={13} /></button>
                </div>
              ) : (
                <button onClick={startLichessOAuth} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors">
                  <ExternalLink size={11} />Connect
                </button>
              )}
            </div>

            {/* Chess.com */}
            <div className="rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-green-800 flex items-center justify-center text-sm font-black text-white">C</div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">Chess.com</p>
                    {user?.chessComId
                      ? <p className="text-[12px] text-emerald-600 font-medium">@{user.chessComId}</p>
                      : <p className="text-[12px] text-gray-400">Not connected</p>}
                  </div>
                </div>
                {user?.chessComId ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setCcUser(user.chessComId); setCcStep("enter"); }} className="px-3 py-1.5 text-[12px] font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors">Change</button>
                    <button onClick={() => { updateUser({ chessComId: null }); setCcStep("idle"); }} className="w-8 h-8 rounded-xl text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"><Unlink size={13} /></button>
                  </div>
                ) : ccStep === "idle" ? (
                  <button onClick={() => setCcStep("enter")} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-xl bg-green-700 hover:bg-green-800 text-white transition-colors">
                    <ExternalLink size={11} />Connect
                  </button>
                ) : null}
              </div>

              {ccStep === "enter" && (
                <div className="px-4 pb-4 flex gap-2">
                  <input value={ccUser} onChange={e => setCcUser(e.target.value)} placeholder="chess.com username"
                    onKeyDown={e => e.key === "Enter" && ccUser.trim() && setCcStep("verify")}
                    className="flex-1 h-10 px-3.5 text-[13px] rounded-xl border border-gray-200 bg-white text-gray-800 placeholder:text-gray-400 outline-none focus:border-brand-500" />
                  <button onClick={() => setCcStep("verify")} disabled={!ccUser.trim()} className="h-10 px-4 text-[12px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">Next</button>
                  <button onClick={() => { setCcStep("idle"); setCcError(""); }} className="h-10 px-3 text-[12px] font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100">✕</button>
                </div>
              )}

              {ccStep === "verify" && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="bg-white rounded-2xl p-4 border border-gray-200">
                    <p className="text-[12px] text-gray-500 mb-3">Add this code to your <strong>chess.com bio</strong>, then click Verify:</p>
                    <p className="font-mono text-base font-black text-brand-600 text-center py-2.5 px-3 rounded-xl border border-dashed border-gray-300 tracking-widest bg-gray-50">{ccCode}</p>
                    <p className="text-[11px] text-gray-400 mt-2.5 text-center">Profile → Edit → Bio → paste → Save</p>
                  </div>
                  {ccError && <p className="text-[12px] text-red-700 bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-xl">{ccError}</p>}
                  <div className="flex gap-2">
                    <button onClick={verifyChessCom} disabled={ccLoading} className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white">
                      {ccLoading ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Check size={13} />}
                      {ccLoading ? "Verifying…" : "Verify"}
                    </button>
                    <button onClick={() => { setCcStep("idle"); setCcError(""); }} className="h-10 px-4 text-[13px] font-semibold rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {ccStep === "done" && (
                <p className="px-4 pb-4 text-[13px] font-semibold text-emerald-600 flex items-center gap-2">
                  <Check size={13} />Verified! You can now remove the code from your bio.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="px-6 py-5 bg-white border-t border-gray-200 shrink-0">
        {!showLogout ? (
          <button onClick={() => setShowLogout(true)} className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 hover:bg-black text-white text-[14px] font-semibold transition-colors">
            <LogOut size={15} />Sign Out
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-gray-500 text-center">Are you sure you want to sign out?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={logout} className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold transition-colors">Yes, Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Settings tab ──────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className={cn(
        "w-12 h-6 rounded-full transition-all flex items-center px-0.5 shrink-0",
        on ? "bg-brand-600 justify-end" : "bg-gray-200 justify-start"
      )}>
      <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function SettingsTab() {
  const { user, updateUser } = useAuth();
  const settings = user?.settings || {};
  const boardThemeId    = settings.boardTheme    ?? "brown";
  const notifications   = settings.notifications ?? true;

  function setSetting(key, val) {
    updateUser({ settings: { ...settings, [key]: val } });
  }

  const currentTheme = BOARD_THEMES.find(t => t.id === boardThemeId) || BOARD_THEMES[0];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

      {/* Board color */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Palette size={14} className="text-gray-400" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Board Theme</p>
        </div>
        <div className="p-5 space-y-4">
          {/* Preview of current */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            {/* Mini board preview 4×4 */}
            <div className="grid grid-cols-4 rounded-xl overflow-hidden border-2 border-gray-300 shrink-0 shadow-sm">
              {Array.from({ length: 16 }, (_, i) => {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const isLight = (row + col) % 2 === 0;
                return (
                  <div key={i} className="w-7 h-7"
                    style={{ background: isLight ? currentTheme.light : currentTheme.dark }} />
                );
              })}
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-800">{currentTheme.name}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-4 h-4 rounded-sm border border-gray-200" style={{ background: currentTheme.light }} />
                <span className="text-[11px] text-gray-400">{currentTheme.light}</span>
                <div className="w-4 h-4 rounded-sm border border-gray-200 ml-1" style={{ background: currentTheme.dark }} />
                <span className="text-[11px] text-gray-400">{currentTheme.dark}</span>
              </div>
            </div>
          </div>

          {/* All theme swatches */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {BOARD_THEMES.map(t => (
              <button key={t.id} type="button" onClick={() => setSetting("boardTheme", t.id)}
                title={t.name}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition-all",
                  t.id === boardThemeId
                    ? "border-brand-500 bg-brand-50"
                    : "border-transparent hover:border-gray-200 bg-gray-50"
                )}>
                <div className="grid grid-cols-2 rounded-md overflow-hidden w-10 h-10 border border-gray-200">
                  <div className="w-5 h-5" style={{ background: t.light }} />
                  <div className="w-5 h-5" style={{ background: t.dark }} />
                  <div className="w-5 h-5" style={{ background: t.dark }} />
                  <div className="w-5 h-5" style={{ background: t.light }} />
                </div>
                <span className="text-[9px] font-bold text-gray-500 text-center leading-tight">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-[24px] border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Bell size={14} className="text-gray-400" />
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Notifications</p>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-[13px] font-bold text-gray-800">Push Notifications</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Homework reminders, batch updates, announcements
              </p>
            </div>
            <Toggle on={notifications} onToggle={() => setSetting("notifications", !notifications)} />
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Main ProfilePage ──────────────────────────────────────────────────────────

export default function ProfilePage({ onBack }) {
  const [tab, setTab] = useState("profile");

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onBack(); }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end"
      >
        <motion.aside
          initial={{ x: 520 }}
          animate={{ x: 0 }}
          exit={{ x: 520 }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="w-full max-w-[480px] bg-[#f6f8fc] h-full flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-7 pt-5 pb-0 bg-white shrink-0">
            <h2 className="font-black text-[16px] text-gray-900">Profile</h2>
            <button onClick={onBack}
              className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X size={17} />
            </button>
          </div>

          <TabBar tab={tab} setTab={setTab} />

          {tab === "profile"  && <MyProfileTab onBack={onBack} />}
          {tab === "settings" && <SettingsTab />}
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
