import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Users, MessageSquare, FileText, Calendar, LogOut, ShieldCheck } from "lucide-react";
import { StatsOverview } from "../components/admin/StatsOverview";
import { RecentActivity } from "../components/admin/RecentActivity";
import { AttendeesList } from "../components/admin/AttendeesList";
import { QuestionManager } from "../components/admin/QuestionManager";
import { ReportGenerator } from "../components/admin/ReportGenerator";
import { MeetingProcesses } from "../components/admin/MeetingProcesses";

type Tab = "overview" | "attendees" | "questions" | "reports" | "meetings";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogout = () => {
    navigate("/admin");
  };

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "attendees" as Tab, label: "Attendees", icon: Users },
    { id: "questions" as Tab, label: "Questions", icon: MessageSquare },
    { id: "reports" as Tab, label: "Reports", icon: FileText },
    { id: "meetings" as Tab, label: "Meeting Processes", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl" style={{ fontWeight: 600 }}>Admin Portal</h1>
                <p className="text-muted-foreground text-xs sm:text-sm truncate hidden sm:block" style={{ fontSize: "0.875rem" }}>
                  CIO Leadership Summit
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg md:rounded-xl transition-all touch-manipulation flex-shrink-0"
              style={{ fontSize: "0.875rem md:text-0.9375rem", fontWeight: 500 }}
            >
              <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all whitespace-nowrap touch-manipulation flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-secondary/30 hover:bg-secondary text-foreground"
                }`}
                style={{ fontSize: "0.8125rem md:text-0.9375rem", fontWeight: 500 }}
              >
                <tab.icon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="px-3 md:px-6 py-6 md:py-8">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6 md:mb-8">
                <h2 className="mb-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl" style={{ fontWeight: 600 }}>
                  Event Overview
                </h2>
                <p className="text-muted-foreground text-sm md:text-base" style={{ fontSize: "1rem" }}>
                  Real-time metrics and status
                </p>
              </div>
              <StatsOverview />

              <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="p-4 md:p-6 bg-secondary/30 border border-border rounded-2xl">
                  <h3 className="mb-3 md:mb-4 text-base md:text-lg" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    Quick Actions
                  </h3>
                  <div className="space-y-2 md:space-y-3">
                    <button
                      onClick={() => setActiveTab("questions")}
                      className="w-full p-3 md:p-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl transition-all text-left group touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm md:text-base font-medium" style={{ fontSize: "1rem" }}>Send New Question</p>
                          <p className="text-muted-foreground text-xs md:text-sm" style={{ fontSize: "0.875rem" }}>
                            Create and push live polls
                          </p>
                        </div>
                        <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("attendees")}
                      className="w-full p-3 md:p-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all text-left group touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm md:text-base font-medium" style={{ fontSize: "1rem" }}>View Attendees</p>
                          <p className="text-muted-foreground text-xs md:text-sm" style={{ fontSize: "0.875rem" }}>
                            Check-in status and details
                          </p>
                        </div>
                        <Users className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("reports")}
                      className="w-full p-3 md:p-4 bg-secondary hover:bg-secondary/80 border border-border rounded-xl transition-all text-left group touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm md:text-base font-medium" style={{ fontSize: "1rem" }}>Generate Report</p>
                          <p className="text-muted-foreground text-xs md:text-sm" style={{ fontSize: "0.875rem" }}>
                            Download event insights
                          </p>
                        </div>
                        <FileText className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
                      </div>
                    </button>
                  </div>
                </div>

                <div className="p-4 md:p-6 bg-secondary/30 border border-border rounded-2xl">
                  <h3 className="mb-3 md:mb-4 text-base md:text-lg" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    Recent Activity
                  </h3>
                  <RecentActivity />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "attendees" && (
            <motion.div
              key="attendees"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AttendeesList />
            </motion.div>
          )}

          {activeTab === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <QuestionManager />
            </motion.div>
          )}

          {activeTab === "reports" && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <ReportGenerator />
            </motion.div>
          )}

          {activeTab === "meetings" && (
            <motion.div
              key="meetings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <MeetingProcesses />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
