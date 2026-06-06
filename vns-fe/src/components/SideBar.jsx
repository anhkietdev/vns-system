import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LogOut } from "lucide-react";

const SideBar = ({
  navItems = [],
  userProfile = {},
  activeBgColor = "bg-primary",
  hoverBgColor = "hover:bg-primary/5",
}) => {
  const items = navItems.length > 0 ? navItems : [];
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return "VNS";
    return name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const displayName =
    user?.fullName || user?.businessName || user?.email || userProfile.name || "VNS";
  const initials = userProfile.initials || getInitials(displayName);

  const handleLogout = () => {
    logout();
    navigate("/LoginPartner");
  };

  return (
    <div className="w-64 bg-white border-r border-[#e8ecf0] h-screen flex flex-col">
      {/* User Profile Section */}
      <div className="px-5 py-5 border-b border-[#e8ecf0]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#1a2332] truncate">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-[#8d95a3] truncate">{user.email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-primary text-white"
                  : "text-[#5a6577] hover:bg-[#f4f6f8] hover:text-[#1a2332]"
              }`
            }
          >
            <div className="w-5 h-5 flex items-center justify-center">{item.icon}</div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="px-3 py-3 border-t border-[#e8ecf0]">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors duration-150"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 text-[11px] text-[#8d95a3]">
        © 2026 VNS Travel Platform
      </div>
    </div>
  );
};

export default SideBar;
