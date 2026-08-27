import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Avatar } from "../../components/ui/Avatar";
import { useAuth } from "../../context/AuthContext";
import { updateProfile } from "../../services/auth";
import { uploadMedia } from "../../services/storage";
import { supabase } from "../../services/supabase";
import { toast } from "../../store/toast";
import type { Profile } from "../../types";
import styles from "./ProfileEditor.module.css";

interface Props {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileEditor({ profile, onClose, onSaved }: Props) {
  const { setProfile } = useAuth();
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [website, setWebsite] = useState(profile.website ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [saving, setSaving] = useState(false);

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image too large (max 8MB)");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const { url } = await uploadMedia(avatarFile);
        avatarUrl = url;
      }
      const updated = await updateProfile(profile.id, {
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        website: website.trim() || null,
        avatar_url: avatarUrl,
      });
      setProfile(updated);
      onSaved();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
            <h2 className={styles.title}>Edit profile</h2>
            <button className={styles.close} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>

          <div className={styles.body}>
            <div className={styles.avatarRow}>
              <Avatar src={avatarPreview} name={profile.username} size={80} />
              <label className={styles.avatarBtn}>
                Change photo
                <input type="file" accept="image/*" onChange={onPickAvatar} hidden />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Name</span>
              <input
                className={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={60}
                placeholder="Your name"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Bio</span>
              <textarea
                className={styles.textarea}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={150}
                rows={3}
                placeholder="Tell people about yourself"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Website</span>
              <input
                className={styles.input}
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
              />
            </label>
          </div>

          <footer className={styles.footer}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={save} loading={saving}>Save</Button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
