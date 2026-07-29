import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import styles from "./EmptyFeed.module.css";

export function EmptyFeed() {
  return (
    <div className={styles.empty}>
      <div className={styles.icon}>
        <Compass size={32} />
      </div>
      <h2 className={styles.title}>Welcome to Orbit</h2>
      <p className={styles.subtitle}>
        Your feed is quiet. Follow creators and explore trending posts to fill it up.
      </p>
      <Link to="/explore" className={styles.cta}>Explore posts</Link>
    </div>
  );
}
