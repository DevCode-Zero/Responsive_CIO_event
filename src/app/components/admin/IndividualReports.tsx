import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, User, CheckCircle2, Download, ArrowLeft, FileText, Clock } from "lucide-react";
import { db, type Attendee, type Question } from "../../utils/database";
import { supabase, PRESENCE_CHANNEL } from "../../utils/supabaseClient";

interface AttendeeResponse {
  questionId: string;
  questionText: string;
  questionType: string;
  answerIndex: number | string | null;
  answerText: string | null;
  options: string[] | null;
  answeredAt: string;
}

export function IndividualReports() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const [attendeeResponses, setAttendeeResponses] = useState<AttendeeResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [downloadingReport, setDownloadingReport] = useState(false);

  useEffect(() => {
    loadAttendees();
    
    // Track online users
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: 'individual-reports-admin' }
      }
    });
    
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).flat() as { user_id: string }[];
      const names = users.map(u => u.user_id).filter(Boolean);
      setOnlineUsers(names);
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ user_id: 'individual-reports-admin' });
        
        // Force sync after 1 second
        setTimeout(() => {
          channel.track({ user_id: 'individual-reports-admin' });
        }, 1000);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const data = await db.getAttendees();
      setAttendees(data);
    } catch (err) {
      console.error("Failed to load attendees:", err);
    }
    setLoading(false);
  };

  const loadAttendeeResponses = async (attendeeId: string) => {
    setLoadingResponses(true);
    try {
      const responses = await db.getResponsesForAttendee(attendeeId);
      const allQuestions = await db.getQuestions();
      
      const responsesByQuestion = new Map<string, AttendeeResponse>();
      
      for (const resp of responses) {
        const question = allQuestions.find((q) => q.id === resp.question_id);
        
        let answerText = "";
        if (question?.type === "multiple-choice" && resp.answer_index !== null && question.options) {
          const idxStr = resp.answer_index.toString();
          if (idxStr.includes(",")) {
            const indices = idxStr.split(",").map(Number).filter(i => i >= 0 && i < question.options!.length);
            answerText = indices.map(i => question.options![i]).join("\n• ");
          } else {
            const idx = Number(idxStr);
            if (idx >= 0 && idx < question.options.length) {
              answerText = question.options[idx];
            }
          }
        } else if (question?.type === "text") {
          answerText = resp.answer_text || "";
        }
        
        if (!responsesByQuestion.has(resp.question_id)) {
          let combinedAnswerIndex: number | string = resp.answer_index !== null ? resp.answer_index : -1;
          let combinedAnswerText = answerText;
          
          responsesByQuestion.set(resp.question_id, {
            questionId: resp.question_id,
            questionText: question?.text || "Unknown Question",
            questionType: question?.type || "unknown",
            answerIndex: combinedAnswerIndex,
            answerText: combinedAnswerText,
            options: question?.options || null,
            answeredAt: resp.created_at,
          });
        } else {
          const existing = responsesByQuestion.get(resp.question_id)!;
          const uniqueAnswers = new Set(
            existing.answerText 
              ? existing.answerText.split("\n• ").filter(Boolean)
              : []
          );
          if (answerText && !uniqueAnswers.has(answerText)) {
            uniqueAnswers.add(answerText);
            existing.answerText = Array.from(uniqueAnswers).join("\n• ");
          }
          if (existing.answerIndex !== null && resp.answer_index !== null) {
            const existingIndices = new Set(
              existing.answerIndex.toString().split(",").filter(i => i !== "")
            );
            existingIndices.add(resp.answer_index.toString());
            existing.answerIndex = Array.from(existingIndices).sort().join(",");
          }
        }
      }

      setAttendeeResponses(Array.from(responsesByQuestion.values()));
    } catch (err) {
      console.error("Failed to load responses:", err);
    }
    setLoadingResponses(false);
  };

  const handleSelectAttendee = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    loadAttendeeResponses(attendee.id);
  };

  const handleBack = () => {
    setSelectedAttendee(null);
    setAttendeeResponses([]);
  };

  const getAnswerDisplay = (response: AttendeeResponse) => {
    if (response.answerText?.includes("\n• ")) {
      return response.answerText;
    }
    if (response.questionType === "multiple-choice" && response.answerIndex !== null && response.options) {
      const idx = response.answerIndex.toString();
      if (idx.includes(",")) {
        const indices = idx.split(",").filter(i => i !== "").map(Number);
        return indices.map(i => response.options?.[i]).filter(Boolean).join("\n• ");
      }
      const numIdx = typeof response.answerIndex === "string" ? parseInt(response.answerIndex) : response.answerIndex;
      if (numIdx >= 0 && numIdx < response.options.length) {
        return response.options[numIdx];
      }
    }
    return response.answerText || "No answer";
  };

  const handleExportAttendeeReport = async () => {
    if (!selectedAttendee) return;

    setDownloadingReport(true);

    const report = {
      attendee: {
        name: selectedAttendee.name,
        email: selectedAttendee.email,
        company: selectedAttendee.company,
        title: selectedAttendee.title || "",
        location: selectedAttendee.location || "",
        checkedInAt: selectedAttendee.checked_in_at,
      },
      responses: attendeeResponses.map((r) => ({
        question: r.questionText,
        answer: getAnswerDisplay(r),
        answeredAt: r.answeredAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error("Failed to generate workshop plan");
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || "";

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"><title>Workshop Plan</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
          h1 { color: #1a1a1a; font-size: 18pt; }
          h2 { color: #333; font-size: 14pt; margin-top: 18pt; }
          h3 { color: #444; font-size: 12pt; margin-top: 14pt; }
          p { margin: 8pt 0; }
          ul, ol { margin: 8pt 0; padding-left: 24pt; }
          li { margin: 4pt 0; }
        </style>
        </head><body>${content.replace(/\n/g, "<br>")}</body></html>`;

      const blob = new Blob([htmlContent], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workshop-plan-${selectedAttendee.name.replace(/\s+/g, "-").toLowerCase()}.doc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating workshop plan:", error);
      alert("Failed to generate workshop plan. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const filteredAttendees = attendees.filter(
    (att) =>
      att.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedAttendee) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Attendees
        </button>

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-6 bg-secondary/30 border border-border rounded-2xl mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="mb-1 text-lg sm:text-xl" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                {selectedAttendee.name}
              </h2>
              <p className="text-muted-foreground mb-2 text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
                {selectedAttendee.title && `${selectedAttendee.title} at `}{selectedAttendee.company}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs sm:text-sm" style={{ fontSize: "0.875rem" }}>
                <span className="truncate">{selectedAttendee.email}</span>
                {selectedAttendee.checked_in_at && (
                  <>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#10b981]" />
                      Checked in
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      {new Date(selectedAttendee.checked_in_at).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={handleExportAttendeeReport}
              disabled={downloadingReport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all disabled:opacity-50 w-full sm:w-auto justify-center"
              style={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              {downloadingReport ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {downloadingReport ? "Generating..." : "Download Report"}
            </button>
          </div>

          <div className="mb-6">
            <h3 className="mb-4" style={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Responses ({attendeeResponses.length})
            </h3>

            {loadingResponses ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Loading responses...</p>
              </div>
            ) : attendeeResponses.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
                  No responses yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendeeResponses.map((response, index) => (
                  <motion.div
                    key={response.questionId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl"
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 mb-3">
                      <p className="font-medium text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
                        {response.questionText}
                      </p>
                      <span className="text-muted-foreground flex-shrink-0 text-xs" style={{ fontSize: "0.75rem" }}>
                        {new Date(response.answeredAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="p-3 sm:p-4 bg-primary/10 border border-primary/20 rounded-xl">
                      <p className="text-primary text-sm sm:text-base" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                        {getAnswerDisplay(response)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-8">
        <h2 className="mb-2" style={{ fontSize: "1.875rem", fontWeight: 600 }}>
          Individual Reports
        </h2>
        <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
          View and export attendee-specific response data
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, or email..."
            className="w-full pl-10 sm:pl-12 pr-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors text-sm sm:text-base"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading attendees...</p>
        </div>
      ) : filteredAttendees.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
            {searchQuery ? `No attendees found matching "${searchQuery}"` : "No attendees registered yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredAttendees.map((attendee, index) => (
            <motion.button
              key={attendee.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleSelectAttendee(attendee)}
              className="p-4 sm:p-5 bg-secondary/30 border border-border hover:border-primary/50 rounded-2xl transition-all text-left group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center flex-shrink-0 group-hover:from-primary group-hover:to-primary/60 transition-all">
                  <User className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium mb-0.5 truncate text-sm sm:text-base" style={{ fontSize: "1rem" }}>
                    {attendee.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs sm:text-sm" style={{ fontSize: "0.8125rem" }}>
                    {attendee.company}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {onlineUsers.includes(attendee.name) && (
                      <span className="flex items-center gap-1 text-[#10b981]" style={{ fontSize: "0.75rem" }}>
                        <CheckCircle2 className="w-3 h-3" />
                        Checked In
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
