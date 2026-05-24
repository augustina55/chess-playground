import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError("Enter both username and password."); return; }
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 380));
    if (!login(username.trim(), password)) setError("Invalid username or password.");
    setLoading(false);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-black/[0.09] bg-slate-50 text-slate-800 placeholder:text-slate-400 text-[14px] transition-colors";

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#1E1E2D" }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 65%)" }} />
      </div>

      <div className="relative w-full max-w-[400px]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.30)] overflow-hidden"
        >
          <div className="px-8 pt-8 pb-7">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.3 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f97316] shadow-lg shadow-orange-500/30 mb-4">
                <span className="text-2xl text-white leading-none select-none">♞</span>
              </div>
              <h1 className="text-[22px] font-extrabold text-slate-900 tracking-tight">Chess Academy</h1>
              <p className="text-[13.5px] text-slate-400 mt-1">Sign in to your workspace</p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username"
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className={cn(inputCls, "pr-11")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[12.5px] text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl"
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-[14px] transition-all mt-1",
                  "bg-[#f97316] hover:bg-orange-600 text-white shadow-md shadow-orange-500/25",
                  loading && "opacity-60 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <><LogIn size={15} />Sign In</>
                )}
              </motion.button>
            </form>

            {/* Demo hint */}
            <div className="mt-6 p-3.5 rounded-xl border border-black/[0.06] bg-slate-50">
              <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Demo credentials</p>
              <div className="grid grid-cols-3 gap-2">
                {[["admin","admin123"],["coach","coach123"],["student","student123"]].map(([u,p]) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => { setUsername(u); setPassword(p); setError(""); }}
                    className="text-left px-3 py-2 rounded-lg bg-white border border-black/[0.07] hover:border-[#f97316]/40 hover:bg-orange-50 transition-all group"
                  >
                    <p className="text-[12px] font-bold text-slate-700 capitalize group-hover:text-[#f97316]">{u}</p>
                    <p className="text-[10.5px] text-slate-400 font-mono">{p}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
