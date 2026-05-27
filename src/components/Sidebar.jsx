import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Zap,
  BookOpen,
  FileText,
  Building2,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const NAV_SECTIONS = [
  {
    label: "ACADEMIC",
    items: [
      { id: "batches", icon: Users, label: "Batches" },
      { id: "homework", icon: BookOpen, label: "Homework" },
      { id: "pgn-center", icon: FileText, label: "PGN Center" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { id: "home", icon: LayoutDashboard, label: "Dashboard" },
      { id: "blitz-race", icon: Zap, label: "Blitz Race" },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { id: "academy", icon: Building2, label: "Academy", roles: ["admin", "coach"] },
      { id: "admin", icon: Settings, label: "Admin", roles: ["admin"] },
    ],
  },
];

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  const isActive = active === item.id;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-[16px] border-2 px-3 py-3 text-left text-[13.5px] font-bold transition-all duration-150",
        isActive
          ? "border-[#1a140f] bg-[#f97316] text-white shadow-[0_5px_0_#1a140f]"
          : "border-transparent bg-transparent text-[#f5e8d7] hover:border-[#4a3727] hover:bg-[#2a2118] hover:text-white"
      )}
      type="button"
    >
      <Icon
        size={16}
        className={cn("shrink-0", isActive ? "text-white" : "text-[#d1b89b]")}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

function SidebarContent({ active, user, logout, onNav, onItemClick }) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b-2 border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border-2 border-[#1a140f] bg-[#f97316] text-[22px] text-white shadow-[0_6px_0_#1a140f]">
            ♞
          </div>
          <div className="min-w-0">
            <p className="text-[16px] font-black tracking-tight text-white">Chess Academy</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#c7ad90]">
              Coach workspace
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] border-2 border-[#1a140f] bg-[#fff4e7] px-4 py-3 text-[#1a140f] shadow-[0_5px_0_#1a140f]">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5a3c]">
            Active member
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#1a140f] bg-[#1a140f] text-xs font-black text-white">
              {user?.avatar || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-tight">{user?.name}</p>
              <p className="truncate text-[11px] font-medium capitalize text-[#6f5c49]">
                {user?.role}
              </p>
            </div>
            <ChevronDown size={15} className="shrink-0 text-[#6f5c49]" />
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {NAV_SECTIONS.map((section) => {
            const visible = section.items.filter(
              (item) => !item.roles || item.roles.includes(user?.role)
            );

            if (visible.length === 0) return null;

            return (
              <div key={section.label}>
                <p className="px-3 pb-2 text-[10.5px] font-black uppercase tracking-[0.18em] text-[#a88c70]">
                  {section.label}
                </p>
                <div className="space-y-2">
                  {visible.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      active={active}
                      onClick={() => {
                        onNav(item.id);
                        onItemClick?.();
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t-2 border-white/10 px-4 py-4">
        <button
          onClick={logout}
          type="button"
          className="flex w-full items-center gap-3 rounded-[16px] border-2 border-[#1a140f] bg-[#fff4e7] px-3 py-3 text-left text-[13px] font-black text-[#1a140f] shadow-[0_5px_0_#1a140f] transition-transform hover:-translate-y-0.5"
          title="Sign out"
        >
          <LogOut size={16} className="shrink-0" />
          <span className="truncate">Sign out</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ active, onNav }) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex h-full w-[250px] shrink-0 flex-col overflow-hidden border-r-2 border-[#1a140f] bg-[#1f1711]">
        <SidebarContent
          active={active}
          user={user}
          logout={logout}
          onNav={onNav}
        />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-[16px] border-2 border-[#1a140f] bg-[#1f1711] text-white shadow-[0_5px_0_#1a140f] md:hidden"
        type="button"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/45 md:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="fixed left-0 top-0 z-50 flex h-full w-[250px] flex-col overflow-hidden border-r-2 border-[#1a140f] bg-[#1f1711] md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-[14px] border-2 border-[#1a140f] bg-[#fff4e7] text-[#1a140f] shadow-[0_4px_0_#1a140f]"
                type="button"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
              <SidebarContent
                active={active}
                user={user}
                logout={logout}
                onNav={onNav}
                onItemClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
