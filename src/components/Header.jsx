import { useState, useEffect } from "react";
import { Bell, Eye, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const PAGE_TITLES = {
  home:        "Dashboard",
  batches:     "Batches",
  "blitz-race":"Blitz Race",
  homework:    "Homework",
  "pgn-center":"PGN Center",
  academy:     "Academy",
  admin:       "Admin Panel",
  activity:    "My Activity",
};

const ROLE_COLORS = {
  admin:   "bg-red-500",
  coach:   "bg-indigo-500",
  student: "bg-emerald-500",
};

export default function Header({ onProfile, currentPage }) {
  const { user, realUser, revertRole } = useAuth();
  const [logo, setLogo] = useState(() => localStorage.getItem("ca_academy_logo") || "");
  const [academyName, setAcademyName] = useState(() => localStorage.getItem("ca_academy_name") || "");

  useEffect(() => {
    const sync = () => {
      setLogo(localStorage.getItem("ca_academy_logo") || "");
      setAcademyName(localStorage.getItem("ca_academy_name") || "");
    };
    window.addEventListener("ca-logo-update", sync);
    return () => window.removeEventListener("ca-logo-update", sync);
  }, []);

  return (
    <header className="shrink-0 border-b-2 border-[#1a140f] bg-[#fffaf2]">
      {realUser && (
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#1a140f] bg-[#1a140f] px-4 py-2 md:px-6">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-white/90">
            <Eye size={14} className="shrink-0" />
            <span>Previewing as</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white ${ROLE_COLORS[user?.role] || "bg-gray-500"}`}>
              {user?.role}
            </span>
            <span className="text-white/60">({user?.name})</span>
          </div>
          <button
            onClick={revertRole}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-white/20 transition-colors"
          >
            <X size={12} />Exit Preview
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        {/* Left: round logo + academy name + page name */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#f97316] text-[22px] text-white shadow-[0_4px_0_#1a140f] overflow-hidden">
            {logo
              ? <img src={logo} alt="logo" className="w-full h-full object-cover" />
              : "♞"
            }
          </div>
          <div className="min-w-0">
            {(user?.role === "coach" || user?.role === "student") && academyName && (
              <p className="truncate text-[12px] font-black uppercase tracking-[0.12em] text-[#8b5a3c]">
                {academyName}
              </p>
            )}
            <h1 className="truncate text-[20px] font-black tracking-tight text-[#1a140f] leading-tight">
              {PAGE_TITLES[currentPage] || "Dashboard"}
            </h1>
          </div>
        </div>

        {/* Right: notification + profile icon only */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#fff4e7] text-[#1a140f] shadow-[0_4px_0_#1a140f] transition-transform hover:-translate-y-0.5"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#f97316] px-0.5 text-[9px] font-black text-white">
              3
            </span>
          </button>

          <button
            onClick={onProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#1a140f] text-white shadow-[0_4px_0_#1a140f] transition-transform hover:-translate-y-0.5"
            type="button"
            aria-label="Profile"
          >
            <span className="text-[13px] font-black">{user?.avatar || "?"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
