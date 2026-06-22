import { useState, useEffect, useRef } from "react";
import { Bell, Eye, X, Check, Building2, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getCoachInvitations, respondToInvitation, getAcademies, getCoachAcademies } from "../lib/db";
import { cn } from "../lib/utils";

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

function AcademySwitcher({ academies, activeId, onSwitch, switching }) {
  const [open,   setOpen]   = useState(false);
  const [dropPos, setDropPos] = useState({ top: 72, right: 100 });
  const btnRef               = useRef(null);
  const dropRef              = useRef(null);

  const active = academies.find(a => String(a.id) === String(activeId)) || academies[0];

  function handleToggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [open]);

  if (academies.length < 2) return null;

  return (
    <div className="relative">
      <button ref={btnRef} onClick={handleToggle}
        className="flex items-center gap-1.5 h-10 px-2.5 rounded-full border-2 border-[#1a140f] bg-[#fff4e7] shadow-[0_4px_0_#1a140f] transition-transform hover:-translate-y-0.5 max-w-[160px]">
        <div className="w-5 h-5 rounded-full bg-[#f97316] flex items-center justify-center overflow-hidden shrink-0 border border-[#1a140f]/20">
          {active?.logo
            ? <img src={active.logo} alt="" className="w-full h-full object-cover" />
            : <Building2 size={9} className="text-white" />}
        </div>
        <span className="text-[11px] font-black text-[#1a140f] truncate hidden sm:block max-w-[80px]">
          {active?.name || "Academy"}
        </span>
        {switching
          ? <span className="w-3 h-3 rounded-full border-2 border-[#f97316] border-t-transparent animate-spin shrink-0" />
          : <ChevronDown size={11} className="text-gray-400 shrink-0" />
        }
      </button>

      {open && (
        <div ref={dropRef}
          className="fixed z-[200] w-[220px] bg-white rounded-[18px] border-2 border-[#1a140f] shadow-[0_8px_0_#1a140f,0_12px_32px_rgba(0,0,0,0.15)] overflow-hidden"
          style={{ top: dropPos.top, right: dropPos.right }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">Switch Academy</p>
          </div>
          <div className="py-1.5">
            {academies.map(ac => {
              const isActive = String(ac.id) === String(activeId);
              return (
                <button key={ac.id}
                  onClick={() => { onSwitch(ac); setOpen(false); }}
                  disabled={isActive || !!switching}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    isActive ? "bg-orange-50" : "hover:bg-gray-50"
                  )}>
                  <div className="w-8 h-8 rounded-full bg-[#f97316] flex items-center justify-center overflow-hidden shrink-0 border-2 border-[#1a140f]">
                    {ac.logo
                      ? <img src={ac.logo} alt="" className="w-full h-full object-cover" />
                      : <Building2 size={13} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[13px] font-bold truncate", isActive ? "text-[#f97316]" : "text-gray-800")}>
                      {ac.name}
                    </p>
                    <p className="text-[10px] text-gray-400">{ac.isOwn ? "Your academy" : "Member"}</p>
                  </div>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-[#f97316] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationDropdown({ invitations, onRespond, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    // Use setTimeout so the click that opened the panel doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  return (
    // fixed so it escapes overflow-hidden on App wrapper
    <div ref={ref}
      className="fixed right-4 top-20 w-[340px] bg-white rounded-[20px] border-2 border-[#1a140f] shadow-[0_8px_0_#1a140f,0_12px_32px_rgba(0,0,0,0.15)] z-[200] overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <p className="text-[13px] font-black text-gray-900">Academy Invitations</p>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
          <X size={13} />
        </button>
      </div>

      {invitations.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center px-5">
          <Bell size={28} className="text-gray-200 mb-3" />
          <p className="text-[13px] font-bold text-gray-500">No pending invitations</p>
          <p className="text-[11px] text-gray-400 mt-1">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-[380px] overflow-y-auto">
          {invitations.map(inv => (
            <div key={inv.id} className="px-5 py-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#f97316] text-white font-black text-[14px] flex items-center justify-center shrink-0 overflow-hidden border-2 border-[#1a140f]">
                  {inv.academyLogo
                    ? <img src={inv.academyLogo} alt="" className="w-full h-full object-cover" />
                    : <Building2 size={16} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">{inv.academyName || `Academy #${inv.academyId}`}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Invited you to join as coach</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onRespond(inv.id, false)}
                  className="flex-1 h-9 rounded-xl border-2 border-gray-200 text-[12px] font-bold text-gray-600 hover:border-red-300 hover:text-red-600 transition-all">
                  Decline
                </button>
                <button onClick={() => onRespond(inv.id, true)}
                  className="flex-[2] h-9 rounded-xl bg-[#f97316] hover:bg-[#ea6c00] text-white text-[12px] font-bold transition-all flex items-center justify-center gap-1.5">
                  <Check size={12} strokeWidth={3} />Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({ onProfile, currentPage }) {
  const { user, realUser, revertRole, updateUser } = useAuth();
  const [logo,         setLogo]         = useState(() => localStorage.getItem("ca_academy_logo") || "");
  const [academyName,  setAcademyName]  = useState(() => localStorage.getItem("ca_academy_name") || "");
  const [invitations,  setInvitations]  = useState([]);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const [allAcademies, setAllAcademies] = useState([]);  // coach's academies
  const [switching,    setSwitching]    = useState(null);

  useEffect(() => {
    const sync = () => {
      setLogo(localStorage.getItem("ca_academy_logo") || "");
      setAcademyName(localStorage.getItem("ca_academy_name") || "");
    };
    window.addEventListener("ca-logo-update", sync);
    return () => window.removeEventListener("ca-logo-update", sync);
  }, []);

  // Load pending invitations + all academies (coaches only)
  useEffect(() => {
    if (user?.role !== "coach" || !user?.id) return;
    getCoachInvitations(user.id).then(setInvitations).catch(() => {});
    Promise.all([getAcademies(), getCoachAcademies(user.id)]).then(([all, invs]) => {
      const list = [];
      const own = all.find(a => String(a.mainCoachId) === String(user.id));
      if (own) list.push({ id: own.id, name: own.name, logo: own.logo, isOwn: true });
      invs.forEach(inv => {
        if (!list.find(a => String(a.id) === String(inv.academyId)))
          list.push({ id: inv.academyId, name: inv.academyName, logo: inv.academyLogo, isOwn: false });
      });
      setAllAcademies(list);
    }).catch(() => {});
  }, [user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRespond(invitationId, accept) {
    try {
      await respondToInvitation(invitationId, accept);
      setInvitations(prev => prev.filter(i => i.id !== invitationId));
    } catch (err) {
      console.error("Failed to respond to invitation:", err);
    }
  }

  async function handleSwitch(ac) {
    setSwitching(ac.id);
    try {
      await updateUser({ settings: { ...(user?.settings || {}), activeAcademyId: ac.id } });
      localStorage.setItem("ca_academy_name", ac.name || "");
      localStorage.setItem("ca_academy_logo", ac.logo || "");
      window.dispatchEvent(new CustomEvent("ca-logo-update"));
    } catch (e) {
      console.error("Failed to switch academy:", e);
    } finally {
      setSwitching(null);
    }
  }

  const pendingCount = invitations.length;
  const activeAcademyId = user?.settings?.activeAcademyId || allAcademies[0]?.id;

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
        {/* Left: logo + academy name + page name */}
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

        {/* Right: academy switcher + notification + profile */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Academy switcher — only when coach has multiple academies */}
          {user?.role === "coach" && allAcademies.length > 1 && (
            <AcademySwitcher
              academies={allAcademies}
              activeId={activeAcademyId}
              onSwitch={handleSwitch}
              switching={switching}
            />
          )}

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(v => !v)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#fff4e7] text-[#1a140f] shadow-[0_4px_0_#1a140f] transition-transform hover:-translate-y-0.5"
              type="button"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {pendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#f97316] px-0.5 text-[9px] font-black text-white">
                  {pendingCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <NotificationDropdown
                invitations={invitations}
                onRespond={handleRespond}
                onClose={() => setShowNotifs(false)}
              />
            )}
          </div>

          {/* Profile */}
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
