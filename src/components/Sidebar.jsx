import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Zap, BookOpen, FileText,
  Building2, Settings, ChevronLeft, ChevronRight, Menu, X, LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

const NAV_SECTIONS = [
  {
    label: "Main Menu",
    items: [
      { id: "home",       icon: LayoutDashboard, label: "Dashboard",  roles: null },
      { id: "batches",    icon: Users,           label: "Batches",    roles: null },
      { id: "blitz-race", icon: Zap,             label: "Blitz Race", roles: null },
      { id: "homework",   icon: BookOpen,        label: "Homework",   roles: null },
      { id: "pgn-center", icon: FileText,        label: "PGN Center", roles: null },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "academy", icon: Building2, label: "Academy", roles: ["admin", "coach"] },
      { id: "admin",   icon: Settings,  label: "Admin",   roles: ["admin"] },
    ],
  },
];

function NavItem({ item, active, onClick, collapsed }) {
  const Icon = item.icon;
  const isActive = active === item.id;
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group",
        collapsed ? "justify-center px-0" : "justify-start",
        isActive
          ? "bg-[#f97316] text-white shadow-[0_2px_12px_rgba(249,115,22,0.35)]"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white/90"
      )}
    >
      <Icon
        size={17}
        className={cn(
          "shrink-0 transition-colors",
          isActive ? "text-white" : "text-white/45 group-hover:text-white/80"
        )}
      />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export default function Sidebar({ active, onNav }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = ({ onItemClick }) => (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-5 pt-6 pb-5 shrink-0",
        collapsed && "justify-center px-3"
      )}>
        <div className="w-9 h-9 rounded-xl bg-[#f97316] flex items-center justify-center shrink-0 text-white font-bold text-lg shadow-lg shadow-orange-500/30">
          ♞
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <p className="font-extrabold text-white text-[14px] leading-tight whitespace-nowrap tracking-tight">Chess Academy</p>
              <p className="text-[11px] text-white/35 font-medium whitespace-nowrap mt-0.5">Management Suite</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto overflow-x-hidden space-y-5">
        {NAV_SECTIONS.map(section => {
          const visible = section.items.filter(item =>
            !item.roles || item.roles.includes(user?.role)
          );
          if (visible.length === 0) return null;
          return (
            <div key={section.label}>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 pb-1.5 text-[10px] font-bold text-white/25 uppercase tracking-[0.14em]"
                  >
                    {section.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {visible.map(item => (
                  <NavItem
                    key={item.id}
                    item={item}
                    active={active}
                    collapsed={collapsed}
                    onClick={() => { onNav(item.id); onItemClick?.(); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 pt-3 border-t border-white/[0.07] shrink-0 space-y-0.5">
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5 px-3 py-3 rounded-xl bg-white/[0.05] mb-2"
            >
              <div className="w-8 h-8 rounded-full bg-[#f97316] text-white text-sm font-bold flex items-center justify-center shrink-0">
                {user?.avatar || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-white/90 truncate leading-tight">{user?.name}</p>
                <p className="text-[11px] text-white/35 capitalize leading-tight mt-0.5">{user?.role}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={logout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          <LogOut size={15} className="shrink-0" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden whitespace-nowrap">
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={() => setCollapsed(c => !c)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-white/40 hover:text-white/80 hover:bg-white/[0.07] transition-colors",
            collapsed && "justify-center px-0"
          )}
        >
          {collapsed ? <ChevronRight size={15} className="shrink-0" /> : <ChevronLeft size={15} className="shrink-0" />}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden whitespace-nowrap">
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ type: "spring", stiffness: 320, damping: 35 }}
        style={{ background: "#1E1E2D", minWidth: collapsed ? 72 : 240 }}
        className="hidden md:flex flex-col h-full shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-5 left-4 z-50 p-2 rounded-xl bg-[#1E1E2D] text-white/70 hover:text-white shadow-lg"
      >
        <Menu size={17} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 340, damping: 35 }}
              style={{ background: "#1E1E2D" }}
              className="md:hidden fixed left-0 top-0 h-full w-60 z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-5 right-4 p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.07]"
              >
                <X size={16} />
              </button>
              <SidebarContent onItemClick={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
