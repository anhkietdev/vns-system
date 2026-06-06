import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("vns_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = (userData) => {
    localStorage.setItem("vns_user", JSON.stringify(userData));
    if (userData.token) localStorage.setItem("vns_token", userData.token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("vns_user");
    localStorage.removeItem("vns_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
