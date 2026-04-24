import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, MessageSquare, BarChart3, X, CheckCircle2 } from "lucide-react";
import { supabase, REALTIME_CHANNEL } from "../../utils/supabaseClient";
import { db, type Question } from "../../utils/database";

interface QuestionWithResponses extends Question {
  response_count?: number;
}

export function QuestionManager() {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [questions, setQuestions] = useState<QuestionWithResponses[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"multiple-choice" | "text">("multiple-choice");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadQuestions();

    console.log("[Admin] Initializing broadcast channel...");
    channelRef.current = supabase.channel(REALTIME_CHANNEL);
    console.log("[Admin] Channel created:", REALTIME_CHANNEL);
    
    channelRef.current
      .on('broadcast', { event: 'question-push' }, (payload) => {
        console.log("[Admin] Admin received own broadcast:", payload);
      })
      .on('broadcast', { event: 'response-submitted' }, (payload) => {
        console.log("[Admin] Response submitted:", payload);
        loadQuestions();
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'responses' },
        () => loadQuestions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        () => loadQuestions()
      )
      .subscribe((status) => {
        console.log("[Admin] Broadcast channel status:", status);
      });

    return () => {
      console.log("[Admin] Cleaning up channel");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const qs = await db.getQuestions();
      const qsWithCount = await Promise.all(
        qs.map(async (q) => ({
          ...q,
          response_count: await db.getResponseCount(q.id),
        }))
      );
      setQuestions(qsWithCount);
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
    setLoading(false);
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.trim()) return;

    try {
      const question = await db.addQuestion(
        newQuestion,
        newQuestionType,
        newQuestionType === "multiple-choice" ? newOptions.filter((o) => o.trim()) : undefined
      );

      setQuestions(prev => [...prev, { ...question, response_count: 0 }]);
      setShowCreateModal(false);
      setNewQuestion("");
      setNewOptions(["", "", "", ""]);
    } catch (err) {
      console.error("Failed to create question:", err);
    }
  };

  const handleSendQuestion = async (id: string) => {
    console.log("[Admin] handleSendQuestion called with id:", id);
    
    const question = questions.find((q) => q.id === id);
    if (!question) {
      console.error("[Admin] Question not found:", id);
      return;
    }

    const pushedQuestion = {
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options,
      timestamp: Date.now(),
    };
    
    console.log("[Admin] Sending question:", pushedQuestion);

    try {
      if (channelRef.current) {
        console.log("[Admin] Channel exists, sending broadcast...");
        const result = await channelRef.current.send({
          type: 'broadcast',
          event: 'question-push',
          payload: pushedQuestion,
        });
        console.log("[Admin] Broadcast sent successfully, result:", result);
      } else {
        console.error("[Admin] Channel not initialized - channelRef.current is null");
      }
    } catch (err) {
      console.error("[Admin] Failed to broadcast question:", err);
    }

    try {
      await db.updateQuestionStatus(id, "sent");

      setQuestions(prev =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                status: "sent",
                sent_at: new Date().toISOString(),
                response_count: 0,
              }
            : q
        )
      );

      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      console.error("[Admin] Failed to update question status:", err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await db.deleteQuestion(id);
      setQuestions(prev => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Failed to delete question:", err);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h2 className="mb-1 text-lg sm:text-xl" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Questions & Polls
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
            Create and send questions to attendees
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => {
              const testQuestion = {
                id: crypto.randomUUID(),
                text: "Test Question - This is a test notification",
                type: "multiple-choice" as const,
                options: ["Option A", "Option B", "Option C", "Option D"],
                timestamp: Date.now(),
              };

              if (channelRef.current) {
                channelRef.current.send({
                  type: 'broadcast',
                  event: 'question-push',
                  payload: testQuestion,
                });
                console.log("Test question broadcast sent:", testQuestion);
              } else {
                console.error("Channel not initialized");
              }

              setShowSuccessToast(true);
              setTimeout(() => setShowSuccessToast(false), 3000);
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
            style={{ fontSize: "0.875rem sm:text-0.9375rem", fontWeight: 500 }}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Test Push</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg shadow-primary/20"
            style={{ fontSize: "0.875rem sm:text-0.9375rem", fontWeight: 500 }}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Question</span>
            <Plus className="w-4 h-4 sm:hidden" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4" style={{ fontSize: "1rem" }}>
            No questions created yet
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all"
            style={{ fontSize: "0.9375rem", fontWeight: 500 }}
          >
            <Plus className="w-5 h-5" />
            Create Your First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        question.status === "sent"
                          ? "bg-primary/10 text-primary"
                          : question.status === "completed"
                          ? "bg-[#10b981]/10 text-[#10b981]"
                          : "bg-muted/30 text-muted-foreground"
                      }`}
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}
                    >
                      {question.status === "sent"
                        ? "Live"
                        : question.status === "completed"
                        ? "Completed"
                        : "Draft"}
                    </span>
                    {question.type === "text" && (
                      <span className="px-2 py-0.5 bg-muted/20 text-muted-foreground rounded-md" style={{ fontSize: "0.75rem" }}>
                        Text Response
                      </span>
                    )}
                  </div>
                  <p className="mb-2 sm:mb-3" style={{ fontSize: "1rem", fontWeight: 500 }}>
                    {question.text}
                  </p>

                  {question.options && (
                    <div className="space-y-2 mb-2 sm:mb-3">
                      {question.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                          <span className="text-muted-foreground text-sm" style={{ fontSize: "0.875rem" }}>
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.status === "sent" && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-muted-foreground text-xs sm:text-sm" style={{ fontSize: "0.875rem" }}>
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4" />
                        {question.response_count || 0} responses
                      </span>
                      <span className="w-1 h-1 bg-muted-foreground rounded-full" />
                      <span>Sent at {formatTime(question.sent_at)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSendQuestion(question.id)}
                    className="p-2 sm:p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-colors"
                    title={question.status === "sent" ? "Re-push question" : "Send to attendees"}
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    className="p-2 sm:p-2.5 bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] rounded-xl transition-colors"
                    title="View responses"
                  >
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-2 sm:p-2.5 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl transition-colors"
                    title="Delete question"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl z-50 shadow-2xl"
            >
              <div className="sticky top-0 px-6 py-4 border-b border-border bg-secondary/30 backdrop-blur-xl flex items-center justify-between">
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Create New Question</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Question Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewQuestionType("multiple-choice")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newQuestionType === "multiple-choice"
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/30 border-transparent hover:border-border"
                      }`}
                    >
                      <CheckCircle2 className={`w-5 h-5 mb-2 ${newQuestionType === "multiple-choice" ? "text-primary" : "text-muted-foreground"}`} />
                      <p style={{ fontSize: "0.9375rem", fontWeight: 500 }}>Multiple Choice</p>
                    </button>
                    <button
                      onClick={() => setNewQuestionType("text")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        newQuestionType === "text"
                          ? "bg-primary/10 border-primary"
                          : "bg-secondary/30 border-transparent hover:border-border"
                      }`}
                    >
                      <MessageSquare className={`w-5 h-5 mb-2 ${newQuestionType === "text" ? "text-primary" : "text-muted-foreground"}`} />
                      <p style={{ fontSize: "0.9375rem", fontWeight: 500 }}>Text Response</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
                    Question Text
                  </label>
                  <textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Enter your question here..."
                    rows={3}
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>

                {newQuestionType === "multiple-choice" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-foreground" style={{ fontSize: "0.9375rem" }}>
                        Answer Options
                      </label>
                      <button
                        onClick={() => setNewOptions([...newOptions, ""])}
                        className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg transition-colors"
                        style={{ fontSize: "0.8125rem" }}
                      >
                        <Plus className="w-4 h-4" />
                        Add Option
                      </button>
                    </div>
                    <div className="space-y-3">
                      {newOptions.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[idx] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                          />
                          {newOptions.length > 2 && (
                            <button
                              onClick={() => setNewOptions(newOptions.filter((_, i) => i !== idx))}
                              className="p-2 text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all"
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateQuestion}
                    disabled={!newQuestion.trim()}
                    className={`flex-1 py-3 px-4 rounded-xl transition-all ${
                      newQuestion.trim()
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                    }`}
                    style={{ fontSize: "0.9375rem", fontWeight: 500 }}
                  >
                    Create Question
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-8 left-1/2 z-[60] px-6 py-4 bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 flex items-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p style={{ fontSize: "1rem", fontWeight: 600 }}>Question Sent!</p>
              <p style={{ fontSize: "0.875rem", opacity: 0.9 }}>Pushed to all attendees</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}