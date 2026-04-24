import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Calendar, Clock, User, Bell, MessageSquare, Users } from "lucide-react";
import { LiveQuestionPush } from "./LiveQuestionPush";
import { type PushedQuestion } from "../utils/questionEvents";
import { supabase, MEETINGS_CHANNEL, SPEAKER_CHANNEL } from "../utils/supabaseClient";
import { db } from "../utils/database";

interface DashboardScreenProps {
  name: string;
  onQuestionClick: () => void;
  onNotificationClick: () => void;
  pushedQuestion?: PushedQuestion | null;
  showLiveQuestion?: boolean;
  onDismiss?: () => void;
  onAnswer?: () => void;
}

export function DashboardScreen({ name, onQuestionClick, onNotificationClick, pushedQuestion, showLiveQuestion: externalShowLive, onDismiss: externalOnDismiss, onAnswer: externalOnAnswer }: DashboardScreenProps) {
  const firstName = (name || "Guest").split(" ")[0];
  const [internalShowLiveQuestion, setInternalShowLiveQuestion] = useState(false);
  const [internalPushedQuestion, setInternalPushedQuestion] = useState<PushedQuestion | null>(null);
  
  const showLiveQuestion = externalShowLive !== undefined ? externalShowLive : internalShowLiveQuestion;
  const setShowLiveQuestion = externalShowLive !== undefined ? () => {} : setInternalShowLiveQuestion;
  const currentPushedQuestion = pushedQuestion !== undefined ? pushedQuestion : internalPushedQuestion;
  const setCurrentPushedQuestion = pushedQuestion !== undefined ? () => {} : setInternalPushedQuestion;
  const handleDismiss = externalOnDismiss 
    ? () => { setInternalShowLiveQuestion(false); externalOnDismiss(); }
    : () => setInternalShowLiveQuestion(false);
  const handleAnswerNow = externalOnAnswer
    ? () => { setInternalShowLiveQuestion(false); externalOnAnswer(); }
    : () => {
        setInternalShowLiveQuestion(false);
        onQuestionClick();
      };

  const [agenda, setAgenda] = useState<Array<{time: string; title: string; type: string; status: string; description?: string; location?: string}>>([]);
  const [featuredSpeaker, setFeaturedSpeaker] = useState<{name: string; company: string; bio: string} | null>(null);

  useEffect(() => {
    loadAgenda();
    loadFeaturedSpeaker();

    const meetingsChannel = supabase.channel(MEETINGS_CHANNEL);
    meetingsChannel
      .on('broadcast', { event: 'meetings-update' }, () => {
        loadAgenda();
      })
      .subscribe();

    const speakerChannel = supabase.channel(SPEAKER_CHANNEL);
    speakerChannel
      .on('broadcast', { event: 'speaker-update' }, (payload) => {
        if (payload.payload) {
          setFeaturedSpeaker(payload.payload);
        } else {
          loadFeaturedSpeaker();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(speakerChannel);
    };
  }, []);

  const loadFeaturedSpeaker = async () => {
    try {
      const settings = await db.getEventSettings();
      setFeaturedSpeaker({
        name: settings.featured_speaker_name,
        company: settings.featured_speaker_company,
        bio: settings.featured_speaker_bio,
      });
    } catch (err) {
      console.error("Failed to load from DB, trying localStorage:", err);
      const stored = localStorage.getItem("cio_featured_speaker");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setFeaturedSpeaker({
            name: parsed.name || "Dr. Sarah Mitchell",
            company: parsed.company || "CIO, GlobalTech Industries",
            bio: parsed.bio || "Transforming Enterprise Technology",
          });
        } catch {
          setFeaturedSpeaker({
            name: "Dr. Sarah Mitchell",
            company: "CIO, GlobalTech Industries",
            bio: "Transforming Enterprise Technology: Lessons from a Billion-Dollar Journey",
          });
        }
      }
    }
  };

  const getMeetingStatus = (startTime: string, endTime: string | null): "completed" | "current" | "upcoming" => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    
    const [startHour, startMin] = startTime.split(":").map(Number);
    const startDate = new Date(today);
    startDate.setHours(startHour, startMin, 0, 0);
    
    let endDate = null;
    if (endTime) {
      const [endHour, endMin] = endTime.split(":").map(Number);
      endDate = new Date(today);
      endDate.setHours(endHour, endMin, 0, 0);
    }
    
    if (now < startDate) {
      return "upcoming";
    } else if (endDate && now > endDate) {
      return "completed";
    } else {
      return "current";
    }
  };

  const loadAgenda = async () => {
    try {
      const meetings = await db.getMeetings();
      const mapped = meetings.map((m) => ({
        time: m.start_time,
        title: m.title,
        description: m.description || "",
        location: m.location || "",
        type: "session",
        status: getMeetingStatus(m.start_time, m.end_time),
      }));
      setAgenda(mapped.length > 0 ? mapped : [
        { time: "08:00", title: "Registration & Breakfast", description: "Check in and enjoy breakfast", location: "Main Lobby", type: "meal", status: "completed" },
        { time: "09:00", title: "Opening Keynote", description: "Welcome address and keynote speech", location: "Main Hall", type: "session", status: "current" },
        { time: "10:30", title: "AI Strategy Panel", description: "Industry leaders discuss AI implementation", location: "Conference Room A", type: "session", status: "upcoming" },
        { time: "12:00", title: "Networking Lunch", description: "Lunch and networking opportunity", location: "Dining Hall", type: "meal", status: "upcoming" },
      ]);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      setAgenda([
        { time: "08:00", title: "Registration & Breakfast", description: "Check in and enjoy breakfast", location: "Main Lobby", type: "meal", status: "completed" },
        { time: "09:00", title: "Opening Keynote", description: "Welcome address and keynote speech", location: "Main Hall", type: "session", status: "current" },
        { time: "10:30", title: "AI Strategy Panel", description: "Industry leaders discuss AI implementation", location: "Conference Room A", type: "session", status: "upcoming" },
        { time: "12:00", title: "Networking Lunch", description: "Lunch and networking opportunity", location: "Dining Hall", type: "meal", status: "upcoming" },
      ]);
    }
  };

  return (
    <>
      <LiveQuestionPush
        isVisible={showLiveQuestion}
        question={currentPushedQuestion}
        onAnswer={handleAnswerNow}
        onDismiss={handleDismiss}
      />
      <div className="min-h-screen bg-[#0a0c14]">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-[#0a0c14]/80 backdrop-blur-xl border-b border-border"
      >
        <div className="px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm md:text-base font-semibold truncate">{name}</p>
              <div className="flex items-center gap-1 md:gap-1.5">
                <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3 text-primary" />
                <span className="text-muted-foreground text-xs md:text-xs" style={{ fontSize: "0.75rem" }}>
                  Checked In
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onNotificationClick}
            className="relative p-2 md:p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors touch-manipulation"
          >
            <Bell className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 md:top-1.5 md:right-1.5 md:w-2 md:h-2 bg-primary rounded-full" />
          </button>
        </div>
      </motion.div>

      <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="mb-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl" style={{ fontWeight: 600 }}>
            Good morning, {firstName}
          </h1>
          <p className="text-muted-foreground mb-6 md:mb-8 text-sm sm:text-base md:text-lg" style={{ fontSize: "1rem" }}>
            Here's what's happening today
          </p>
        </motion.div>

        {/* Featured Speaker - First */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6 md:mb-8"
        >
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 md:p-6">
            <div className="flex items-start gap-3 md:gap-4">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground mb-1 text-xs md:text-sm" style={{ fontSize: "0.875rem" }}>
                  Featured Speaker
                </p>
                <p className="text-lg md:text-xl font-semibold mb-1 truncate" style={{ fontSize: "1.25rem" }}>
                  {featuredSpeaker?.name || "Dr. Sarah Mitchell"}
                </p>
                <p className="text-muted-foreground mb-2 md:mb-3 text-sm md:text-base" style={{ fontSize: "0.9375rem" }}>
                  {featuredSpeaker?.company || "CIO, GlobalTech Industries"}
                </p>
                <p className="text-foreground/80 text-sm md:text-base" style={{ fontSize: "0.9375rem", lineHeight: 1.6 }}>
                  "{featuredSpeaker?.bio || "Transforming Enterprise Technology: Lessons from a Billion-Dollar Journey"}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Today's Agenda - Second */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 md:mb-8"
        >
          <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg md:text-xl" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Today's Agenda
          </h2>

          <div className="space-y-3">
            {agenda.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className={`relative pl-6 md:pl-8 pb-3 ${
                  index !== agenda.length - 1 ? "border-l-2" : ""
                } ${
                  item.status === "completed"
                    ? "border-primary/30"
                    : item.status === "current"
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                <div
                  className={`absolute left-0 -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 ${
                    item.status === "completed"
                      ? "bg-primary border-primary"
                      : item.status === "current"
                      ? "bg-primary border-primary animate-pulse"
                      : "bg-[#0a0c14] border-border"
                  }`}
                />

                <div
                  className={`rounded-xl p-3 md:p-4 transition-all ${
                    item.status === "current"
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-secondary/30 border border-transparent hover:border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 md:gap-3 mb-1 md:mb-2">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <Clock className="w-3.5 h-4 md:w-4 md:h-4 text-muted-foreground" />
                      <span
                        className={item.status === "current" ? "text-primary" : "text-muted-foreground"}
                        style={{ fontSize: "0.875rem", fontWeight: 500 }}
                      >
                        {item.time}
                      </span>
                    </div>
                    {item.status === "current" && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-md text-xs md:text-sm" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                        Now
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm md:text-base font-medium md:font-semibold ${item.status === "completed" ? "text-muted-foreground" : ""}`}
                    style={{ fontSize: "1rem" }}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-muted-foreground mt-1 text-sm md:text-base" style={{ fontSize: "0.875rem" }}>
                      {item.description}
                    </p>
                  )}
                  {item.location && (
                    <p className="text-primary/70 mt-1 text-xs md:text-sm" style={{ fontSize: "0.75rem" }}>
                      📍 {item.location}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Engage - Third */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="mb-3 sm:mb-4 flex items-center gap-2 text-base sm:text-lg md:text-xl" style={{ fontSize: "1.25rem", fontWeight: 600 }}>
            <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            Engage
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onQuestionClick}
              className="w-full p-4 sm:p-5 bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/30 rounded-2xl transition-all text-left group touch-manipulation"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium mb-1" style={{ fontSize: "1rem" }}>
                    Live Q&A
                  </p>
                  <p className="text-muted-foreground text-xs sm:text-sm" style={{ fontSize: "0.875rem" }}>
                    Participate in real-time discussions
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors flex-shrink-0">
                  <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
              </div>
            </button>

            <div className="p-4 sm:p-5 bg-secondary/30 border border-border rounded-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium mb-1 text-muted-foreground" style={{ fontSize: "1rem" }}>
                    Networking Lounge
                  </p>
                  <p className="text-muted-foreground text-xs sm:text-sm" style={{ fontSize: "0.875rem" }}>
                    Available during lunch
                  </p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
    </>
  );
}