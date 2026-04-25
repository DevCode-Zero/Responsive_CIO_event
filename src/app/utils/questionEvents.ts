// Simple event system for simulating real-time question push notifications

export interface PushedQuestion {
  id: number;
  text: string;
  type: "multiple-choice" | "text";
  options?: string[];
  timestamp: number;
}

const STORAGE_KEY = "cio_summit_pushed_question";
const CUSTOM_EVENT_NAME = "question-pushed";

export const pushQuestion = (question: PushedQuestion) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(question));

  // Dispatch custom event for same-window detection
  const customEvent = new CustomEvent(CUSTOM_EVENT_NAME, {
    detail: question
  });
  window.dispatchEvent(customEvent);

  // Also trigger storage event for cross-tab detection
  window.dispatchEvent(new StorageEvent("storage", {
    key: STORAGE_KEY,
    newValue: JSON.stringify(question),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const clearPushedQuestion = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getPushedQuestion = (): PushedQuestion | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const subscribeToQuestionPush = (callback: (question: PushedQuestion) => void) => {
  // Handle custom event (same window)
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<PushedQuestion>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  // Handle storage event (cross-tab)
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const question = getPushedQuestion();
      if (question) {
        callback(question);
      }
    }
  };

  window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
  window.addEventListener("storage", handleStorageChange);

  // Check if there's already a pushed question
  const existing = getPushedQuestion();
  if (existing) {
    // Only show if it's recent (within last 30 seconds)
    const isRecent = Date.now() - existing.timestamp < 30000;
    if (isRecent) {
      callback(existing);
    }
  }

  return () => {
    window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
    window.removeEventListener("storage", handleStorageChange);
  };
};
