import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";
import { supabase, REALTIME_CHANNEL } from "../utils/supabaseClient";
import { db } from "../utils/database";
import { type Attendee, type Question } from "../utils/database";

interface QuestionData {
  id: string;
  text: string;
  type: "multiple-choice" | "text";
  options: string[] | null;
  timestamp: number;
}

export function QuestionRoute() {
  const navigate = useNavigate();
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [textResponse, setTextResponse] = useState("");
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAttendee = async () => {
      const storedAttendee = localStorage.getItem("checkedInAttendee");
      if (storedAttendee) {
        try {
          const parsed = JSON.parse(storedAttendee);
          const dbAttendee = await db.getCheckedInAttendeeById(parsed.id);
          if (dbAttendee && dbAttendee.checked_in_at) {
            setAttendee(dbAttendee);
          } else {
            navigate("/");
          }
        } catch {
          navigate("/");
        }
      } else {
        navigate("/");
      }
      setLoading(false);
    };
    
    loadAttendee();
  }, [navigate]);

  useEffect(() => {
    const loadQuestion = async () => {
      try {
        const questions = await db.getQuestions();
        const sentQuestions = questions.filter(q => q.status === "sent");
        
        if (sentQuestions.length > 0) {
          const latestQ = sentQuestions[0];
          setQuestion({
            id: latestQ.id,
            text: latestQ.text,
            type: latestQ.type as "multiple-choice" | "text",
            options: latestQ.options || [],
            timestamp: new Date(latestQ.sent_at || latestQ.created_at).getTime(),
          });
        } else {
          setQuestion({
            id: 1,
            text: "What is your organization's top technology priority for 2026?",
            type: "multiple-choice",
            options: [
              "AI & Machine Learning Integration",
              "Cloud Infrastructure Modernization",
              "Cybersecurity Enhancement",
              "Digital Transformation",
            ],
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        console.error("Failed to load question:", err);
        setQuestion({
          id: 1,
          text: "What is your organization's top technology priority for 2026?",
          type: "multiple-choice",
          options: [
            "AI & Machine Learning Integration",
            "Cloud Infrastructure Modernization",
            "Cybersecurity Enhancement",
            "Digital Transformation",
          ],
          timestamp: Date.now(),
        });
      }
    };

    loadQuestion();

    const channel = supabase.channel(REALTIME_CHANNEL);
    channel
      .on('broadcast', { event: 'question-push' }, (payload) => {
        const pq = payload.payload as QuestionData;
        setQuestion(pq);
      })
      .subscribe();

    // Store channel for use in handleSubmit
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleSubmit = async () => {
    if (!attendee || !question) return;

    if (question.type === "multiple-choice" && selectedAnswers.length > 0) {
      try {
        for (const answerIndex of selectedAnswers) {
          await db.addResponse(question.id, attendee.id, answerIndex, undefined, attendee.name, true);
        }
        console.log("Response saved for:", attendee.name);
        
        // Broadcast response submission for instant update
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'response-submitted',
            payload: { questionId: question.id, attendeeName: attendee.name },
          });
        }
      } catch (err) {
        console.error("Failed to save response:", err);
      }
      setSubmitted(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } else if (question.type === "text" && textResponse.trim()) {
      try {
        await db.addResponse(question.id, attendee.id, undefined, textResponse, attendee.name);
        console.log("Response saved for:", attendee.name);
        
        // Broadcast response submission for instant update
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'response-submitted',
            payload: { questionId: question.id, attendeeName: attendee.name },
          });
        }
      } catch (err) {
        console.error("Failed to save response:", err);
      }
      setSubmitted(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    }
  };

  if (loading || !question) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="sticky top-0 z-50 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Live Q&A</h2>
          {attendee && (
            <span className="ml-auto text-muted-foreground" style={{ fontSize: "0.875rem" }}>
              Answering as {attendee.name}
            </span>
          )}
        </div>
      </motion.div>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-4">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-primary" style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    New Question
                  </span>
                </div>

                <h1 className="mb-3" style={{ fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.4 }}>
                  {question.text}
                </h1>
                <p className="text-muted-foreground" style={{ fontSize: "0.9375rem" }}>
                  {question.type === "multiple-choice" ? "Select one or more options" : "Enter your response below"}
                </p>
              </div>

              {question.type === "multiple-choice" && question.options && (
                <div className="space-y-3 mb-8">
                  {question.options.map((option, index) => {
                    const isSelected = selectedAnswers.includes(index);
                    return (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + index * 0.05 }}
                        onClick={() => {
                          setSelectedAnswers(prev => 
                            prev.includes(index) 
                              ? prev.filter(i => i !== index)
                              : [...prev, index]
                          );
                        }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "bg-secondary/30 border-transparent hover:border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: "1rem", fontWeight: 500 }}>
                            {option}
                          </span>
                          <div
                            className={`w-5 h-5 rounded-md border-2 transition-all ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-full h-full flex items-center justify-center"
                              >
                                <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {question.type === "text" && (
                <div className="mb-8">
                  <textarea
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your answer here..."
                    rows={6}
                    className="w-full px-4 py-3.5 bg-secondary/30 border border-border rounded-2xl focus:outline-none focus:border-primary transition-colors resize-none"
                    style={{ fontSize: "1rem" }}
                  />
                </div>
              )}

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handleSubmit}
                disabled={
                  (question.type === "multiple-choice" && selectedAnswers.length === 0) ||
                  (question.type === "text" && !textResponse.trim())
                }
                whileHover={{
                  scale: (question.type === "multiple-choice" && selectedAnswers.length > 0) ||
                         (question.type === "text" && textResponse.trim()) ? 1.02 : 1
                }}
                whileTap={{
                  scale: (question.type === "multiple-choice" && selectedAnswers.length > 0) ||
                         (question.type === "text" && textResponse.trim()) ? 0.98 : 1
                }}
                className={`w-full py-4 px-8 rounded-2xl transition-all shadow-lg ${
                  (question.type === "multiple-choice" && selectedAnswers.length > 0) ||
                  (question.type === "text" && textResponse.trim())
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                    : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                }`}
                style={{ fontSize: "1.0625rem", fontWeight: 500 }}
              >
                Submit Response
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-20 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                className="inline-flex mb-6"
              >
                <div className="relative">
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-primary/40 rounded-full blur-xl"
                  />
                  <CheckCircle2 className="w-20 h-20 text-primary relative" strokeWidth={1.5} />
                </div>
              </motion.div>

              <h2 className="mb-2" style={{ fontSize: "1.75rem", fontWeight: 600 }}>
                Response Received
              </h2>
              <p className="text-muted-foreground" style={{ fontSize: "1.0625rem" }}>
                Thank you for your participation
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
