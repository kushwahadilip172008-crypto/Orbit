import styles from "./PostCardSkeleton.module.css";

export function PostCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={`${styles.avatar} skeleton`} />
        <div className={styles.headerText}>
          <div className={`${styles.line} skeleton`} style={{ width: 100, height: 10 }} />
          <div className={`${styles.line} skeleton`} style={{ width: 60, height: 8, marginTop: 6 }} />
        </div>
      </div>
      <div className={`${styles.media} skeleton`} />
      <div className={styles.actions}>
        <div className={`${styles.line} skeleton`} style={{ width: 24, height: 24, borderRadius: 12 }} />
        <div className={`${styles.line} skeleton`} style={{ width: 24, height: 24, borderRadius: 12 }} />
        <div className={`${styles.line} skeleton`} style={{ width: 24, height: 24, borderRadius: 12 }} />
      </div>
      <div className={styles.body}>
        <div className={`${styles.line} skeleton`} style={{ width: 80, height: 10 }} />
        <div className={`${styles.line} skeleton`} style={{ width: "100%", height: 10, marginTop: 8 }} />
        <div className={`${styles.line} skeleton`} style={{ width: "70%", height: 10, marginTop: 6 }} />
      </div>
    </div>
  );
}
