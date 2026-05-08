import { useState, memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  loginWithGoogle, 
  loginWithEmail, 
  checkEmailExists, 
  registerWithEmail, 
  resetPassword 
} from "../../lib/firebase";
import { 
  LogIn, 
  Share2, 
  Copy, 
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
import { useGameStore } from "../../store/useGameStore";

interface LoginProps {
  onLogin: (user: any) => void;
}

type LoginStep = "IDENTIFY" | "SIGN_IN" | "SIGN_UP";

export const Login = memo(({ onLogin }: LoginProps) => {
  const [step, setStep] = useState<LoginStep>("IDENTIFY");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const connected = useGameStore((state) => state.connected);
  const setConnected = useGameStore((state) => state.setConnected);

  // Poll server status
  useEffect(() => {
    let interval: any;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setConnected(true);
        else setConnected(false);
      } catch (e) {
        setConnected(false);
      }
    };
    if (!connected) {
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }
    return () => clearInterval(interval);
  }, [connected, setConnected]);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoggingIn(true);
    setError(null);
    try {
      const exists = await checkEmailExists(email);
      setStep(exists ? "SIGN_IN" : "SIGN_UP");
    } catch (err: any) {
      setError("The Eternal Gate is hesitant. Try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step === "SIGN_UP" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const user = step === "SIGN_IN" 
        ? await loginWithEmail(email, password)
        : await registerWithEmail(email, password);
      onLogin(user);
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      
      // If we tried to sign up but account exists, switch to sign in
      if (err.code === 'auth/email-already-in-use') {
        setStep("SIGN_IN");
        setError("Account already exists. Please enter thy password.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError("Invalid runes. Try again or reset thy password.");
      } else {
        setError(err.message || "The Gate remains closed.");
      }
      setIsLoggingIn(false);
    }
  };

  const handleReset = async () => {
    if (!email) return;
    setIsLoggingIn(true);
    try {
      await resetPassword(email);
      setSuccessMsg("A recovery scroll has been sent to thy mail.");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError("Could not send recovery scroll.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const user = await loginWithGoogle();
      onLogin(user);
    } catch (error) {
      setIsLoggingIn(false);
    }
  };

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#1a1410] text-[#e2d1b0] z-50 p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20"></div>
      <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black opacity-80"></div>
      
      <ParticleEffect />
      
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-6 sm:p-10 bg-[#2d221a] border-2 border-[#4a3a2a] rounded shadow-[0_0_80px_rgba(0,0,0,0.9)] relative overflow-hidden ring-1 ring-[#e2d1b0]/10"
        >
          {/* Status */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20">
            <div className={`px-2 py-0.5 sm:py-1 rounded text-[8px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${
              connected ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            }`}>
              {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {connected ? "Server Online" : "Server Offline"}
            </div>
          </div>

          <div className="text-center relative z-10">
            <div className="flex justify-center mb-4 sm:mb-6">
               <div className="w-8 sm:w-12 h-px bg-[#8b6b4d] self-center opacity-30" />
               <div className="w-2 sm:w-3 h-2 sm:h-3 border border-[#8b6b4d] rotate-45 mx-2 sm:mx-3" />
               <div className="w-8 sm:w-12 h-px bg-[#8b6b4d] self-center opacity-30" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-display font-black text-[#f4e4bc] mb-1 tracking-wider uppercase">Aetheria</h1>
            <p className="text-[#8b6b4d] font-serif italic text-xs sm:text-sm mb-6 sm:mb-10">Chronicles of the Eternal Realm</p>
            
            <AnimatePresence mode="wait">
              {step === "IDENTIFY" ? (
                <motion.form 
                  key="identify"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleIdentify} 
                  className="space-y-6"
                >
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] uppercase tracking-[0.3em] text-[#8b6b4d] font-bold ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6b4d]/50" size={16} />
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@realm.com"
                        required
                        className="w-full bg-black/40 border border-[#4a3a2a] p-4 pl-10 text-[#e2d1b0] focus:border-[#c2a472] outline-hidden transition-all rounded-sm placeholder:text-[#8b6b4d]/20"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn || !connected}
                    className="w-full py-5 bg-[#c2a472] text-[#1a1410] text-sm font-bold tracking-[0.2em] border-t border-l border-[#e6d3af] shadow-lg hover:bg-[#d4b98a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase"
                  >
                    {isLoggingIn ? <RefreshCw className="animate-spin" size={18} /> : "Continue"}
                    {!isLoggingIn && <ChevronRight size={18} />}
                  </button>
                </motion.form>
              ) : (
                <motion.form 
                  key="auth"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleAuth} 
                  className="space-y-5 text-left"
                >
                  <button 
                    type="button" 
                    onClick={() => setStep("IDENTIFY")}
                    className="flex items-center gap-1 text-[10px] text-[#8b6b4d] hover:text-[#c2a472] transition-colors mb-2 uppercase tracking-widest"
                  >
                    <ArrowLeft size={12} /> Back
                  </button>

                  <div className="p-3 bg-black/20 border border-[#4a3a2a]/30 rounded-sm mb-4">
                    <p className="text-[10px] text-[#8b6b4d] uppercase mb-1 opacity-60">Identity Confirmed</p>
                    <p className="text-xs text-[#e2d1b0] font-mono">{email}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest text-[#8b6b4d] font-bold ml-1">
                      {step === "SIGN_IN" ? "Password" : "Create Password"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6b4d]/50" size={16} />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full bg-black/40 border border-[#4a3a2a] p-4 pl-10 text-[#e2d1b0] focus:border-[#c2a472] outline-hidden rounded-sm"
                      />
                    </div>
                  </div>

                  {step === "SIGN_UP" && (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest text-[#8b6b4d] font-bold ml-1">Confirm Password</label>
                      <div className="relative">
                        <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b6b4d]/50" size={16} />
                        <input 
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full bg-black/40 border border-[#4a3a2a] p-4 pl-10 text-[#e2d1b0] focus:border-[#c2a472] outline-hidden rounded-sm"
                        />
                      </div>
                    </div>
                  )}

                  {step === "SIGN_IN" && (
                    <button 
                      type="button" 
                      onClick={handleReset}
                      className="text-[10px] text-[#8b6b4d] hover:text-[#c2a472] underline underline-offset-2 tracking-tighter"
                    >
                      Forgotten password?
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-5 bg-[#c2a472] text-[#1a1410] text-sm font-bold tracking-[0.2em] shadow-lg hover:bg-[#d4b98a] active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase mt-6"
                  >
                    {isLoggingIn ? <RefreshCw className="animate-spin" size={18} /> : (step === "SIGN_IN" ? "Sign In" : "Sign Up")}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {error && <p className="mt-4 text-red-400 text-[10px] font-bold uppercase p-2 bg-red-400/10 border border-red-400/20">{error}</p>}
            {successMsg && <p className="mt-4 text-green-400 text-[10px] font-bold uppercase p-2 bg-green-400/10 border border-green-400/20">{successMsg}</p>}

            <div className="flex items-center gap-4 py-6 opacity-30">
              <div className="h-px bg-[#4a3a2a] flex-1"></div>
              <span className="text-[10px] uppercase tracking-tighter">or</span>
              <div className="h-px bg-[#4a3a2a] flex-1"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-3 border border-[#4a3a2a] text-[#8b6b4d] text-[10px] uppercase tracking-[0.3em] hover:bg-[#c2a472]/5 transition-all flex items-center justify-center gap-2"
            >
              Sign in with Google
            </button>
          </div>
        </motion.div>

        {/* Share */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-4 text-[#8b6b4d]"
        >
          <button onClick={handleShare} className="flex items-center gap-2 text-[10px] uppercase tracking-widest hover:text-[#e2d1b0] transition-colors">
            {copied ? <Check size={14} /> : <Share2 size={14} />}
            {copied ? "Scroll Copied" : "Invite Adventurers"}
          </button>
        </motion.div>
      </div>
    </div>
  );
});

Login.displayName = "Login";
