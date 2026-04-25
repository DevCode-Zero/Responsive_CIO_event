import { createBrowserRouter, Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { LayoutDashboard, Users, MessageSquare, FileText, Calendar, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { GuestApp } from "./pages/GuestApp";
import { GuestDashboard } from "./pages/GuestDashboard";
import { QuestionRoute } from "./pages/QuestionRoute";
import { AdminLogin } from "./pages/AdminLogin";
import { StatsOverview } from "./components/admin/StatsOverview";
import { RecentActivity } from "./components/admin/RecentActivity";
import { AttendeesList } from "./components/admin/AttendeesList";
import { QuestionManager } from "./components/admin/QuestionManager";
import { ReportGenerator } from "./components/admin/ReportGenerator";
import { MeetingProcesses } from "./components/admin/MeetingProcesses";
import { IndividualReports } from "./components/admin/IndividualReports";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { id: "attendees", label: "Attendees", icon: Users, path: "/admin/attendees" },
  { id: "questions", label: "Questions", icon: MessageSquare, path: "/admin/questions" },
  { id: "individual", label: "Individual Reports", icon: UserCheck, path: "/admin/individual-reports" },
  { id: "reports", label: "Reports", icon: FileText, path: "/admin/reports" },
  { id: "meetings", label: "Meeting Processes", icon: Calendar, path: "/admin/meetings" },
];

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const getActiveTab = () => {
    const path = location.pathname;
    const tab = tabs.find(t => t.path === path);
    return tab?.id || "overview";
  };

  const activeTab = getActiveTab();

  const handleLogout = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Admin Portal</h1>
                <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                  CIO Leadership Summit
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
              style={{ fontSize: "0.9375rem", fontWeight: 500 }}
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary/30 hover:bg-secondary text-foreground"
                }`}
                style={{ fontSize: "0.9375rem", fontWeight: 500 }}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="px-6 py-8">
        <Outlet />
      </div>
    </div>
  );
}

function OverviewPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-8">
        <h2 className="mb-2" style={{ fontSize: "1.875rem", fontWeight: 600 }}>
          Event Overview
        </h2>
        <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
          Real-time metrics and status
        </p>
      </div>
      <StatsOverview />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-secondary/30 border border-border rounded-2xl">
          <h3 className="mb-4" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/admin/questions")}
              className="w-full p-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: 500 }}>Send New Question</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    Create and push live polls
                  </p>
                </div>
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
            </button>
            <button
              onClick={() => navigate("/admin/attendees")}
              className="w-full p-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: 500 }}>View Attendees</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    Check-in status and details
                  </p>
                </div>
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
            <button
              onClick={() => navigate("/admin/reports")}
              className="w-full p-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: "1rem", fontWeight: 500 }}>Generate Report</p>
                  <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    Download event insights
                  </p>
                </div>
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
            </button>
          </div>
        </div>

        <div className="p-6 bg-secondary/30 border border-border rounded-2xl">
          <h3 className="mb-4" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
            Recent Activity
          </h3>
          <RecentActivity />
        </div>
      </div>
    </motion.div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: GuestApp,
  },
  {
    path: "/dashboard",
    Component: GuestDashboard,
  },
  {
    path: "/question",
    Component: QuestionRoute,
  },
  {
    path: "/admin",
    Component: AdminLogin,
  },
  {
    path: "/admin/dashboard",
    element: <AdminLayout />,
    children: [
      { index: true, element: <OverviewPage /> },
    ],
  },
  {
    path: "/admin/attendees",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AttendeesList /> },
    ],
  },
  {
    path: "/admin/questions",
    element: <AdminLayout />,
    children: [
      { index: true, element: <QuestionManager /> },
    ],
  },
  {
    path: "/admin/individual-reports",
    element: <AdminLayout />,
    children: [
      { index: true, element: <IndividualReports /> },
    ],
  },
  {
    path: "/admin/reports",
    element: <AdminLayout />,
    children: [
      { index: true, element: <ReportGenerator /> },
    ],
  },
  {
    path: "/admin/meetings",
    element: <AdminLayout />,
    children: [
      { index: true, element: <MeetingProcesses /> },
    ],
  },
  {
    path: "*",
    Component: () => (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-2xl mb-4">Page Not Found</h1>
          <a href="/" className="text-primary underline">Go Home</a>
        </div>
      </div>
    ),
  },
]);
