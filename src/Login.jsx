import { useState } from "react";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Wallet, Lock, Mail, AlertCircle, ArrowRight, Sparkles } from "lucide-react";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#030712", color: "#f8fafc", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      
      {/* --- CSS Animations --- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }

        .input-field { transition: all 0.3s ease; }
        .input-field:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }
        
        .btn-primary { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
          background: #4f46e5 !important;
        }
        
        .btn-google { transition: all 0.3s ease; }
        .btn-google:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05) !important;
          transform: translateY(-2px);
        }

        .toggle-link { transition: color 0.2s ease; }
        .toggle-link:hover { color: #818cf8 !important; }
      `}</style>

      {/* --- Animated Ambient Background Orbs --- */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "100%", height: "100%", overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "20%", left: "30%", width: "400px", height: "400px", background: "rgba(99, 102, 241, 0.3)", borderRadius: "50%", filter: "blur(100px)", animation: "blob 10s infinite alternate" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "30%", width: "350px", height: "350px", background: "rgba(168, 85, 247, 0.2)", borderRadius: "50%", filter: "blur(100px)", animation: "blob 12s infinite alternate-reverse" }} />
      </div>

      {/* --- Glassmorphism Login Card --- */}
      <div className="animate-fade-in" style={{ position: "relative", zIndex: 1, background: "rgba(17, 24, 39, 0.6)", backdropFilter: "blur(20px)", padding: "48px 40px", borderRadius: "24px", width: "100%", maxWidth: "420px", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
        
        {/* Header */}
        <div className="animate-fade-in delay-100" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          <div style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)", borderRadius: "16px", padding: "14px", marginBottom: "20px", boxShadow: "0 10px 20px -5px rgba(99, 102, 241, 0.4)" }}>
            <Wallet size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, letterSpacing: "-0.5px" }}>FinTracker Pro</h1>
          <p style={{ color: "#94a3b8", fontSize: "15px", marginTop: "10px", textAlign: "center" }}>
            {isLogin ? "Welcome back! Enter your details." : "Join us to master your finances."}
          </p>
        </div>

        {error && (
          <div className="animate-fade-in" style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.2)", color: "#f43f5e", padding: "14px", borderRadius: "12px", fontSize: "13px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", fontWeight: "500" }}>
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {/* Google Sign-In */}
        <div className="animate-fade-in delay-200">
          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-google"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", background: "rgba(255, 255, 255, 0.03)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px", fontSize: "14px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", marginBottom: "24px", opacity: loading ? 0.7 : 1 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        <div className="animate-fade-in delay-200" style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1))" }}></div>
          <span style={{ padding: "0 16px", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", letterSpacing: "1px" }}>or email</span>
          <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)" }}></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="animate-fade-in delay-300">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={18} color="#64748b" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="input-field"
                placeholder="you@example.com"
                style={{ width: "100%", background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px 14px 14px 46px", color: "#fff", outline: "none", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>
          </div>

          <div className="animate-fade-in delay-300">
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#94a3b8", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Password</label>
            <div style={{ position: "relative" }}>
              <Lock size={18} color="#64748b" style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)" }} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                className="input-field"
                placeholder="••••••••"
                style={{ width: "100%", background: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", padding: "14px 14px 14px 46px", color: "#fff", outline: "none", boxSizing: "border-box", fontSize: "15px" }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary animate-fade-in delay-400"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "12px", padding: "16px", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", marginTop: "12px", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Sparkles size={18} style={{ animation: "pulse 2s infinite" }}/> : null}
            {loading ? "Authenticating..." : isLogin ? "Sign In Securely" : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="animate-fade-in delay-400" style={{ textAlign: "center", marginTop: "32px", fontSize: "14px", color: "#94a3b8" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="toggle-link"
            style={{ background: "none", border: "none", color: "#6366f1", fontWeight: "600", cursor: "pointer", padding: "0 4px", fontSize: "14px" }}
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}