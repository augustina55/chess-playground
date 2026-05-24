import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LogOut, Check, ExternalLink, Unlink } from "lucide-react";
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
  admin:   "bg-terra-100  text-terra-700  dark:bg-terra-900/30  dark:text-terra-400",
  coach:   "bg-brand-100  text-brand-700  dark:bg-brand-900/40  dark:text-brand-400",
  student: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function ProfilePage({ onBack }) {
  const { user, logout, updateUser } = useAuth();
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
        className="fixed inset-0 bg-black/15 backdrop-blur-sm z-50 flex justify-end"
      >
        <motion.aside
          initial={{ x: 520 }}
          animate={{ x: 0 }}
          exit={{ x: 520 }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="w-full max-w-[500px] bg-white dark:bg-slate-900 h-full flex flex-col overflow-y-auto shadow-2xl border-l border-black/[0.05] dark:border-white/[0.05]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-black/[0.05] dark:border-white/[0.05] shrink-0">
            <h2 className="font-bold text-[16px] text-slate-900 dark:text-white">Profile</h2>
            <button onClick={onBack} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 px-8 py-7 space-y-7 overflow-y-auto">
            {/* Hero */}
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-900 text-white text-3xl font-extrabold flex items-center justify-center shadow-xl shadow-brand-600/20 mb-5">
                {user?.avatar}
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">{user?.name}</h3>
              <div className="flex items-center gap-2.5">
                <span className="text-[14px] text-slate-400">@{user?.username}</span>
                <span className={cn("px-2.5 py-0.5 text-[11px] font-bold rounded-full", ROLE_STYLES[user?.role])}>{user?.role}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[["Batches", batches.length], ["PGNs", pgns.length], ["Homework", homework.length]].map(([l, v]) => (
                <div key={l} className="rounded-2xl p-5 text-center border border-black/[0.05] dark:border-white/[0.05]" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <p className="text-2xl font-extrabold text-brand-600 dark:text-brand-400 leading-none mb-1.5">{v}</p>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{l}</p>
                </div>
              ))}
            </div>

            {/* Connected accounts */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Connected Accounts</p>
              <div className="space-y-3">

                {/* Lichess */}
                <div className="flex items-center justify-between gap-3 p-5 rounded-2xl border border-black/[0.05] dark:border-white/[0.05]" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-sm font-extrabold text-slate-200">L</div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Lichess</p>
                      {user?.lichessId
                        ? <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium">@{user.lichessId}</p>
                        : <p className="text-[13px] text-slate-400">Not connected</p>}
                    </div>
                  </div>
                  {user?.lichessId ? (
                    <div className="flex gap-2">
                      <button onClick={startLichessOAuth} className="px-3.5 py-2 text-[12px] font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Change</button>
                      <button onClick={() => updateUser({ lichessId: null })} className="p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-colors"><Unlink size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={startLichessOAuth} className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors">
                      <ExternalLink size={12} />Connect
                    </button>
                  )}
                </div>

                {/* Chess.com */}
                <div className="rounded-2xl border border-black/[0.05] dark:border-white/[0.05] overflow-hidden" style={{ background: "rgba(0,0,0,0.02)" }}>
                  <div className="flex items-center justify-between gap-3 p-5">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-terra-700 flex items-center justify-center text-sm font-extrabold text-white">C</div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200">Chess.com</p>
                        {user?.chessComId
                          ? <p className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium">@{user.chessComId}</p>
                          : <p className="text-[13px] text-slate-400">Not connected</p>}
                      </div>
                    </div>
                    {user?.chessComId ? (
                      <div className="flex gap-2">
                        <button onClick={() => { setCcUser(user.chessComId); setCcStep("enter"); }} className="px-3.5 py-2 text-[12px] font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Change</button>
                        <button onClick={() => { updateUser({ chessComId: null }); setCcStep("idle"); }} className="p-2 rounded-xl text-terra-500 hover:bg-terra-50 dark:hover:bg-terra-900/30 transition-colors"><Unlink size={14} /></button>
                      </div>
                    ) : ccStep === "idle" ? (
                      <button onClick={() => setCcStep("enter")} className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold rounded-xl bg-terra-700 hover:bg-terra-900 text-white transition-colors">
                        <ExternalLink size={12} />Connect
                      </button>
                    ) : null}
                  </div>

                  {ccStep === "enter" && (
                    <div className="px-5 pb-5 flex gap-2">
                      <input value={ccUser} onChange={e => setCcUser(e.target.value)} placeholder="chess.com username"
                        onKeyDown={e => e.key === "Enter" && ccUser.trim() && setCcStep("verify")}
                        className="flex-1 px-3.5 py-2.5 text-[14px] rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400" />
                      <button onClick={() => setCcStep("verify")} disabled={!ccUser.trim()} className="px-4 py-2.5 text-[12px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white">Next</button>
                      <button onClick={() => { setCcStep("idle"); setCcError(""); }} className="px-3.5 py-2.5 text-[12px] font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">✕</button>
                    </div>
                  )}

                  {ccStep === "verify" && (
                    <div className="px-5 pb-5 space-y-3">
                      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-black/[0.05] dark:border-white/[0.05]">
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-3">Add this code to your <strong>chess.com bio</strong>, then click Verify:</p>
                        <p className="font-mono text-lg font-extrabold text-brand-600 dark:text-brand-400 text-center py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 tracking-widest" style={{ background: "rgba(0,0,0,0.02)" }}>{ccCode}</p>
                        <p className="text-[11px] text-slate-400 mt-2.5 text-center">chess.com → Profile → Edit → Bio → paste → Save</p>
                      </div>
                      {ccError && <p className="text-[13px] text-terra-700 dark:text-terra-400 bg-terra-50 dark:bg-terra-900/30 px-4 py-2.5 rounded-xl">{ccError}</p>}
                      <div className="flex gap-2">
                        <button onClick={verifyChessCom} disabled={ccLoading} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white">
                          {ccLoading ? <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Check size={13} />}
                          {ccLoading ? "Verifying…" : "Verify"}
                        </button>
                        <button onClick={() => { setCcStep("idle"); setCcError(""); }} className="px-4 py-2.5 text-[13px] font-semibold rounded-xl border border-black/[0.08] dark:border-white/[0.08] text-slate-500">Cancel</button>
                      </div>
                    </div>
                  )}

                  {ccStep === "done" && (
                    <p className="px-5 pb-5 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Check size={13} />Verified! You can now remove the code from your bio.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sign out */}
          <div className="px-8 py-6 border-t border-black/[0.05] dark:border-white/[0.05] shrink-0">
            {!showLogout ? (
              <button onClick={() => setShowLogout(true)} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-terra-700 hover:bg-terra-900 text-white text-[14px] font-semibold transition-colors">
                <LogOut size={15} />Sign Out
              </button>
            ) : (
              <div className="space-y-4">
                <p className="text-[14px] text-slate-500 dark:text-slate-400 text-center">Are you sure you want to sign out?</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowLogout(false)} className="flex-1 py-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] text-slate-600 dark:text-slate-400 text-[14px] font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                  <button onClick={logout} className="flex-1 py-3 rounded-2xl bg-terra-700 hover:bg-terra-900 text-white text-[14px] font-semibold transition-colors">Yes, Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}
