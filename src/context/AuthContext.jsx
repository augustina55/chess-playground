import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const DEMO_USERS = [
  { id: 1, username: "admin",   password: "admin123",   name: "Admin User",  role: "admin",   avatar: "A" },
  { id: 2, username: "coach",   password: "coach123",   name: "Coach Ravi",  role: "coach",   avatar: "R" },
  { id: 3, username: "student", password: "student123", name: "Arjun Kumar", role: "student", avatar: "K" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("caUser") || "null"); } catch { return null; }
  });
  const [realUser, setRealUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("caRealUser") || "null"); } catch { return null; }
  });

  function login(username, password) {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem("ca_users") || "[]"); } catch { return []; }
    })();
    const all = [...DEMO_USERS, ...stored];
    const found = all.find(
      u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!found) return false;
    const { password: _, ...safe } = found;
    setUser(safe);
    localStorage.setItem("caUser", JSON.stringify(safe));
    return true;
  }

  function logout() {
    setUser(null);
    setRealUser(null);
    localStorage.removeItem("caUser");
    sessionStorage.removeItem("caRealUser");
  }

  function updateUser(patch) {
    setUser(prev => {
      const updated = { ...prev, ...patch };
      localStorage.setItem("caUser", JSON.stringify(updated));
      return updated;
    });
  }

  function switchToRole(role) {
    const target = DEMO_USERS.find(u => u.role === role);
    if (!target) return;
    const base = realUser || user;
    sessionStorage.setItem("caRealUser", JSON.stringify(base));
    setRealUser(base);
    const { password: _, ...safe } = target;
    setUser(safe);
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
