import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Download, Calendar, Users, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { db } from "../../utils/database";
import { supabase, PRESENCE_CHANNEL } from "../../utils/supabaseClient";

export function ReportGenerator() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInvited: 0,
    totalCheckedIn: 0,
    totalQuestions: 0,
    totalResponses: 0,
    peakAttendance: 0,
  });
  const [topInsights, setTopInsights] = useState<Array<{
    question: string;
    topAnswer: string;
    percentage: string;
  }>>([]);

  useEffect(() => {
    loadReportData();
    
    // Track live users with faster sync
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: 'report-admin' }
      }
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      console.log("[ReportGenerator] Presence:", state);
      const allPresences = Object.values(state).flat() as { user_id?: string }[];
      const guestUsers = allPresences
        .map(p => p.user_id)
        .filter(Boolean)
        .filter(id => !id.includes('-admin'));
      const liveCount = new Set(guestUsers).size;
      
      console.log("[ReportGenerator] Live count:", liveCount);
      
      setStats(prev => {
        const newPeak = Math.max(prev.peakAttendance, liveCount);
        return {
          ...prev,
          totalCheckedIn: liveCount,
          peakAttendance: newPeak,
        };
      });
    });

    channel.subscribe((status) => {
      console.log("[ReportGenerator] Channel status:", status);
      if (status === 'SUBSCRIBED') {
        channel.track({ user_id: 'report-admin' });
        
        // Force sync after 1 second
        setTimeout(() => {
          channel.track({ user_id: 'report-admin' });
        }, 1000);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const [attendees, questions, responses] = await Promise.all([
        db.getAttendees(),
        db.getQuestions(),
        db.getTotalResponses(),
      ]);

      // Count today's check-ins for initial peak
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayCheckins = attendees.filter(a => {
        if (!a.checked_in_at) return false;
        const checkInDate = new Date(a.checked_in_at);
        return checkInDate >= today;
      }).length;
      
      setStats({
        totalInvited: attendees.length,
        totalCheckedIn: 0, // Will be updated by presence
        totalQuestions: questions.length,
        totalResponses: responses,
        peakAttendance: todayCheckins,
      });

      const sentQuestions = questions.filter(q => q.status === "sent" || q.status === "completed");
      const insights = await Promise.all(
        sentQuestions.slice(0, 3).map(async (q) => {
          const qResponses = await db.getResponses(q.id);
          if (qResponses.length === 0) {
            return {
              question: q.text,
              topAnswer: "No responses yet",
              percentage: "0%",
            };
          }

          if (q.type === "multiple-choice" && q.options) {
            const counts: Record<number, number> = {};
            qResponses.forEach(r => {
              if (r.answer_index !== null) {
                const idxStr = r.answer_index.toString();
                if (idxStr.includes(",")) {
                  idxStr.split(",").filter(i => i !== "").map(Number).forEach(i => {
                    counts[i] = (counts[i] || 0) + 1;
                  });
                } else {
                  counts[r.answer_index] = (counts[r.answer_index] || 0) + 1;
                }
              }
            });
            
            let maxCount = 0;
            let maxIndex = 0;
            Object.entries(counts).forEach(([idx, count]) => {
              if (count > maxCount) {
                maxCount = count;
                maxIndex = parseInt(idx);
              }
            });

            const percentage = Math.round((maxCount / qResponses.length) * 100);
            return {
              question: q.text,
              topAnswer: q.options[maxIndex] || "Unknown",
              percentage: `${percentage}%`,
            };
          } else {
            return {
              question: q.text,
              topAnswer: "Text responses",
              percentage: `${qResponses.length} responses`,
            };
          }
        })
      );

      setTopInsights(insights);
    } catch (err) {
      console.error("Failed to load report data:", err);
    }
    setLoading(false);
  };

  const handleDownloadReport = () => {
    const reportContent = {
      eventName: "CIO Leadership Summit 2026",
      date: new Date().toLocaleDateString(),
      ...stats,
      insights: topInsights,
    };
    
    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cio-summit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceRate = stats.totalInvited > 0 
    ? Math.round((stats.totalCheckedIn / stats.totalInvited) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h2 className="mb-1 text-lg sm:text-xl" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Event Report
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
            Comprehensive summary and insights
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg shadow-primary/20 flex-shrink-0"
          style={{ fontSize: "0.875rem sm:text-0.9375rem", fontWeight: 500 }}
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          Download Report
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl mb-6"
      >
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="mb-1" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              CIO Leadership Summit 2026
            </h3>
            <p className="text-muted-foreground flex items-center gap-2" style={{ fontSize: "0.9375rem" }}>
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 bg-[#0a0c14]/40 rounded-xl">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "0.75rem" }}>
              Total Registered
            </p>
            <p className="text-lg sm:text-xl md:text-2xl" style={{ fontSize: "1.75rem", fontWeight: 600 }}>{stats.totalInvited}</p>
          </div>
          <div className="p-4 bg-[#0a0c14]/40 rounded-xl">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "0.75rem" }}>
              Checked In
            </p>
            <p className="text-lg sm:text-xl md:text-2xl" style={{ fontSize: "1.75rem", fontWeight: 600 }}>{stats.totalCheckedIn}</p>
          </div>
          <div className="p-4 bg-[#0a0c14]/40 rounded-xl">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "0.75rem" }}>
              Attendance Rate
            </p>
            <p className="text-lg sm:text-xl md:text-2xl" style={{ fontSize: "1.75rem", fontWeight: 600 }}>{attendanceRate}%</p>
          </div>
          <div className="p-4 bg-[#0a0c14]/40 rounded-xl">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "0.75rem" }}>
              Peak Attendance
            </p>
            <p className="text-lg sm:text-xl md:text-2xl" style={{ fontSize: "1.75rem", fontWeight: 600 }}>{stats.peakAttendance}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <h3 className="mb-4 flex items-center gap-2 text-base sm:text-lg" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Engagement Metrics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-5 bg-secondary/30 border border-border rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                Avg. Engagement
              </p>
              <BarChart3 className="w-5 h-5 text-[#10b981]" />
            </div>
            <p className="mb-1" style={{ fontSize: "2rem", fontWeight: 600 }}>
              {stats.totalInvited > 0 && stats.totalResponses > 0 
                ? Math.round((stats.totalResponses / (stats.totalCheckedIn * stats.totalQuestions || 1)) * 100)
                : 0}%
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
              Response per attendee
            </p>
          </div>
          <div className="p-5 bg-secondary/30 border border-border rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                Questions Sent
              </p>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <p className="mb-1" style={{ fontSize: "2rem", fontWeight: 600 }}>
              {stats.totalQuestions}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
              Live polls
            </p>
          </div>
          <div className="p-5 bg-secondary/30 border border-border rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                Total Responses
              </p>
              <FileText className="w-5 h-5 text-[#06b6d4]" />
            </div>
            <p className="mb-1" style={{ fontSize: "2rem", fontWeight: 600 }}>
              {stats.totalResponses}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "0.8125rem" }}>
              Across all polls
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="mb-4 flex items-center gap-2 text-base sm:text-lg" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Top Insights
        </h3>
        {topInsights.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
            {topInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl"
              >
                <p className="mb-3" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                  {insight.question}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: insight.percentage.replace("%", "") + "%" }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-primary" style={{ fontSize: "1rem", fontWeight: 600 }}>
                    {insight.percentage}
                  </span>
                </div>
                <p className="mt-2 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                  Most popular: {insight.topAnswer}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-secondary/30 border border-border rounded-2xl">
            <p className="text-muted-foreground">No questions sent yet. Send a question to see insights.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
