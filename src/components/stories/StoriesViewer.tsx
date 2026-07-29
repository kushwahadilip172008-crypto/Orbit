import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { markStoryViewed } from "../../services/stories";
import { timeAgo } from "../../utils/time";
import type { StoryGroup } from "../../services/stories";
import styles from "./StoriesViewer.module.css";

interface Props {
  groups: StoryGroup[];
  startIndex: number;
  onClose: () => void;
}

export function StoriesViewer({ groups, startIndex, onClose }: Props) {
  const [groupIdx, setGroupIdx] = useState(startIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const nextStory = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const prevStory = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      const prev = groups[groupIdx - 1];
      setGroupIdx((i) => i - 1);
      setStoryIdx(prev.stories.length - 1);
    }
  }, [storyIdx, groupIdx, groups]);

  // Mark viewed
  useEffect(() => {
    if (story) markStoryViewed(story.id).catch(() => {});
  }, [story]);

  // Progress animation
  useEffect(() => {
    setProgress(0);
    startRef.current = performance.now();
    if (paused) return;
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const p = Math.min(100, (elapsed / 5000) * 100);
      setProgress(p);
      if (p >= 100) {
        nextStory();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [story, paused, nextStory]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") nextStory();
      if (e.key === "ArrowLeft") prevStory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextStory, prevStory, onClose]);

  if (!group || !story) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal>
      <button className={styles.close} onClick={onClose} aria-label="Close stories">
        <X size={24} />
      </button>

      <div
        className={styles.stage}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => {
          setPaused(false);
          startRef.current = performance.now() - (progress / 100) * 5000;
        }}
        onPointerLeave={() => setPaused(false)}
      >
        <div className={styles.viewport}>
          <AnimatePresence mode="wait">
            <motion.img
              key={story.id}
              src={story.media_url}
              alt={story.caption ?? "Story"}
              className={styles.media}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          </AnimatePresence>

          <header className={styles.header}>
            <div className={styles.progressRow}>
              {group.stories.map((_, i) => (
                <div key={i} className={styles.progressTrack}>
                  <div
                    className={styles.progressFill}
                    style={{ width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%" }}
                  />
                </div>
              ))}
            </div>
            <div className={styles.authorRow}>
              <Avatar src={group.author.avatar_url} name={group.author.username} size={36} />
              <div className={styles.authorMeta}>
                <span className={styles.authorName}>{group.author.username}</span>
                <span className={styles.time}>{timeAgo(story.created_at)} ago</span>
              </div>
            </div>
          </header>

          <button className={styles.tapLeft} onClick={prevStory} aria-label="Previous story" />
          <button className={styles.tapRight} onClick={nextStory} aria-label="Next story" />

          {story.caption && (
            <div className={styles.caption}>
              <p>{story.caption}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
