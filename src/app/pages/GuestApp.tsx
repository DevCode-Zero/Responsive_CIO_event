import { useState, useEffect } from "react";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { CameraScreen } from "../components/CameraScreen";
import { SuccessScreen } from "../components/SuccessScreen";
import { DashboardScreen } from "../components/DashboardScreen";
import { QuestionScreen } from "../components/QuestionScreen";
import { NotificationModal } from "../components/NotificationModal";
import { type Attendee } from "../utils/database";
import { supabase, PRESENCE_CHANNEL, REALTIME_CHANNEL } from "../utils/supabaseClient";
import { type PushedQuestion, subscribeToQuestionPush } from "../utils/questionEvents";

type Screen = "welcome" | "camera" | "success" | "dashboard" | "question";

export function GuestApp() {

  const [currentScreen, setCurrentScreen] = useState<Screen>("welcome");

  const [attendee, setAttendee] = useState<Attendee | null>(() => {
    const saved = localStorage.getItem("checkedInAttendee");
    return saved ? JSON.parse(saved) : null;
  });

  const [showNotifications, setShowNotifications] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [pushedQuestion, setPushedQuestion] = useState<PushedQuestion | null>(null);
  const [showLiveQuestion, setShowLiveQuestion] = useState(false);

  // Listen for pushed questions via Realtime broadcast
  useEffect(() => {
    const channel = supabase.channel(REALTIME_CHANNEL);
    channel
      .on('broadcast', { event: 'question-push' }, (payload) => {
        console.log("[GuestApp] Question pushed:", payload.payload);
        setPushedQuestion(payload.payload as PushedQuestion);
        setShowLiveQuestion(true);
      })
      .subscribe((status, err) => {
        console.log("[GuestApp] Realtime channel status:", status, err);
      });

    // Also listen via localstorage/customevent (fallback)
    const unsubscribe = subscribeToQuestionPush((question) => {
      console.log("[GuestApp] Question pushed (local):", question);
      setPushedQuestion(question);
      setShowLiveQuestion(true);
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribe();
    };
  }, []);

  const handleDismissQuestion = () => {
    setShowLiveQuestion(false);
  };

  const handleAnswerQuestion = () => {
    setShowLiveQuestion(false);
    if (pushedQuestion?.id) {
      setAnsweringQuestionId(pushedQuestion.id);
    }
    setCurrentScreen("question");
  };

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Track presence when checked in - use just the name
  useEffect(() => {
    if (!attendee?.name) return;

    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: {
        presence: { key: attendee.name }
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      console.log("[GuestApp] Presence sync:", channel.presenceState());
    });

    channel.subscribe((status, err) => {
      console.log("[GuestApp] Subscription status:", status, err);
      if (status === 'SUBSCRIBED') {
        channel.track({ 
          user_id: attendee.name,
          online_at: new Date().toISOString(),
        }).then(() => console.log("[GuestApp] Tracked:", attendee.name))
          .catch(e => console.error("[GuestApp] Track error:", e));
        
        // Force sync faster
        setTimeout(() => {
          channel.track({ user_id: attendee.name });
        }, 1000);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [attendee?.name]);

  const handleCheckIn = () => {
    setCurrentScreen("camera");
  };

  const handleAuthSuccess = (att: Attendee) => {
    setAttendee(att);
    localStorage.setItem("checkedInAttendee", JSON.stringify(att));

    // ✅ go to success screen first
    setCurrentScreen("success");
  };

  const handleContinueToDashboard = () => {
    // ✅ only here go to dashboard
    setCurrentScreen("dashboard");
  };

  const handleQuestionClick = () => {
    setCurrentScreen("question");
  };

  const handleBackToDashboard = () => {
    setAnsweringQuestionId(null);
    setCurrentScreen("dashboard");
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
  };

  const handleViewQuestion = () => {
    setShowNotifications(false);
    setCurrentScreen("question");
  };

  return (
    <div className="size-full">

      {currentScreen === "welcome" && (
        <WelcomeScreen onCheckIn={handleCheckIn} />
      )}

      {currentScreen === "camera" && (
        <CameraScreen onSuccess={handleAuthSuccess} />
      )}

      {currentScreen === "success" && attendee && (
        <SuccessScreen
          attendee={attendee}
          onContinue={handleContinueToDashboard}
        />
      )}

      {currentScreen === "dashboard" && (
        <DashboardScreen
          name={attendee?.name || "Guest"}
          onQuestionClick={handleQuestionClick}
          onNotificationClick={handleNotificationClick}
          pushedQuestion={pushedQuestion}
          showLiveQuestion={showLiveQuestion}
          onDismiss={handleDismissQuestion}
          onAnswer={handleAnswerQuestion}
        />
      )}

      {currentScreen === "question" && (
        <QuestionScreen onBack={handleBackToDashboard} specificQuestionId={answeringQuestionId || undefined} />
      )}

      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewQuestion={handleViewQuestion}
      />

    </div>
  );
}