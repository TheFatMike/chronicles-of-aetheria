/**
 * @file src/components/UI/Login.tsx
 * @description The primary authentication interface for the game.
 * Supports social login (Google) and traditional email/password credentials.
 * @importance Critical: The entry point for all users, ensuring secure access to their game accounts.
 */
import { useState, memo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  loginWithEmail,
  checkEmailExists,
  registerWithEmail,
  resetPassword
} from "../../lib/firebase";
import {
  LogIn,
  Share2,
  Check,
  Wifi,
  WifiOff,
  ChevronRight,
  ArrowLeft,
  Mail,
  Lock,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { ParticleEffect } from "./Particles";
import { useServerStatus } from "../../hooks/useServerStatus";

interface LoginProps {
  onLogin: (user: any) => void;
}

type LoginStep = "IDENTIFY" | "SIGN_IN" | "SIGN_UP";

/**
 * Shared Form Field component to reduce JSX clutter
 */
const FormField = ({ label, icon: Icon, type, value, onChange, placeholder, required = true }: any) => (
  <div className="space-y-2 text-left">
    <label className="text-[10px] uppercase tracking-[0.3em] text-aetheria-600 font-bold ml-1">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-aetheria-600/50" size={16} />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-black/40 border border-aetheria-800 p-4 pl-12 text-aetheria-200 focus:border-aetheria-400 outline-hidden transition-all rounded-sm placeholder:text-aetheria-600/20"
      />
    </div>
  </div>
);

/**
 * Shared Action Button component
 */
const ActionButton = ({ children, onClick, loading, disabled, icon: Icon, type = "submit" }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading || disabled}
    className="w-full py-5 bg-aetheria-400 text-aetheria-950 text-sm font-black tracking-[0.2em] border-t border-l border-aetheria-200/30 shadow-aetheria-lg hover:bg-aetheria-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase mt-4"
  >
    {loading ? <RefreshCw className="animate-spin" size={18} /> : (
      <>
        {children}
        {Icon && <Icon size={18} />}
      </>
    )}
  </button>
);

export const Login = memo(({ onLogin }: LoginProps) => {
  const [step, setStep] = useState<LoginStep>("IDENTIFY");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isBusy, setIsBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const connected = useServerStatus();

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsBusy(true);
    setError(null);
    try {
      const exists = await checkEmailExists(email);
      setStep(exists ? "SIGN_IN" : "SIGN_UP");
    } catch (err) {
      setError("The Eternal Gate is hesitant. Try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === "SIGN_UP" && password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    setIsBusy(true);
    try {
      const user = step === "SIGN_IN"
        ? await loginWithEmail(email, password)
        : await registerWithEmail(email, password);
      onLogin(user);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setStep("SIGN_IN");
        setError("Account already exists. Please enter thy password.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid runes. Try again or reset thy password.");
      } else {
        setError(err.message || "The Gate remains closed.");
      }
      setIsBusy(false);
    }
  };

  const handleReset = async () => {
    if (!email) return;
    setIsBusy(true);
    try {
      await resetPassword(email);
      setSuccessMsg("A recovery scroll has been sent to thy mail.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError("Could not send recovery scroll.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-aetheria-950">
      {/* Background Textures */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black opacity-80 pointer-events-none" />

      <ParticleEffect />

      <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
        <div className="flex flex-col items-center justify-center min-h-full p-6 py-12 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-6 sm:p-10 bg-aetheria-900 border-2 border-aetheria-800 rounded shadow-aetheria-lg relative overflow-hidden ring-1 ring-aetheria-200/10"
          >
            {/* Server Status Badge */}
            <div className="absolute top-4 right-4 z-20">
              <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${connected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                }`}>
                {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {connected ? "Server Online" : "Server Offline"}
              </div>
            </div>

            <div className="text-center relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-px bg-aetheria-600 self-center opacity-30" />
                <div className="w-3 h-3 border border-aetheria-600 rotate-45 mx-3" />
                <div className="w-12 h-px bg-aetheria-600 self-center opacity-30" />
              </div>

              <h1 className="text-4xl font-display font-black text-aetheria-200 mb-1 tracking-wider uppercase">Aetheria</h1>
              <p className="text-aetheria-600 font-serif italic text-sm mb-10">Chronicles of the Eternal Realm</p>

              <AnimatePresence mode="wait">
                {step === "IDENTIFY" ? (
                  <motion.form
                    key="identify"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleIdentify}
                    className="space-y-6"
                  >
                    <FormField
                      label="Email Address"
                      icon={Mail}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="name@realm.com"
                    />

                    <ActionButton loading={isBusy} disabled={!connected} icon={ChevronRight}>
                      Continue
                    </ActionButton>
                  </motion.form>
                ) : (
                  <motion.form
                    key="auth"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    onSubmit={handleAuth}
                    className="space-y-5 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => setStep("IDENTIFY")}
                      className="flex items-center gap-1 text-[10px] text-aetheria-600 hover:text-aetheria-400 transition-colors mb-2 uppercase tracking-widest"
                    >
                      <ArrowLeft size={12} /> Back
                    </button>

                    <div className="p-3 bg-black/20 border border-aetheria-800/30 rounded-sm mb-4">
                      <p className="text-[10px] text-aetheria-600 uppercase mb-0.5 opacity-60 font-bold">Identity Confirmed</p>
                      <p className="text-xs text-[#e2d1b0] font-mono truncate">{email}</p>
                    </div>

                    <FormField
                      label={step === "SIGN_IN" ? "Password" : "Create Password"}
                      icon={Lock}
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="••••••••"
                    />

                    {step === "SIGN_UP" && (
                      <FormField
                        label="Confirm Password"
                        icon={UserPlus}
                        type="password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        placeholder="••••••••"
                      />
                    )}

                    {step === "SIGN_IN" && (
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-[10px] text-aetheria-600 hover:text-aetheria-400 underline underline-offset-2 tracking-widest font-bold uppercase"
                      >
                        Forgotten password?
                      </button>
                    )}

                    <ActionButton loading={isBusy}>
                      {step === "SIGN_IN" ? "Sign In" : "Sign Up"}
                    </ActionButton>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Status Messages */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-red-400 text-[10px] font-bold uppercase p-3 bg-red-400/10 border border-red-400/20"
                  >
                    {error}
                  </motion.p>
                )}
                {successMsg && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-green-400 text-[10px] font-bold uppercase p-3 bg-green-400/10 border border-green-400/20"
                  >
                    {successMsg}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Footer Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 flex items-center gap-6 text-aetheria-600"
          >
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-[10px] uppercase tracking-widest hover:text-[#e2d1b0] transition-all group"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Share2 size={14} className="group-hover:scale-110 transition-transform" />}
              <span>{copied ? "Scroll Copied" : "Invite Adventurers"}</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
});

Login.displayName = "Login";

