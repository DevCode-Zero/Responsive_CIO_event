import { motion, AnimatePresence } from "motion/react";
import { X, Bell, MessageSquare } from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewQuestion: () => void;
}

export function NotificationModal({ isOpen, onClose, onViewQuestion }: NotificationModalProps) {
  const notifications = [
    {
      id: 1,
      type: "question",
      title: "New Question Available",
      message: "The host has shared a new poll for attendees",
      time: "Just now",
      unread: true,
    },
    {
      id: 2,
      type: "update",
      title: "Session Starting Soon",
      message: "Opening Keynote begins in 5 minutes",
      time: "5m ago",
      unread: true,
    },
    {
      id: 3,
      type: "info",
      title: "Welcome to the Summit",
      message: "Thank you for joining us today",
      time: "30m ago",
      unread: false,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-20 bottom-auto max-w-lg mx-auto bg-card border border-border rounded-3xl overflow-hidden z-50 shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h3 style={{ fontSize: "1.125rem", fontWeight: 600 }}>Notifications</h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    if (notification.type === "question") {
                      onViewQuestion();
                    }
                  }}
                  className={`px-6 py-4 border-b border-border last:border-b-0 transition-colors ${
                    notification.type === "question"
                      ? "hover:bg-primary/5 cursor-pointer"
                      : "hover:bg-secondary/30"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        notification.type === "question"
                          ? "bg-primary/10"
                          : "bg-secondary"
                      }`}
                    >
                      {notification.type === "question" ? (
                        <MessageSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Bell className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                          {notification.title}
                        </p>
                        {notification.unread && (
                          <span className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1.5" />
                        )}
                      </div>
                      <p className="text-muted-foreground mb-1" style={{ fontSize: "0.875rem" }}>
                        {notification.message}
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-border bg-secondary/20">
              <button
                onClick={onClose}
                className="w-full text-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontSize: "0.875rem", fontWeight: 500 }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
