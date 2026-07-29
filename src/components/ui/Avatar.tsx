import { useMemo } from "react";
import { cn } from "../../utils/cn";
import { avatarGradient, initials } from "../../utils/avatar";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  seen?: boolean;
  className?: string;
}

export function Avatar({ src, name, size = 44, ring, seen, className }: AvatarProps) {
  const gradient = useMemo(() => avatarGradient(name || "x"), [name]);
  const init = useMemo(() => initials(name || "?"), [name]);

  const style = {
    width: size,
    height: size,
    background: gradient,
    fontSize: Math.max(11, size * 0.36),
  };

  const wrapperStyle = { width: size + 8, height: size + 8 };

  if (ring) {
    return (
      <span
        className={cn(styles.ring, seen && styles.seen, className)}
        style={wrapperStyle}
      >
        <span className={styles.inner} style={{ width: size, height: size }}>
          {src ? (
            <img src={src} alt={name} className={styles.img} loading="lazy" />
          ) : (
            <span className={styles.fallback} style={style} aria-hidden>
              {init}
            </span>
          )}
        </span>
      </span>
    );
  }

  return (
    <span className={cn(styles.avatar, className)} style={style}>
      {src ? (
        <img src={src} alt={name} className={styles.img} loading="lazy" />
      ) : (
        <span className={styles.fallback} style={style} aria-hidden>
          {init}
        </span>
      )}
    </span>
  );
}
