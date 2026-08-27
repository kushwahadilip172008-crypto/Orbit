import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Settings, Grid3x3, Bookmark } from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { ProfileEditor } from "../features/profile/ProfileEditor";
import { useAuth } from "../context/AuthContext";
import { getProfileByUsername, isFollowing } from "../services/profiles";
import { useUserPosts } from "../hooks/useFeed";
import { useFollow } from "../hooks/useFollow";
import { compactNumber } from "../utils/time";
import { toast } from "../store/toast";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { profile: me, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => getProfileByUsername(username!),
    enabled: !!username,
  });

  const { data: isFollowingInitial } = useQuery({
    queryKey: ["isFollowing", profile?.id],
    queryFn: () => (me && profile ? isFollowing(me.id, profile.id) : Promise.resolve(false)),
    enabled: !!me && !!profile,
  });

  const { following, toggle } = useFollow(profile?.id, !!isFollowingInitial);
  const posts = useUserPosts(profile?.id);

  useEffect(() => {
    if (profile) document.title = `${profile.username} · Orbit`;
  }, [profile]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={`${styles.avatarSkeleton} skeleton`} />
        <div className={styles.metaSkeleton}>
          <div className={`${styles.line} skeleton`} style={{ width: 160, height: 18 }} />
          <div className={`${styles.line} skeleton`} style={{ width: 220, height: 12, marginTop: 8 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.notFound}>
        <h2>User not found</h2>
        <Link to="/explore">Back to explore</Link>
      </div>
    );
  }

  const isMe = me?.id === profile.id;

  const startDM = async () => {
    if (!profile) return;
    const { getOrCreateConversation } = await import("../services/messages");
    try {
      const id = await getOrCreateConversation(profile.id);
      navigate(`/messages/${id}`);
    } catch {
      toast.error("Couldn't open conversation");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.avatarCol}>
          <Avatar src={profile.avatar_url} name={profile.username} size={150} ring />
        </div>
        <div className={styles.metaCol}>
          <div className={styles.titleRow}>
            <h1 className={styles.username}>
              {profile.username}
              {profile.is_verified && <span className={styles.verified} aria-label="Verified" />}
            </h1>
            <div className={styles.actions}>
              {isMe ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                    Edit profile
                  </Button>
                  <Link to="/settings" className={styles.iconLink} aria-label="Settings">
                    <Settings size={20} />
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    variant={following ? "secondary" : "primary"}
                    size="sm"
                    onClick={toggle}
                  >
                    {following ? "Following" : "Follow"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={startDM}>
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className={styles.stats}>
            <span><strong>{compactNumber(profile.posts_count)}</strong> posts</span>
            <span><strong>{compactNumber(profile.followers_count)}</strong> followers</span>
            <span><strong>{compactNumber(profile.following_count)}</strong> following</span>
          </div>

          <div className={styles.bio}>
            {profile.full_name && <p className={styles.fullName}>{profile.full_name}</p>}
            {profile.bio && <p className={styles.bioText}>{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className={styles.website}>
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </header>

      <div className={styles.tabs}>
        <span className={`${styles.tab} ${styles.tabActive}`}>
          <Grid3x3 size={14} /> POSTS
        </span>
        {isMe && (
          <Link to="/saved" className={styles.tab}>
            <Bookmark size={14} /> SAVED
          </Link>
        )}
      </div>

      <div className={styles.grid}>
        {posts.items.map((p) => (
          <Link key={p.id} to={`/p/${p.id}`} className={styles.gridItem}>
            <img src={p.media_urls[0]} alt={p.caption ?? ""} loading="lazy" />
            <div className={styles.gridOverlay}>
              <span>♥ {compactNumber(p.likes_count)}</span>
              <span>💬 {compactNumber(p.comments_count)}</span>
            </div>
          </Link>
        ))}
        {posts.items.length === 0 && (
          <div className={styles.empty}>
            {isMe ? "Share your first moment." : "No posts yet."}
          </div>
        )}
      </div>

      {editing && (
        <ProfileEditor
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await refreshProfile();
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
