import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

  // Sign In state
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Sign Up state
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn({
        email: signInEmail,
        password: signInPassword,
      });

      if (authError) {
        setError(authError.message || "Failed to sign in");
        return;
      }

      if (data) {
        navigate("/roms");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signUp({
        email: signUpEmail,
        password: signUpPassword,
        name: signUpName,
      });

      if (authError) {
        setError(authError.message || "Failed to sign up");
        return;
      }

      if (data) {
        navigate("/roms");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.4, 0.2],
            x: ["-50%", "-40%", "-50%"],
            y: ["-50%", "-60%", "-50%"],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </div>

      <motion.div
        className="relative w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="inline-block mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.3,
            }}
          >
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-4 py-1 text-sm font-mono uppercase tracking-wider">
              🎮 Cloud Gaming
            </Badge>
          </motion.div>
          <motion.h1
            className="text-5xl md:text-6xl font-black mb-4 tracking-tight"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <motion.span
              className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)] inline-block"
              animate={{
                textShadow: [
                  "0 0 20px rgba(6, 182, 212, 0.5)",
                  "0 0 40px rgba(168, 85, 247, 0.5)",
                  "0 0 20px rgba(6, 182, 212, 0.5)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              PLAYER
            </motion.span>
            <br />
            <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              LOGIN
            </span>
          </motion.h1>
          <motion.p
            className="text-slate-400 text-lg font-medium tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            Insert coin to continue...
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.25)",
          }}
        >
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-700/50">
            <motion.button
              onClick={() => {
                setActiveTab("signin");
                setError(null);
              }}
              className={`py-4 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-300 relative ${
                activeTab === "signin"
                  ? "bg-linear-to-r from-cyan-500/20 to-purple-500/20 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🔑 Sign In
              {activeTab === "signin" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button
              onClick={() => {
                setActiveTab("signup");
                setError(null);
              }}
              className={`py-4 px-6 font-bold text-sm uppercase tracking-wider transition-all duration-300 relative ${
                activeTab === "signup"
                  ? "bg-linear-to-r from-cyan-500/20 to-purple-500/20 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ✨ Sign Up
              {activeTab === "signup" && (
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"
                  layoutId="activeTab"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                className="mx-6 mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    ⚠️
                  </motion.span>{" "}
                  {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign In Form */}
          <AnimatePresence mode="wait">
            {activeTab === "signin" && (
              <motion.form
                key="signin"
                onSubmit={handleSignIn}
                className="p-6 space-y-5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label
                    htmlFor="signin-email"
                    className="text-slate-300 font-medium flex items-center gap-2"
                  >
                    <span>📧</span> Email
                  </Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="player@game.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 h-12 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label
                    htmlFor="signin-password"
                    className="text-slate-300 font-medium flex items-center gap-2"
                  >
                    <span>🔒</span> Password
                  </Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20 text-white placeholder:text-slate-500 h-12 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-linear-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          ⏳
                        </motion.span>{" "}
                        Loading...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        🎮 START GAME
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
              <motion.form
                key="signup"
                onSubmit={handleSignUp}
                className="p-6 space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Label
                    htmlFor="signup-name"
                    className="text-slate-300 font-medium flex items-center gap-2"
                  >
                    <span>👤</span> Player Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-slate-800/50 border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-slate-500 h-12 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Label
                    htmlFor="signup-email"
                    className="text-slate-300 font-medium flex items-center gap-2"
                  >
                    <span>📧</span> Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="player@game.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-slate-800/50 border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-slate-500 h-12 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Label
                    htmlFor="signup-password"
                    className="text-slate-300 font-medium flex items-center gap-2"
                  >
                    <span>🔒</span> Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="bg-slate-800/50 border-slate-700 focus:border-purple-500 focus:ring-purple-500/20 text-white placeholder:text-slate-500 h-12 rounded-xl"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold text-lg rounded-xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          ⏳
                        </motion.span>{" "}
                        Creating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        ✨ CREATE PLAYER
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <motion.div
            className="px-6 pb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-slate-500 text-sm">
              {activeTab === "signin" ? (
                <>
                  New player?{" "}
                  <motion.button
                    onClick={() => {
                      setActiveTab("signup");
                      setError(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Create account
                  </motion.button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <motion.button
                    onClick={() => {
                      setActiveTab("signin");
                      setError(null);
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign in
                  </motion.button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>

        {/* Credits */}
        <motion.div
          className="text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-slate-600 text-xs font-mono">
            © 2025 CLOUD GAMING • ALL RIGHTS RESERVED
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
