import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut, User, Bell, Lock, HelpCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { signOut } from "../services/auth";
import { toast } from "../store/toast";
import styles from "./SettingsPage.module.css";

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await signOut();
      toast.info("Signed out");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Sign out failed");
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <button className={styles.row} onClick={() => navigate(`/u/${profile?.username}`)}>
          <User size={20} />
          <span className={styles.rowLabel}>View profile</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button className={styles.row}>
          <Lock size={20} />
          <span className={styles.rowLabel}>Privacy</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button className={styles.row}>
          <Bell size={20} />
          <span className={styles.rowLabel}>Notifications</span>
          <span className={styles.chevron}>›</span>
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <button className={styles.row} onClick={toggle}>
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          <span className={styles.rowLabel}>Theme</span>
          <span className={styles.value}>{theme === "dark" ? "Dark" : "Light"}</span>
        </button>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Support</h2>
        <button className={styles.row}>
          <HelpCircle size={20} />
          <span className={styles.rowLabel}>Help & support</span>
          <span className={styles.chevron}>›</span>
        </button>
      </section>

      <button className={`${styles.row} ${styles.dangerRow}`} onClick={logout}>
        <LogOut size={20} />
        <span className={styles.rowLabel}>Sign out</span>
      </button>

      <p className={styles.version}>Orbit · v1.0.0</p>
    </div>
  );
}
