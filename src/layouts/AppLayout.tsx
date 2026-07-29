import { Suspense, lazy } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  PlusSquare,
  MessageCircle,
  User,
  Search,
  Moon,
  Sun,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Avatar } from "../components/ui/Avatar";
import { signOut } from "../services/auth";
import { toast } from "../store/toast";
import { cn } from "../utils/cn";
import styles from "./AppLayout.module.css";

const CreateModal = lazy(() =>
  import("../features/create/CreateModal").then((m) => ({ default: m.CreateModal })),
);

export function AppLayout() {
  const { profile } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const showCreate = location.pathname.startsWith("/create");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Primary">
        <div className={styles.brand}>
          <span className={styles.logoMark} aria-hidden>
            <span className={styles.logoRing} />
            <span className={styles.logoDot} />
          </span>
          <span className={styles.brandName}>Orbit</span>
        </div>

        <nav className={styles.nav}>
          <NavItem to="/" icon={<Home size={22} />} label="Home" end />
          <NavItem to="/explore" icon={<Compass size={22} />} label="Explore" />
          <NavItem
            to="/create"
            icon={<PlusSquare size={22} />}
            label="Create"
            active={showCreate}
          />
          <NavItem to="/messages" icon={<MessageCircle size={22} />} label="Messages" />
          <NavItem to="/notifications" icon={<Bell size={22} />} label="Activity" />
          <NavItem
            to={`/u/${profile?.username ?? ""}`}
            icon={<User size={22} />}
            label="Profile"
          />
        </nav>

        <div className={styles.spacer} />

        <button className={styles.iconBtn} onClick={toggle} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <button
          className={styles.iconBtn}
          onClick={async () => {
            try {
              await signOut();
              toast.info("Signed out");
              navigate("/auth", { replace: true });
            } catch {
              toast.error("Could not sign out");
            }
          }}
          aria-label="Sign out"
        >
          <LogOut size={20} />
        </button>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav} aria-label="Mobile navigation">
        <NavItem to="/" icon={<Home size={22} />} label="" end compact />
        <NavItem to="/explore" icon={<Search size={22} />} label="" compact />
        <NavItem to="/create" icon={<PlusSquare size={22} />} label="" active={showCreate} compact />
        <NavItem to="/messages" icon={<MessageCircle size={22} />} label="" compact />
        <NavItem
          to={`/u/${profile?.username ?? ""}`}
          icon={<Avatar name={profile?.username ?? ""} src={profile?.avatar_url} size={24} />}
          label=""
          compact
        />
      </nav>

      {showCreate && (
        <Suspense fallback={null}>
          <CreateModal />
        </Suspense>
      )}
    </div>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
  active?: boolean;
  compact?: boolean;
}

function NavItem({ to, icon, label, end, active, compact }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(styles.navItem, (active || isActive) && styles.navItemActive, compact && styles.navItemCompact)
      }
    >
      <span className={styles.navIcon}>{icon}</span>
      {label && <span className={styles.navLabel}>{label}</span>}
    </NavLink>
  );
}
