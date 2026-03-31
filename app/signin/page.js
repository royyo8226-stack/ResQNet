"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, UserPlus, Shield, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import styles from "./page.module.css";

const signinInitial = { email: "", password: "" };
const signupInitial = { fullName: "", email: "", phoneNumber: "", password: "", confirmPassword: "" };

export default function SigninPage() {
  const router = useRouter();
  const [mode, setMode] = useState("signin");
  const [loading, setLoading] = useState(false);
  const [signinForm, setSigninForm] = useState(signinInitial);
  const [signupForm, setSignupForm] = useState(signupInitial);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "signup") {
      setMode("signup");
    }
  }, []);

  function onSigninChange(key, value) {
    setSigninForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSignupChange(key, value) {
    setSignupForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSigninSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signinForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Sign in failed");
      }

      const nextPath = data.user?.role === "admin" ? "/admin" : "/dashboard";
      toast.success("Signed in successfully");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSignupSubmit(event) {
    event.preventDefault();

    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Sign up failed");
      }

      toast.success("Account created. Redirecting to dashboard...");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <div className={styles.wrap}>
        <aside className={`card ${styles.infoPanel}`}>
          <p className={styles.kicker}>ResQNet Access</p>
          <h1>Sign in once. Act faster.</h1>
          <p>
            Access emergency finder, provider profile, and admin tools from one account.
          </p>

          <div className={styles.points}>
            <p><HeartHandshake size={15} /> Users can register blood or emergency resource support.</p>
            <p><Shield size={15} /> Admin access is role-based and secure.</p>
          </div>

          <div className={styles.ctaRow}>
            <Link href="/become-donor" className="btn btnGhost">Register Provider</Link>
            <Link href="/find-help" className="btn btnPrimary">Find Help</Link>
          </div>
        </aside>

        <div className={`card ${styles.formPanel}`}>
          <div className={styles.tabs}>
            <button className={`btn ${mode === "signin" ? "btnPrimary" : "btnGhost"}`} onClick={() => setMode("signin")}>Sign In</button>
            <button className={`btn ${mode === "signup" ? "btnPrimary" : "btnGhost"}`} onClick={() => setMode("signup")}>Sign Up</button>
          </div>

          {mode === "signin" ? (
            <form className={styles.form} onSubmit={onSigninSubmit}>
              <label className="label">
                Email
                <input className="input" type="email" value={signinForm.email} onChange={(e) => onSigninChange("email", e.target.value)} required />
              </label>
              <label className="label">
                Password
                <input className="input" type="password" value={signinForm.password} onChange={(e) => onSigninChange("password", e.target.value)} required />
              </label>
              <button className="btn btnPrimary" type="submit" disabled={loading}>
                <LogIn size={16} /> {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={onSignupSubmit}>
              <label className="label">
                Full Name
                <input className="input" value={signupForm.fullName} onChange={(e) => onSignupChange("fullName", e.target.value)} required />
              </label>
              <label className="label">
                Email
                <input className="input" type="email" value={signupForm.email} onChange={(e) => onSignupChange("email", e.target.value)} required />
              </label>
              <label className="label">
                Phone Number
                <input className="input" value={signupForm.phoneNumber} onChange={(e) => onSignupChange("phoneNumber", e.target.value)} required />
              </label>
              <label className="label">
                Password
                <input className="input" type="password" value={signupForm.password} onChange={(e) => onSignupChange("password", e.target.value)} minLength={8} required />
              </label>
              <label className="label">
                Confirm Password
                <input className="input" type="password" value={signupForm.confirmPassword} onChange={(e) => onSignupChange("confirmPassword", e.target.value)} minLength={8} required />
              </label>
              <button className="btn btnPrimary" type="submit" disabled={loading}>
                <UserPlus size={16} /> {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
