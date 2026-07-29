import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImagePlus, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { validateMedia, uploadMedia } from "../../services/storage";
import { createPost } from "../../services/posts";
import { createStory as createStoryService } from "../../services/stories";
import { toast } from "../../store/toast";
import styles from "./CreateModal.module.css";

type Mode = "post" | "story";

export function CreateModal() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>("post");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => navigate(-1), [navigate]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of picked) {
      const v = validateMedia(f);
      if (!v.ok) {
        toast.error(v.error ?? "Invalid file");
        continue;
      }
      valid.push(f);
    }
    if (valid.length === 0) return;
    if (mode === "story") {
      const f = valid[0];
      setFiles([f]);
      setPreviews([URL.createObjectURL(f)]);
    } else {
      const slice = valid.slice(0, 10);
      setFiles(slice);
      setPreviews(slice.map((f) => URL.createObjectURL(f)));
    }
  };

  const submit = async () => {
    if (files.length === 0) return;
    setSubmitting(true);
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const { url } = await uploadMedia(f);
        uploaded.push(url);
      }
      setUploading(false);

      const mediaType = files[0].type.startsWith("video") ? "video" : "image";

      if (mode === "story") {
        await createStoryService({
          mediaUrl: uploaded[0],
          mediaType,
          caption: caption.trim() || null,
        });
        toast.success("Story shared");
      } else {
        await createPost({
          caption: caption.trim() || null,
          mediaUrls: uploaded,
          mediaType,
          location: location.trim() || null,
        });
        toast.success("Post shared");
      }
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className={styles.header}>
            {files.length > 0 && (
              <button
                className={styles.back}
                onClick={() => {
                  setFiles([]);
                  setPreviews([]);
                }}
                aria-label="Back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2 className={styles.title}>
              {mode === "post" ? "New post" : "New story"}
            </h2>
            <button className={styles.close} onClick={close} aria-label="Close">
              <X size={20} />
            </button>
          </header>

          <div className={styles.modeSwitch}>
            <button
              className={`${styles.modeBtn} ${mode === "post" ? styles.modeActive : ""}`}
              onClick={() => {
                setMode("post");
                setFiles([]);
                setPreviews([]);
              }}
            >
              Post
            </button>
            <button
              className={`${styles.modeBtn} ${mode === "story" ? styles.modeActive : ""}`}
              onClick={() => {
                setMode("story");
                setFiles([]);
                setPreviews([]);
              }}
            >
              Story
            </button>
          </div>

          <div className={styles.content}>
            {files.length === 0 ? (
              <div
                className={styles.dropzone}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              >
                <ImagePlus size={48} />
                <p className={styles.dropTitle}>
                  {mode === "story" ? "Add a story" : "Drag photos or click to select"}
                </p>
                <p className={styles.dropHint}>
                  {mode === "story" ? "One image or video, 24h lifetime" : "Up to 10 photos. JPG, PNG, WEBP, GIF, MP4."}
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple={mode === "post"}
                  onChange={onPick}
                  hidden
                />
              </div>
            ) : (
              <div className={styles.editor}>
                <div className={styles.previewWrap}>
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Preview ${i + 1}`}
                      className={styles.preview}
                    />
                  ))}
                </div>

                <div className={styles.editorSide}>
                  <div className={styles.authorRow}>
                    <Avatar src={profile?.avatar_url} name={profile?.username ?? ""} size={32} />
                    <span className={styles.authorName}>{profile?.username}</span>
                  </div>
                  <textarea
                    className={styles.caption}
                    placeholder={mode === "story" ? "Add a caption…" : "Write a caption…"}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={mode === "story" ? 200 : 2200}
                    rows={4}
                  />
                  {mode === "post" && (
                    <input
                      className={styles.location}
                      placeholder="Add location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {files.length > 0 && (
            <footer className={styles.footer}>
              <Button variant="ghost" onClick={close}>Cancel</Button>
              <Button onClick={submit} loading={submitting} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 size={16} className={styles.spin} /> Uploading…
                  </>
                ) : (
                  "Share"
                )}
              </Button>
            </footer>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
