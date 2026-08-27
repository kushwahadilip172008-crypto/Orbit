import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { toast } from "../store/toast";
import { signIn, signUp } from "../services/auth";
import styles from "./AuthPage.module.css";

type Mode = "signin" | "signup";

interface FieldError {
  email?: string;
  password?: string;
  username?: string;
  fullName?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9_]+$/i;

function validateSignin(email: string, password: string): FieldError {
  const errs: FieldError = {};
  if (!email.trim()) errs.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email";
  if (!password) errs.password = "Password is required";
  else if (password.length < 6) errs.password = "Min 6 characters";
  return errs;
}

function validateSignup(
  username: string,
  email: string,
  password: string,
): FieldError {
  const errs: FieldError = {};
  if (!username.trim()) errs.username = "Username is required";
  else if (username.trim().length < 3) errs.username = "Min 3 characters";
  else if (username.trim().length > 20) errs.username = "Max 20 characters";
  else if (!USERNAME_RE.test(username.trim()))
    errs.username = "Letters, numbers and underscores only";
  if (!email.trim()) errs.email = "Email is required";
  else if (!EMAIL_RE.test(email.trim())) errs.email = "Enter a valid email";
  if (!password) errs.password = "Password is required";
  else if (password.length < 6) errs.password = "Min 6 characters";
  return errs;
}

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  // Sign in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siErrors, setSiErrors] = useState<FieldError>({});
  const [siLoading, setSiLoading] = useState(false);

  // Sign up state
  const [suUsername, setSuUsername] = useState("");
  const [suFullName, setSuFullName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suErrors, setSuErrors] = useState<FieldError>({});
  const [suLoading, setSuLoading] = useState(false);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSignin(siEmail, siPassword);
    if (Object.keys(errs).length > 0) {
      setSiErrors(errs);
      return;
    }
    setSiErrors({});
    setSiLoading(true);
    try {
      await signIn(siEmail.trim(), siPassword);
      toast.success("Welcome back");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSiLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateSignup(suUsername, suEmail, suPassword);
    if (Object.keys(errs).length > 0) {
      setSuErrors(errs);
      return;
    }
    setSuErrors({});
    setSuLoading(true);
    try {
      await signUp(suEmail.trim(), suPassword, suUsername.trim());
      toast.success("Account created. You're in!");
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSuLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.aurora} aria-hidden>
        <span className={styles.blob1} />
        <span className={styles.blob2} />
        <span className={styles.blob3} />
      </div>

      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            <span className={styles.logoRing} />
            <span className={styles.logoDot} />
          </div>
          <h1 className={styles.brandName}>Orbit</h1>
          <p className={styles.tagline}>
            {mode === "signin"
              ? "Welcome back to your world."
              : "Join the orbit. Share your moment."}
          </p>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === "signin"}
            className={`${styles.tab} ${mode === "signin" ? styles.activeTab : ""}`}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === "signup"}
            className={`${styles.tab} ${mode === "signup" ? styles.activeTab : ""}`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
          <span
            className={styles.tabIndicator}
            style={{ transform: `translateX(${mode === "signin" ? "0" : "100%"})` }}
          />
        </div>

        <AnimatePresence mode="wait">
          {mode === "signin" ? (
            <motion.form
              key="signin"
              onSubmit={handleSignin}
              className={styles.form}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              noValidate
            >
              <Field
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                error={siErrors.email}
              />
              <Field
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={siPassword}
                onChange={(e) => setSiPassword(e.target.value)}
                error={siErrors.password}
              />
              <Button type="submit" fullWidth size="lg" loading={siLoading}>
                Sign in
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="signup"
              onSubmit={handleSignup}
              className={styles.form}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              noValidate
            >
              <Field
                label="Username"
                placeholder="yourname"
                autoComplete="username"
                value={suUsername}
                onChange={(e) => setSuUsername(e.target.value)}
                error={suErrors.username}
              />
              <Field
                label="Full name (optional)"
                placeholder="Jane Doe"
                autoComplete="name"
                value={suFullName}
                onChange={(e) => setSuFullName(e.target.value)}
              />
              <Field
                label="Email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                error={suErrors.email}
              />
              <Field
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                value={suPassword}
                onChange={(e) => setSuPassword(e.target.value)}
                error={suErrors.password}
              />
              <Button type="submit" fullWidth size="lg" loading={suLoading}>
                Create account
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className={styles.footnote}>
          By continuing you agree to Orbit's Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Field({ label, error, type = "text", placeholder, autoComplete, value, onChange }: FieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className={`${styles.input} ${error ? styles.inputError : ""}`}
      />
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
