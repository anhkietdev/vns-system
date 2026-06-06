import { Users, DollarSign } from "lucide-react";
import SideBar from "../../components/SideBar";
import { Outlet } from "react-router-dom";

const getAdminProfile = () => {
  try {
    const userStr = localStorage.getItem("vns_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      const name = user.fullName || user.name || "Admin";
      const initials = name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      return { initials, name, avatarBg: "bg-red-600" };
    }
  } catch {
    // ignore parse errors
  }
  return { initials: "AD", name: "Admin", avatarBg: "bg-red-600" };
};

const AdminLayout = () => {
  const userProfile = getAdminProfile();
  return (
    <div className="flex h-screen">
      <SideBar
        userProfile={userProfile}
        navItems={[
          { path: "/AdminUserManagement", label: "Quản Lý Người Dùng", icon: <Users /> },
          { path: "/AdminFinance", label: "Tài Chính", icon: <DollarSign /> },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
