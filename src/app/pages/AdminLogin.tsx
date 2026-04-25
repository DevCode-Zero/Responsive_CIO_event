import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ShieldCheck, Lock, Mail } from "lucide-react";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (email === "admin@company.com" && password === "admin123") {
      navigate("/admin/dashboard");
    } else {
      setError("Invalid credentials");
      setTimeout(() => setError(""), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0c14] via-[#0e1120] to-[#0a0c14] flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 flex justify-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5b8def] to-[#4a7ad8] flex items-center justify-center shadow-lg shadow-[#5b8def]/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          <h1 className="mb-2" style={{ fontSize: "1.875rem", fontWeight: 600 }}>
            Admin Portal
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "1rem" }}>
            CIO Leadership Summit
          </p>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleLogin}
          className="space-y-4"
        >
          <div>
            <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-foreground" style={{ fontSize: "0.9375rem" }}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-12 pr-4 py-3.5 bg-secondary border border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl"
            >
              <p className="text-destructive text-center" style={{ fontSize: "0.875rem" }}>
                {error}
              </p>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all shadow-lg shadow-primary/20"
            style={{ fontSize: "1.0625rem", fontWeight: 500 }}
          >
            Sign In
          </motion.button>

          <p className="text-center text-muted-foreground mt-6" style={{ fontSize: "0.875rem" }}>
            Demo credentials: admin@company.com / admin123
          </p>
        </motion.form>
      </motion.div>
    </div>
  );
}
