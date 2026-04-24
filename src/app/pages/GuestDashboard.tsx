import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { DashboardScreen } from "../components/DashboardScreen";
import { db } from "../utils/database";
import { type Attendee } from "../utils/database";
import { supabase, REALTIME_CHANNEL, PRESENCE_CHANNEL } from "../utils/supabaseClient";

interface PushedQuestion {
  id: string | number;
  text: string;
  type: "multiple-choice" | "text";
  options?: string[];
  timestamp: number;
}

export function GuestDashboard() {
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPushedQuestion, setCurrentPushedQuestion] = useState<PushedQuestion | null>(null);
  const [showLiveQuestion, setShowLiveQuestion] = useState(false);
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const answeredQuestionsRef = useRef<(string | number)[]>([]);

  useEffect(() => {
    const loadAttendee = async () => {
      const storedAttendee = localStorage.getItem("checkedInAttendee");
      if (storedAttendee) {
        try {
          const parsed = JSON.parse(storedAttendee) as Attendee;
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
    console.log("[GuestDashboard] Setting up persistent question channel...");

    channelRef.current = supabase.channel(REALTIME_CHANNEL);

    channelRef.current
      .on('broadcast', { event: 'question-push' }, (payload) => {
        console.log("[GuestDashboard] Received question push:", payload.payload);
        const question = payload.payload as PushedQuestion;

        if (!answeredQuestionsRef.current.includes(question.id)) {
          setCurrentPushedQuestion(question);
          setShowLiveQuestion(true);

          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
          }
        }
      })
      .subscribe((status) => {
        console.log("[GuestDashboard] Channel status:", status);
      });

    return () => {
      console.log("[GuestDashboard] Cleaning up channel");
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!attendee) return;

    const presenceChannel = supabase.channel(PRESENCE_CHANNEL);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        console.log("[GuestDashboard] Presence synced");
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: attendee.id,
            user_name: attendee.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [attendee]);

  const handleQuestionClick = () => {
    if (currentPushedQuestion) {
      answeredQuestionsRef.current.push(currentPushedQuestion.id);
    }
    navigate("/question");
  };

  const handleDismiss = () => {
    if (currentPushedQuestion) {
      answeredQuestionsRef.current.push(currentPushedQuestion.id);
    }
    setShowLiveQuestion(false);
  };

  const handleNotificationClick = () => {
    // Trigger notification modal logic
  };

  const handleViewQuestion = () => {
    if (currentPushedQuestion) {
      answeredQuestionsRef.current.push(currentPushedQuestion.id);
    }
    navigate("/question");
  };

  if (loading || !attendee) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="size-full">
      <DashboardScreen
        name={attendee.name}
        onQuestionClick={handleQuestionClick}
        onNotificationClick={handleNotificationClick}
        pushedQuestion={currentPushedQuestion}
        showLiveQuestion={showLiveQuestion}
        onDismiss={handleDismiss}
        onAnswer={() => {
          if (currentPushedQuestion) {
            answeredQuestionsRef.current.push(currentPushedQuestion.id);
          }
          navigate("/question");
        }}
      />
    </div>
  );
}
