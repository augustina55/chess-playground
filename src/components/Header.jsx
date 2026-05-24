import { useState } from "react";
import { Search, Sun, Moon, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { cn } from "../lib/utils";

const PAGE_TITLES = {
  home:         "Dashboard",
  batches:      "Batches",
  "blitz-race": "Blitz Race",
  homework:     "Homework",
  "pgn-center": "PGN Center",
  academy:      "Academy",
  admin:        "Admin Panel",
};

export default function Header({ onProfile, searchValue, onSearch, currentPage }) {
  const { user } = useAuth();
  const [dark, toggleTheme] = useTheme();
  const [focused, setFocused] = useState(false);

  const title = PAGE_TITLES[currentPage] || "Dashboard";

  return (
    <header
      className="flex items-center justify-between px-6 md:px-8 shrink-0 border-b border-black/[0.07] dark:border-white/[0.05] bg-white dark:bg-[#141920]"
      style={{ height: 64 }}
    >
      {/* Left: page title */}
      <div className="hidden md:flex items-center min-w-0">
        <h1 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight select-none">{title}</h1>
      </div>

      {/* Center: search */}
      <div className={cn(
        "flex items-center gap-2 rounded-xl px-3.5 py-2 transition-all duration-200 ml-8 md:ml-0 flex-1 max-w-sm border",
        focused
          ? "bg-white dark:bg-slate-800 border-[#f97316]/40 shadow-[0_0_0_3px_rgba(249,115,22,0.12)]"
          : "bg-slate-50 dark:bg-slate-800/50 border-black/[0.08] dark:border-white/[0.07]"
      )}>
        <Search size={13} className="text-slate-400 shrink-0" />
        <input
          value={searchValue}
          onChange={e => onSearch?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search…"
          className="bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 flex-1 outline-none min-w-0"
        />
        {searchValue && (
          <button onClick={() => onSearch?.("")} className="text-slate-400 hover:text-slate-600 text-xs leading-none">✕</button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 ml-4">
        <button
          onClick={toggleTheme}
          title={dark ? "Light mode" : "Dark mode"}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
        >
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors relative">
          <Bell size={15} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#f97316]" />
        </button>

        <button
          onClick={onProfile}
          title={user?.name}
          className="ml-1.5 flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center shrink-0">
            {user?.avatar || "?"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-200 leading-tight">{user?.name?.split(" ")[0]}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
          </div>
        </button>
      </div>
    </header>
  );
}
