import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Check, ExternalLink, Unlink, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { startLichessOAuth } from "../utils/lichess";
import { cn } from "../lib/utils";

function genCode() {
  const ex = sessionStorage.getItem("ca_cc_code");
  if (ex) return ex;
  const c = "VERIFY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  sessionStorage.setItem("ca_cc_code", c);
  return c;
}

const ROLE_STYLES = {
  admin:   "bg-red-50 text-red-700",
  coach:   "bg-brand-50 text-brand-700",
  student: "bg-emerald-50 text-emerald-700",
};

const ROLE_GRADIENTS = {
  admin:   "from-red-400 to-red-700",
  coach:   "from-brand-400 to-brand-700",
  student: "from-emerald-400 to-emerald-700",
};

const ROLE_OPTIONS = [
  { role: "admin",   label: "Admin",   desc: "Full access, system settings", color: "bg-red-50 text-red-700 border-red-200",   active: "bg-red-600 text-white border-red-600"   },
  { role: "coach",   label: "Coach",   desc: "Batches, homework, PGN tools",  color: "bg-indigo-50 text-indigo-700 border-indigo-200", active: "bg-indigo-600 text-white border-indigo-600" },
  { role: "student", label: "Student", desc: "Assignments and progress",      color: "bg-emerald-50 text-emerald-700 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600" },
];

export default function ProfilePage({ onBack }) {
  const { user, realUser, logout, updateUser, switchToRole, revertRole } = useAuth();
  const [showLogout, setShowLogout]  = useState(false);
  const [ccStep,    setCcStep]       = useState("idle");
  const [ccUser,    setCcUser]       = useState("");
  const [ccCode]                     = useState(genCode);
  const [ccLoading, setCcLoading]    = useState(false);
  const [ccError,   setCcError]      = useState("");

  const batches  = JSON.parse(localStorage.getItem("ca_batches")  || "[]");
  const homework = JSON.parse(localStorage.getItem("ca_homework") || "[]");
  const pgns     = JSON.parse(localStorage.getItem("ca_pgns")     || "[]");

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
          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-gray-200 shrink-0">
            <h2 className="font-black text-[16px] text-gray-900">My Profile</h2>
            <button onClick={onBack} className="w-9 h-9 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
            {/* Hero card */}
            <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-violet-600 rounded-[28px] p-7 text-center relative overflow-hidden shadow-[0_15px_50px_rgba(99,102,241,0.25)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className={cn("w-20 h-20 rounded-[20px] bg-gradient-to-br text-white text-3xl font-black flex items-center justify-center shadow-xl mx-auto mb-4", ROLE_GRADIENTS[user?.role] || "from-brand-400 to-brand-700")}>
                  {user?.avatar}
                </div>
                <h3 className="text-xl font-black text-white mb-1">{user?.name}</h3>
                <div className="flex items-center justify-center gap-2.5">
                  <span className="text-[13px] text-white/70">@{user?.username}</span>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-white/20 text-white">{user?.role}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[["Batches", batches.length], ["PGNs", pgns.length], ["Homework", homework.length]].map(([l, v]) => (
                <div key={l} className="rounded-[20px] bg-white border border-gray-200 p-5 text-center shadow-sm">
                  <p className="text-2xl font-black text-brand-600 leading-none mb-1.5">{v}</p>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{l}</p>
                </div>
              ))}
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
                      <button
                        key={role}
                        onClick={() => isCurrent ? null : switchToRole(role)}
                        disabled={isCurrent}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition-all",
                          isCurrent ? active + " cursor-default" : color + " hover:opacity-80"
                        )}
                      >
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
                      className="w-full mt-1 h-10 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-[13px] font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <EyeOff size={14} />Exit Preview — return to Admin
                    </button>
                  )}
                </div>
              </div>
            )}

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
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
