import {
  CalendarCheck,
  CircleDollarSign,
  HandPlatter,
  LayoutDashboard,
  MessageCircleMore,
  TicketPercent,
  User,
} from "lucide-react";
import SideBar from "../../components/SideBar";
import { Outlet } from "react-router-dom";

const PartnerLayout = () => {
  return (
    <div className="flex h-screen">
      <SideBar
        navItems={[
          {
            path: "/PartnerProfile",
            label: "Hồ Sơ",
            icon: <User />,
          },
          {
            path: "/PartnerDashboard",
            label: "Bảng Điều Khiển",
            icon: <LayoutDashboard />,
          },
          {
            path: "/PartnerService",
            label: "Dịch Vụ",
            icon: <HandPlatter />,
          },
          {
            path: "/PartnerCombo",
            label: "Combo",
            icon: <TicketPercent />,
          },
          {
            path: "/PartnerFinance",
            label: "Tài Chính",
            icon: <CircleDollarSign />,
          },
          {
            path: "/PartnerBooking",
            label: "Đặt Chỗ",
            icon: <CalendarCheck />,
          },
          {
            path: "/PartnerMessaging",
            label: "Tin Nhắn",
            icon: <MessageCircleMore />,
          },
        ]}
      />

      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default PartnerLayout;
