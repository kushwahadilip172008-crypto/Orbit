import styles from "./Spinner.module.css";
import { cn } from "../../utils/cn";

export function Spinner({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(styles.spinner, className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
