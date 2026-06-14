import { createContext, useContext, useState } from "react";
import { loginUser, updateProfile } from "../lib/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("caUser") || "null"); } catch { return null; }
  });
  const [realUser, setRealUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("caRealUser") || "null"); } catch { return null; }
  });

  async function login(username, password) {
    const found = await loginUser(username, password);
    if (!found) return false;
    setUser(found);
    localStorage.setItem("caUser", JSON.stringify(found));
    return true;
  }

  function logout() {
    setUser(null);
    setRealUser(null);
    localStorage.removeItem("caUser");
    sessionStorage.removeItem("caRealUser");
  }

  async function updateUser(patch) {
    const updated = { ...user, ...patch };
    setUser(updated);
    localStorage.setItem("caUser", JSON.stringify(updated));
    if (user?.id) {
      try { await updateProfile(user.id, patch); } catch (e) { console.error("updateProfile:", e); }
    }
  }

  // Role-switching helpers (dev/demo only — swaps the local session without touching DB)
  function switchToRole(role) {
    const DEMO = {
      admin:   { id: 1, username: "admin",   name: "Admin User",  role: "admin",   avatar: "A" },
      coach:   { id: 2, username: "coach",   name: "Coach Ravi",  role: "coach",   avatar: "R" },
      student: { id: 3, username: "student", name: "Arjun Kumar", role: "student", avatar: "K" },
    };
    const target = DEMO[role];
    if (!target) return;
    const base = realUser || user;
    sessionStorage.setItem("caRealUser", JSON.stringify(base));
    setRealUser(base);
    setUser(target);
  }

  function revertRole() {
    if (!realUser) return;
    setUser(realUser);
    setRealUser(null);
    sessionStorage.removeItem("caRealUser");
  }

  return (
    <AuthContext.Provider value={{ user, realUser, login, logout, updateUser, switchToRole, revertRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
