import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

interface WelcomeScreenProps {
  onCheckIn: () => void;
}

export function WelcomeScreen({ onCheckIn }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0c14] via-[#0e1120] to-[#0a0c14] flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 bg-gradient-to-br from-[#5b8def]/20 via-transparent to-[#8b5cf6]/10"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8 flex justify-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5b8def] to-[#4a7ad8] flex items-center justify-center shadow-lg shadow-[#5b8def]/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-3 tracking-tight"
          style={{ fontSize: "2rem", fontWeight: 600, lineHeight: 1.2 }}
        >
          CIO Leadership Summit
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-muted-foreground mb-12"
          style={{ fontSize: "1.0625rem", lineHeight: 1.6 }}
        >
          Welcome to an exclusive gathering of technology leaders
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCheckIn}
          className="w-full py-4 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl transition-all shadow-lg shadow-primary/20"
          style={{ fontSize: "1.0625rem", fontWeight: 500 }}
        >
          Check In
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-6 text-muted-foreground flex items-center justify-center gap-2"
          style={{ fontSize: "0.875rem" }}
        >
          <ShieldCheck className="w-4 h-4" />
          Secure, contactless entry
        </motion.p>
      </motion.div>
    </div>
  );
}
