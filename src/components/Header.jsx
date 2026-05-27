import { Search, Bell, Sun, Moon, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";

const PAGE_TITLES = {
  home: "Dashboard",
  batches: "Batches",
  "blitz-race": "Blitz Race",
  homework: "Homework",
  "pgn-center": "PGN Center",
  academy: "Academy",
  admin: "Admin Panel",
};

const PAGE_DESCRIPTIONS = {
  home: "Track your academy at a glance.",
  batches: "Manage students, groups, and lessons.",
  "blitz-race": "Run fast-paced chess sessions.",
  homework: "Review homework and assignments.",
  "pgn-center": "Store and explore game files.",
  academy: "Coach tools and learning workspace.",
  admin: "System settings and access control.",
};

export default function Header({ onProfile, searchValue, onSearch, currentPage }) {
  const { user } = useAuth();
  const [dark, toggleTheme] = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <header className="shrink-0 border-b-2 border-[#1a140f] bg-[#fffaf2] px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border-2 border-[#1a140f] bg-[#f97316] text-xl text-white shadow-[0_6px_0_#1a140f]">
            ♞
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[22px] font-black tracking-tight text-[#1a140f] md:text-[26px]">
                {PAGE_TITLES[currentPage] || "Dashboard"}
              </h1>
              <span className="rounded-full border-2 border-[#1a140f] bg-[#f7e3cf] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#6b3418]">
                Chess Academy
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] font-medium text-[#6f5c49]">
              {PAGE_DESCRIPTIONS[currentPage] || "Run your academy from one workspace."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div
            className={`flex h-12 items-center gap-2 rounded-[18px] border-2 border-[#1a140f] px-4 shadow-[0_5px_0_#1a140f] transition-all ${
              focused ? "bg-white" : "bg-[#fff4e7]"
            }`}
            style={{ minWidth: 0, width: "100%", maxWidth: 360 }}
          >
            <Search size={16} className="shrink-0 text-[#8c745c]" />
            <input
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Search students, batches, homework..."
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-[#1a140f] placeholder:text-[#a79480]"
            />
            {searchValue ? (
              <button
                onClick={() => onSearch?.("")}
                className="rounded-full border border-[#1a140f] bg-[#fff] px-2 py-1 text-[11px] font-black text-[#1a140f]"
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-12 w-12 items-center justify-center rounded-[18px] border-2 border-[#1a140f] bg-[#fff4e7] text-[#1a140f] shadow-[0_5px_0_#1a140f] transition-transform hover:-translate-y-0.5"
              type="button"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border-2 border-[#1a140f] bg-[#fff4e7] text-[#1a140f] shadow-[0_5px_0_#1a140f] transition-transform hover:-translate-y-0.5"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#f97316] px-1 text-[10px] font-black text-white">
                3
              </span>
            </button>

            <button
              onClick={onProfile}
              className="flex h-12 items-center gap-3 rounded-[18px] border-2 border-[#1a140f] bg-[#1a140f] px-3 pr-4 text-left text-white shadow-[0_5px_0_#1a140f] transition-transform hover:-translate-y-0.5"
              type="button"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/80 bg-[#f97316] text-xs font-black text-white">
                {user?.avatar || "?"}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-[13px] font-bold leading-tight text-white">
                  {user?.name || "Profile"}
                </p>
                <p className="truncate text-[11px] font-medium text-white/70 capitalize">
                  {user?.role || "member"}
                </p>
              </div>
              <ChevronRight size={16} className="hidden text-white/75 sm:block" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
