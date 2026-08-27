import { formatDistanceToNowStrict, format } from "date-fns";

export function timeAgo(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: false });
  } catch {
    return "";
  }
}

export function fullDate(iso: string): string {
  try {
    return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "";
  }
}

export function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`.replace(/\.0K$/, "K");
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, "M");
  return `${(n / 1_000_000_000).toFixed(1)}B`.replace(/\.0B$/, "B");
}
