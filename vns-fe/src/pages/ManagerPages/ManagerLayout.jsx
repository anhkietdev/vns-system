import {
  LayoutDashboard,
  TicketPercent,
  User,
  Wrench,
  CircleDollarSign,
  MessageSquare,
} from "lucide-react";
import SideBar from "../../components/SideBar";
import { Outlet } from "react-router-dom";

const ManagerLayout = () => {
  return (
    <div className="flex h-screen">
      <SideBar
        navItems={[
          {
            path: "/ManagerDashboard",
            label: "Bảng Điều Khiển",
            icon: <LayoutDashboard />,
          },
          {
            path: "/ManagerAccountManagement",
            label: "Hồ Sơ Đối Tác",
            icon: <User />,
          },
          {
            path: "/ManagerServiceApproval",
            label: "Duyệt Dịch Vụ",
            icon: <Wrench />,
          },
          {
            path: "/ManagerPromotion",
            label: "Khuyến Mãi",
            icon: <TicketPercent />,
          },
          { path: "/ManagerFinance", label: "Tài Chính", icon: <CircleDollarSign /> },
          { path: "/ManagerFeedback", label: "Phản Hồi", icon: <MessageSquare /> },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default ManagerLayout;
