import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { follow, unfollow } from "../services/profiles";
import { toast } from "../store/toast";

export function useFollow(targetId: string | undefined, initial: boolean) {
  const { profile, setProfile } = useAuth();
  const qc = useQueryClient();

  const following = !!initial;

  const toggle = useCallback(async () => {
    if (!targetId || !profile) return;
    try {
      if (following) {
        await unfollow(targetId);
        setProfile({
          ...profile,
          following_count: Math.max(0, profile.following_count - 1),
        });
        qc.invalidateQueries({ queryKey: ["profile", profile.username] });
      } else {
        await follow(targetId);
        setProfile({
          ...profile,
          following_count: profile.following_count + 1,
        });
        qc.invalidateQueries({ queryKey: ["profile", profile.username] });
        toast.success("Following");
      }
      qc.invalidateQueries({ queryKey: ["isFollowing", targetId] });
      qc.invalidateQueries({ queryKey: ["profile-by-id", targetId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }, [targetId, profile, following, setProfile, qc]);

  return { following, toggle };
}
