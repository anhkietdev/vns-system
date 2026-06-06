import { Route, Routes, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { FeedbackProvider } from "./feedback/FeedbackProvider";
import LoginPartner from "./pages/PartnerPages/LoginPartner";
import RegisterPartner from "./pages/PartnerPages/RegisterPartner";
import ForgotPassword from "./pages/PartnerPages/ForgotPassword";
import PartnerService from "./pages/PartnerPages/PartnerService";
import PartnerFinance from "./pages/PartnerPages/PartnerFinance";
import PartnerBooking from "./pages/PartnerPages/PartnerBooking";
import PartnerDashboard from "./pages/PartnerPages/PartnerDashboard";
import PartnerProfile from "./pages/PartnerPages/PartnerProfile";
import PartnerMessaging from "./pages/PartnerPages/PartnerMessaging";
import PartnerLayout from "./pages/PartnerPages/PartnerLayout";
import PartnerServiceRegistration from "./pages/PartnerPages/PartnerServiceRegistration";
import PartnerServiceDetails from "./pages/PartnerPages/PartnerServiceDetails";
import PartnerBookingDetails from "./pages/PartnerPages/PartnerBookingDetails";
import ManagerAccountManagement from "./pages/ManagerPages/ManagerAccountManagement";
import ManagerDashboard from "./pages/ManagerPages/ManagerDashboard";
import ManagerLayout from "./pages/ManagerPages/ManagerLayout";
import PartnerCombo from "./pages/PartnerPages/PartnerCombo";
import ManagerPromotion from "./pages/ManagerPages/ManagerPromotion";
import ManagerPromotionCreate from "./pages/ManagerPages/ManagerPromotionCreate";
import ManagerPromotionDetails from "./pages/ManagerPages/ManagerPromotionDetails";
import ManagerServiceApproval from "./pages/ManagerPages/ManagerServiceApproval";
import ManagerFinance from "./pages/ManagerPages/ManagerFinance";
import ManagerFeedback from "./pages/ManagerPages/ManagerFeedback";
import AdminLayout from "./pages/AdminPages/AdminLayout";
import AdminUserManagement from "./pages/AdminPages/AdminUserManagement";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
        <ErrorBoundary>
          <Routes>
        <Route path="/" element={<LoginPartner />} />
        <Route path="/LoginPartner" element={<LoginPartner />} />
        <Route path="/RegisterPartner" element={<RegisterPartner />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />
        {/* Manager routes */}
        <Route element={<ProtectedRoute allowedRoles={["Manager"]}><ManagerLayout /></ProtectedRoute>}>
          <Route path="/ManagerDashboard" element={<ManagerDashboard />} />
          <Route path="/ManagerAccountManagement" element={<ManagerAccountManagement />} />
          <Route path="/ManagerPromotion" element={<ManagerPromotion />} />
          <Route path="/ManagerPromotion/create" element={<ManagerPromotionCreate />} />
          <Route path="/ManagerPromotion/detail" element={<ManagerPromotionDetails />} />
          <Route path="/ManagerPromotion/edit" element={<ManagerPromotionDetails />} />
          <Route path="/ManagerServiceApproval" element={<ManagerServiceApproval />} />
          <Route path="/ManagerFinance" element={<ManagerFinance />} />
          <Route path="/ManagerFeedback" element={<ManagerFeedback />} />
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={["Admin"]}><AdminLayout /></ProtectedRoute>}>
          <Route path="/AdminDashboard" element={<Navigate to="/AdminUserManagement" replace />} />
          <Route path="/AdminUserManagement" element={<AdminUserManagement />} />
          <Route path="/AdminFinance" element={<ManagerFinance />} />
        </Route>

        {/* Partner routes */}
        <Route element={<ProtectedRoute allowedRoles={["Partner"]}><PartnerLayout /></ProtectedRoute>}>
          <Route path="/PartnerDashboard" element={<PartnerDashboard />} />
          <Route path="/PartnerService" element={<PartnerService />} />
          <Route path="/PartnerService/register" element={<PartnerServiceRegistration />} />
          <Route path="/PartnerService/detail" element={<PartnerServiceDetails />} />
          <Route path="/PartnerFinance" element={<PartnerFinance />} />
          <Route path="/PartnerBooking" element={<PartnerBooking />} />
          <Route path="/PartnerBookingDetails" element={<PartnerBookingDetails />} />
          <Route path="/PartnerProfile" element={<PartnerProfile />} />
          <Route path="/PartnerCombo" element={<PartnerCombo />} />
          <Route path="/PartnerMessaging" element={<PartnerMessaging />} />
        </Route>

          </Routes>
        </ErrorBoundary>
      </FeedbackProvider>
    </AuthProvider>
  );
}

export default App;
