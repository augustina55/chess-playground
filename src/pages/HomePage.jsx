import { useState } from "react";
import { motion } from "framer-motion";
import { Users, FileText, BookOpen, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

function StatCard({ icon: Icon, label, value, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.26, ease: "easeOut" }}
      className="bg-white rounded-2xl p-5 border border-black/[0.06] shadow-[var(--shadow-card)] flex flex-col gap-3 min-w-0"
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent.bg)}>
          <Icon size={18} className={accent.icon} />
        </div>
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[34px] font-extrabold text-slate-900 dark:text-white leading-none tracking-tight">{value}</p>
    </motion.div>
  );
}

function QuickAction({ icon: Icon, label, desc, onClick, delay = 0 }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22 }}
      onClick={onClick}
      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-black/[0.05] transition-all text-left group"
    >
      <div className="w-9 h-9 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[#f97316]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-slate-800 leading-tight">{label}</p>
        <p className="text-[12px] text-slate-400 truncate mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={13} className="text-slate-300 group-hover:text-[#f97316] transition-colors shrink-0" />
    </motion.button>
  );
}

export default function HomePage({ onNav, search }) {
  const { user } = useAuth();

  const batches  = JSON.parse(localStorage.getItem("ca_batches")  || "[]");
  const pgns     = JSON.parse(localStorage.getItem("ca_pgns")     || "[]");
  const homework = JSON.parse(localStorage.getItem("ca_homework") || "[]");

  const recentBatches = batches
    .slice(-6).reverse()
    .filter(b => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  const stats = [
    { icon: Users,    label: "Active Batches",    value: batches.length,  accent: { bg: "bg-[#f97316]/10", icon: "text-[#f97316]" }, delay: 0    },
    { icon: FileText, label: "PGNs Uploaded",     value: pgns.length,     accent: { bg: "bg-violet-50",    icon: "text-violet-500" }, delay: 0.06 },
    { icon: BookOpen, label: "Homework Assigned", value: homework.length, accent: { bg: "bg-emerald-50",   icon: "text-emerald-500" }, delay: 0.12 },
    { icon: Zap,      label: "Blitz Sessions",    value: "—",             accent: { bg: "bg-sky-50",        icon: "text-sky-500" },    delay: 0.18 },
  ];

  return (
    <div className="p-6 md:p-8 page-enter">
      {/* Hero */}
      <div className="mb-7">
        <motion.h2
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[26px] md:text-[30px] font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight"
        >
          Hello, <span className="text-[#f97316]">{user?.name?.split(" ")[0]}</span> 👋
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.07 }}
          className="text-[14px] text-slate-400"
        >
          Here's what's happening in your academy today.
        </motion.p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent Batches */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-black/[0.06] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-slate-400" />
              <h3 className="font-bold text-[13.5px] text-slate-800">Recent Batches</h3>
            </div>
            <button onClick={() => onNav("batches")} className="text-[12.5px] text-[#f97316] hover:text-orange-600 flex items-center gap-1 font-semibold transition-colors">
              View all <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {recentBatches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <Users size={26} className="text-slate-200 mb-3" />
                <p className="text-[13.5px] font-medium text-slate-400">No batches yet</p>
                <button onClick={() => onNav("batches")} className="mt-2 text-[12.5px] text-[#f97316] hover:underline font-semibold">Create your first batch →</button>
              </div>
            ) : recentBatches.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.28 + i * 0.04 }}
                className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
                  <Users size={13} className="text-[#f97316]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-semibold text-slate-800 truncate">{b.name}</p>
                  <p className="text-[12px] text-slate-400">{b.level} · {b.students?.length || 0} students</p>
                </div>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 text-slate-500 uppercase tracking-wide">{b.id}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.30 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-black/[0.06] shadow-[var(--shadow-card)] overflow-hidden"
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b border-black/[0.05]">
            <Zap size={14} className="text-slate-400" />
            <h3 className="font-bold text-[13.5px] text-slate-800">Quick Actions</h3>
          </div>
          <div className="p-2.5">
            <QuickAction icon={Users}    label="Manage Batches"  desc="Create and organize batches"    onClick={() => onNav("batches")}    delay={0.34} />
            <QuickAction icon={Zap}      label="Start Blitz"     desc="Launch a blitz race session"    onClick={() => onNav("blitz-race")} delay={0.37} />
            <QuickAction icon={BookOpen} label="Assign Homework" desc="Create homework for batches"    onClick={() => onNav("homework")}   delay={0.40} />
            <QuickAction icon={FileText} label="Upload PGN"      desc="Add games to PGN center"        onClick={() => onNav("pgn-center")} delay={0.43} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
