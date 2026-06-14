import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const PIECES = {
  a8: ["♜", true], b8: ["♞", true], c8: ["♝", true], d8: ["♛", true],
  e8: ["♚", true], f8: ["♝", true], g8: ["♞", true], h8: ["♜", true],
  a7: ["♟", true], b7: ["♟", true], c7: ["♟", true], d7: ["♟", true],
  f7: ["♟", true], g7: ["♟", true], h7: ["♟", true],
  e5: ["♟", true], d4: ["♟", true],
  e4: ["♙", false], c3: ["♘", false], f3: ["♘", false],
  a2: ["♙", false], b2: ["♙", false], c2: ["♙", false], d2: ["♙", false],
  f2: ["♙", false], g2: ["♙", false], h2: ["♙", false],
  a1: ["♖", false], c1: ["♗", false], d1: ["♕", false],
  e1: ["♔", false], f1: ["♗", false], h1: ["♖", false],
};

function ChessBoard() {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
  return (
    <div style={{ width: 300, height: 300 }}
      className="rounded-xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="grid grid-cols-8 h-full">
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = file + rank;
            const light = (fi + ri) % 2 === 0;
            const piece = PIECES[sq];
            return (
              <div key={sq}
                className="flex items-center justify-center"
                style={{
                  background: light ? "#f0d4a0" : "#c07840",
                  fontSize: 20,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {piece && (
                  <span style={{
                    color: piece[1] ? "#1a0c00" : "#fffaf0",
                    filter: piece[1]
                      ? "drop-shadow(0 1px 0px rgba(255,255,255,0.15))"
                      : "drop-shadow(0 1px 2px rgba(0,0,0,0.45))",
                  }}>
                    {piece[0]}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const ROLES = ["Coach", "Admin", "Student"];
const PLACEHOLDERS = { Coach: "ravi_k", Admin: "admin", Student: "arjun_k" };

export default function LoginPage() {
  const { login } = useAuth();
  const [role, setRole]         = useState("Coach");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Please enter username and password"); return; }
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 500));
    const ok = await login(username.trim(), password);
    if (!ok) setError("Invalid username or password");
    setLoading(false);
  }

  const focusStyle = { borderColor: "#e8622c", boxShadow: "0 0 0 3px rgba(232,98,44,0.12)" };
  const blurStyle  = { borderColor: "#e5dfd6", boxShadow: "none" };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#eee8e0" }}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="w-full flex rounded-[28px] overflow-hidden"
        style={{
          maxWidth: 1060,
          minHeight: 700,
          boxShadow: "0 32px_120px rgba(0,0,0,0.18)",
          filter: "drop-shadow(0 32px 80px rgba(0,0,0,0.18))",
        }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          className="hidden lg:flex flex-col relative overflow-hidden"
          style={{ width: 460, background: "#1d1508", flexShrink: 0 }}
        >
          <div className="flex flex-col flex-1" style={{ padding: "56px 60px 56px 56px" }}>

            {/* Logo */}
            <div className="flex items-center gap-3" style={{ marginBottom: 80 }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[22px] text-white font-black"
                style={{ background: "#e8622c" }}>
                ♞
              </div>
              <div>
                <p className="font-bold text-[14px] leading-none text-white">Chess Academy</p>
                <p className="text-[12px]" style={{ color: "#6e5e4a", marginTop: 5 }}>Coach workspace</p>
              </div>
            </div>

            {/* Tagline */}
            <div className="flex items-center gap-2" style={{ marginBottom: 32 }}>
              <span style={{ color: "#e8622c", fontSize: 9 }}>◆</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "#e8622c" }}>
                A modern academy, in one place
              </span>
            </div>

            {/* Headline */}
            <div style={{ marginBottom: 40, maxWidth: 340 }}>
              <h2 className="text-[38px] font-black text-white" style={{ lineHeight: 1.1, marginBottom: 0 }}>
                Run your<br />chess academy
              </h2>
              <h2 className="text-[38px] font-black" style={{ color: "#e8622c", lineHeight: 1.1 }}>
                without the<br />spreadsheets.
              </h2>
            </div>

            {/* Description */}
            <p className="text-[13.5px]" style={{ color: "#6e5e4a", lineHeight: 1.8, maxWidth: 320, marginBottom: 64 }}>
              Batches, homework, PGN libraries, and live blitz races —
              your whole studio, finally in one workspace.
            </p>

            <div className="flex-1" />

          </div>

          {/* Chess board overlay */}
          <div
            className="absolute bottom-0 right-0 pointer-events-none"
            style={{ transform: "rotate(-14deg) translate(28%, 22%)", transformOrigin: "bottom right" }}
          >
            <ChessBoard />
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 bg-white flex items-center justify-center px-12 py-16">
          <div className="w-full" style={{ maxWidth: 400 }}>
            {/* Header */}
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-gray-400 mb-3">Welcome back</p>
            <h1 className="text-[30px] font-black text-gray-900 leading-tight mb-7">
              Sign in to your ChessHub
            </h1>

            {/* Role tabs placeholder */}
            <div className="mb-8" style={{ height: 44 }} />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 block mb-2">
                  Username
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder={PLACEHOLDERS[role]}
                    autoFocus
                    className="w-full h-12 pr-4 rounded-xl border text-[14px] text-gray-800 placeholder:text-gray-300 outline-none transition-all"
                    style={{ borderColor: "#e5dfd6", background: "#fdfcfb", paddingLeft: "46px" }}
                    onFocus={e => Object.assign(e.target.style, focusStyle)}
                    onBlur={e => Object.assign(e.target.style, blurStyle)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="pt-8">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
                    Password
                  </label>
                  <button type="button" className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Settings size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full h-12 pr-12 rounded-xl border text-[14px] text-gray-800 placeholder:text-gray-400 outline-none transition-all"
                    style={{ borderColor: "#e5dfd6", background: "#fdfcfb", paddingLeft: "46px" }}
                    onFocus={e => Object.assign(e.target.style, focusStyle)}
                    onBlur={e => Object.assign(e.target.style, blurStyle)}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-3 cursor-pointer pt-1" onClick={() => setRemember(v => !v)}>
                <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: remember ? "#e8622c" : "white", border: remember ? "none" : "2px solid #ccc5bc" }}>
                  {remember && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-gray-600">Keep me signed in on this device</span>
              </label>

              {/* Error */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-600">
                  {error}
                </motion.div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl text-white text-[15px] font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ height: 52, background: "#e8622c" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <span className="text-[18px]">→</span>
                    Sign in to Chess Academy
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
