import { motion } from "framer-motion";
import { Users, FileText, BookOpen, Zap, ArrowRight, ArrowUpRight, Trophy, Target, TrendingUp, Crown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function ChessBoardBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="chess" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <rect x="24" y="24" width="24" height="24" fill="white" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#chess)" />
    </svg>
  );
}

function KnightSVG() {
  return (
    <svg viewBox="0 0 100 120" className="w-full h-full" fill="currentColor">
      <path d="M30 110 L70 110 L72 95 L60 90 C62 82 70 75 75 65 C82 52 80 35 70 25 C62 17 50 14 40 18 C35 20 28 26 26 32 C24 38 28 44 32 44 C28 46 24 50 24 55 C24 60 28 65 34 66 L30 75 L28 95 Z" opacity="0.9"/>
      <circle cx="55" cy="28" r="6" opacity="0.7"/>
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }) {
  const colors = {
    indigo:  { bg: "bg-indigo-600",  light: "bg-indigo-50",  text: "text-indigo-600",  ring: "ring-indigo-100" },
    violet:  { bg: "bg-violet-600",  light: "bg-violet-50",  text: "text-violet-600",  ring: "ring-violet-100" },
    emerald: { bg: "bg-emerald-600", light: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-100" },
  };
  const c = colors[color] || colors.indigo;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      className="relative bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors" />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${c.light} ${c.text} mb-4 ring-4 ${c.ring}`}>
          <Icon size={20} />
        </div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <h3 className="text-4xl font-black text-gray-900 tracking-tight">{value}</h3>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <TrendingUp size={11} /> {sub}
        </p>
      </div>
    </motion.div>
  );
}

function BatchCard({ batch, levelBadge, onClick }) {
  const initials = batch.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.15 }}
      className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-100"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{batch.name}</p>
        <p className="text-xs text-gray-400">{batch.students?.length || 0} students</p>
      </div>
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${levelBadge[batch.level] || "bg-gray-100 text-gray-600"}`}>
        {batch.level}
      </span>
    </motion.button>
  );
}

const QUICK_ACTIONS = [
  { icon: Users,    label: "Batches",    desc: "Manage groups",        page: "batches",    color: "from-brand-500 to-indigo-600"  },
  { icon: Zap,      label: "Blitz",      desc: "Race mode",            page: "blitz-race", color: "from-amber-400 to-orange-500"  },
  { icon: BookOpen, label: "Homework",   desc: "Assign tasks",         page: "homework",   color: "from-violet-500 to-purple-600" },
  { icon: FileText, label: "PGN Center", desc: "Upload games",         page: "pgn-center", color: "from-emerald-400 to-teal-500"  },
  { icon: Trophy,   label: "Academy",    desc: "Courses & content",    page: "academy",    color: "from-rose-400 to-pink-500"     },
  { icon: Target,   label: "Profile",    desc: "Settings",             page: "profile",    color: "from-sky-400 to-cyan-500"      },
];

export default function HomePage({ onNav, search }) {
  const { user } = useAuth();

  const batches  = JSON.parse(localStorage.getItem("ca_batches")  || "[]");
  const pgns     = JSON.parse(localStorage.getItem("ca_pgns")     || "[]");
  const homework = JSON.parse(localStorage.getItem("ca_homework") || "[]");

  const recentBatches = batches.slice(-6).reverse()
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  const levelBadge = {
    Beginner:     "bg-emerald-50 text-emerald-700",
    Intermediate: "bg-blue-50 text-blue-700",
    Advanced:     "bg-orange-50 text-orange-700",
    Open:         "bg-violet-50 text-violet-700",
  };

  const firstName = user?.name?.split(" ")[0] || "Coach";

  return (
    <div className="min-h-screen bg-[#f4f6fb]">
      <div className="max-w-7xl mx-auto px-5 md:px-8 lg:px-10 py-8 lg:py-10 space-y-6">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] shadow-2xl"
          style={{ minHeight: 220 }}
        >
          <ChessBoardBg />

          {/* Glow blobs */}
          <div className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute bottom-[-40px] left-[20%] w-56 h-56 rounded-full bg-violet-500/15 blur-3xl" />

          {/* Chess knight decoration */}
          <div className="absolute right-8 bottom-0 w-40 h-48 text-white/10 pointer-events-none hidden md:block">
            <KnightSVG />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-8 md:p-10 lg:p-12">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown size={14} className="text-amber-400" />
                <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">Chess Academy</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {greeting()},<br />
                <span className="text-indigo-300">{firstName}</span>
              </h1>
              <p className="text-indigo-200/70 text-sm mt-3 max-w-md leading-relaxed">
                {batches.length > 0
                  ? `You have ${batches.length} active batch${batches.length > 1 ? "es" : ""} and ${homework.length} homework assignment${homework.length !== 1 ? "s" : ""}.`
                  : "Start by creating your first batch and assigning homework to students."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <button
                onClick={() => onNav("batches")}
                className="h-11 px-6 rounded-2xl bg-white text-gray-900 font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Users size={15} /> Manage Batches
              </button>
              <button
                onClick={() => onNav("blitz-race")}
                className="h-11 px-6 rounded-2xl bg-amber-400 text-amber-950 font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
              >
                <Zap size={15} /> Blitz Race
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Users}    label="Active Batches"     value={batches.length}  sub="Training groups"       color="indigo"  delay={0}    />
          <StatCard icon={BookOpen} label="Homework Sets"      value={homework.length} sub="Assignments created"   color="violet"  delay={0.07} />
          <StatCard icon={FileText} label="PGN Library"        value={pgns.length}     sub="Games in library"      color="emerald" delay={0.14} />
        </div>

        {/* ── Main content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Recent Batches — 3 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900">Recent Batches</h3>
                <p className="text-xs text-gray-400 mt-0.5">Your latest training groups</p>
              </div>
              <button
                onClick={() => onNav("batches")}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl"
              >
                View all <ArrowUpRight size={11} />
              </button>
            </div>

            {recentBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 rounded-[20px] bg-brand-50 flex items-center justify-center mb-4">
                  <Users size={26} className="text-brand-400" />
                </div>
                <p className="font-bold text-gray-700 mb-1">No batches yet</p>
                <p className="text-xs text-gray-400 mb-5 max-w-xs">Create your first training batch to start organizing students and assigning homework.</p>
                <button
                  onClick={() => onNav("batches")}
                  className="h-10 px-5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  Create first batch
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-0.5">
                {recentBatches.map(b => (
                  <BatchCard key={b.id} batch={b} levelBadge={levelBadge} onClick={() => onNav("batches")} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Quick Actions — 2 cols */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.27 }}
            className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-black text-gray-900">Quick Actions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Navigate to any section</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ icon: Icon, label, desc, page, color }) => (
                <button
                  key={page}
                  onClick={() => onNav(page)}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left group"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-400">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

        </div>

        {/* ── Bottom banner ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <p className="font-black text-gray-900">Ready for a Blitz Race?</p>
              <p className="text-sm text-gray-500 mt-0.5">Challenge your students to a timed puzzle session.</p>
            </div>
          </div>
          <button
            onClick={() => onNav("blitz-race")}
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm shadow hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0"
          >
            Start now <ArrowRight size={14} />
          </button>
        </motion.div>

      </div>
    </div>
  );
}
