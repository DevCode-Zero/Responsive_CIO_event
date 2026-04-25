import { motion } from "motion/react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { type Attendee } from "../utils/database";

interface SuccessScreenProps {
  attendee: Attendee;
  onContinue: () => void;
}

export function SuccessScreen({ attendee, onContinue }: SuccessScreenProps) {
  const firstName = attendee.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0c14] via-[#0e1120] to-[#0a0c14] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute inset-0 bg-gradient-to-br from-[#5b8def]/30 via-transparent to-[#10b981]/20"
      />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.2
        }}
        className="relative z-10 mb-8"
      >
        <div className="relative">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-primary/30 rounded-full blur-2xl"
          />
          <CheckCircle2 className="w-24 h-24 text-primary relative z-10" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10 text-center max-w-md"
      >
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-3"
          style={{ fontSize: "2.25rem", fontWeight: 600, lineHeight: 1.2 }}
        >
          Welcome, {firstName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-muted-foreground mb-12"
          style={{ fontSize: "1.125rem", lineHeight: 1.6 }}
        >
          Glad to have you with us today
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="flex items-center justify-center gap-2 mb-10"
        >
          <div className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-primary" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>
              Checked In
            </span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-lg shadow-primary/20"
          style={{ fontSize: "1.0625rem", fontWeight: 500 }}
        >
          View Event Agenda
        </motion.button>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
          className="mt-8 flex items-center justify-center gap-2 text-muted-foreground"
        >
          <Sparkles className="w-4 h-4" />
          <span style={{ fontSize: "0.875rem" }}>
            Exclusive content unlocked
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
