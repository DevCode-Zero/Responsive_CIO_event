import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, MessageSquare } from "lucide-react";
import { type PushedQuestion } from "../utils/questionEvents";
import { db } from "../utils/database";
import { type Attendee } from "../utils/database";

interface QuestionScreenProps {
  onBack: () => void;
  specificQuestionId?: string;
}

export function QuestionScreen({ onBack, specificQuestionId }: QuestionScreenProps) {
  const [questions, setQuestions] = useState<PushedQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAttendee = localStorage.getItem("checkedInAttendee");
    if (storedAttendee) {
      try {
        setAttendee(JSON.parse(storedAttendee));
      } catch {
        onBack();
      }
    }
  }, [onBack]);

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const dbQuestions = await db.getQuestions();
        let sentQuestions = dbQuestions
          .filter(q => q.status === "sent" || q.status === "completed")
          .map((q) => ({
            id: q.id,
            text: q.text,
            type: q.type as "multiple-choice" | "text",
            options: q.options || [],
            timestamp: new Date(q.sent_at || q.created_at).getTime(),
          }));
        
        if (specificQuestionId) {
          sentQuestions = sentQuestions.filter(q => q.id === specificQuestionId);
        }
        
        setQuestions(sentQuestions);
      } catch (err) {
        console.error("Failed to load questions:", err);
      }
      setLoading(false);
    };

    loadQuestions();
  }, [specificQuestionId]);

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        onBack();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted, onBack]);

  const handleAnswerSelect = (questionId: string | number, answer: number | string) => {
    if (typeof answer === "number") {
      setAnswers(prev => {
        const current = prev[questionId];
        if (Array.isArray(current)) {
          if (current.includes(answer)) {
            return { ...prev, [questionId]: current.filter(i => i !== answer) };
          } else {
            return { ...prev, [questionId]: [...current, answer] };
          }
        }
        return { ...prev, [questionId]: [answer] };
      });
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: answer }));
    }
  };

  const handleSubmitAll = async () => {
    if (!attendee) return;

    setSubmitted(true);

    for (const question of questions) {
      const answer = answers[question.id];
      if (answer !== undefined && answer.length > 0) {
        try {
          if (question.type === "multiple-choice") {
            const selectedOptions = Array.isArray(answer) ? answer : [answer];
            for (const optionIndex of selectedOptions) {
              await db.addResponse(question.id, attendee.id, optionIndex as number, undefined, attendee.name, true);
            }
          } else {
            await db.addResponse(question.id, attendee.id, undefined, answer as string, attendee.name);
          }
        } catch (err) {
          console.error("Failed to save response:", err);
        }
      }
    }

  };

  const allAnswered = questions.every(q => {
    const answer = answers[q.id];
    return answer !== undefined && (Array.isArray(answer) ? answer.length > 0 : answer !== "");
  });
  const answeredCount = questions.filter(q => {
    const answer = answers[q.id];
    return answer !== undefined && (Array.isArray(answer) ? answer.length > 0 : answer !== "");
  }).length;

  if (loading || !attendee) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 600 }} className="mb-3">
            Response Received
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
            Thank you for your participation!
          </p>
        </motion.div>
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
        <div className="px-3 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-4">
          <button
            onClick={onBack}
            className="p-1.5 md:p-2 rounded-lg md:rounded-xl hover:bg-secondary transition-colors touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <h2 className="text-base md:text-lg font-semibold" style={{ fontSize: "1.125rem", fontWeight: 600 }}>All Questions</h2>
          <span className="ml-auto text-muted-foreground text-xs md:text-sm" style={{ fontSize: "0.875rem" }}>
            {answeredCount} / {questions.length} answered
          </span>
        </div>
      </motion.div>

      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 pb-28 md:pb-32 max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h1 className="mb-2 text-lg sm:text-xl md:text-2xl" style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Answer All Questions
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base" style={{ fontSize: "0.9375rem" }}>
            Please answer all questions below and submit at the end
          </p>
        </div>

        <div className="space-y-4 sm:space-y-5 md:space-y-6">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl"
            >
              <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-xs md:text-sm font-semibold">{index + 1}</span>
                </div>
                <p className="text-sm md:text-base font-medium" style={{ fontSize: "1rem" }}>
                  {question.text}
                </p>
              </div>

              {question.type === "multiple-choice" && question.options && (
                <div className="space-y-2 ml-8 md:ml-11">
                  {question.options.map((option, optIndex) => {
                    const isSelected = Array.isArray(answers[question.id]) && answers[question.id].includes(optIndex);
                    return (
                      <button
                        key={optIndex}
                        onClick={() => handleAnswerSelect(question.id, optIndex)}
                        className={`w-full p-3 md:p-4 rounded-xl border-2 transition-all text-left touch-manipulation ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : "bg-transparent border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className={`w-4 h-4 md:w-5 md:h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground"
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm md:text-base">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {question.type === "text" && (
                <div className="ml-8 md:ml-11">
                  <textarea
                    value={(answers[question.id] as string) || ""}
                    onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                    placeholder="Enter your response..."
                    className="w-full p-3 md:p-4 bg-transparent border border-border rounded-xl focus:outline-none focus:border-primary resize-none text-sm md:text-base"
                    rows={3}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {questions.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 md:p-4 bg-[#0a0c14]/80 backdrop-blur-xl border-t border-border">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={handleSubmitAll}
                disabled={!allAnswered || submitted}
                className={`w-full py-3 sm:py-4 rounded-xl font-semibold transition-all touch-manipulation ${
                  allAnswered && !submitted
                    ? "bg-primary hover:bg-primary/90 text-white"
                    : "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                }`}
                style={{ fontSize: "0.9375rem md:text-1rem" }}
              >
                {allAnswered ? "Submit All Answers" : `Answer ${questions.length - answeredCount} more question${questions.length - answeredCount > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
