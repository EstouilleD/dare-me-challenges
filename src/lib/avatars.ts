import avatar1 from "@/assets/avatars/avatar1.png";
import avatar2 from "@/assets/avatars/avatar2.png";
import avatar4 from "@/assets/avatars/avatar4.png";
import avatar5 from "@/assets/avatars/avatar5.png";
import avatar6 from "@/assets/avatars/avatar6.png";
import avatar7 from "@/assets/avatars/avatar7.png";
import avatar8 from "@/assets/avatars/avatar8.png";
import avatar9 from "@/assets/avatars/avatar9.png";
import avatar10 from "@/assets/avatars/avatar10.png";
import avatar11 from "@/assets/avatars/avatar11.png";

// Stable keys stored in DB → Vite import paths
const AVATAR_MAP: Record<string, string> = {
  "avatar1.png": avatar1,
  "avatar2.png": avatar2,
  "avatar4.png": avatar4,
  "avatar5.png": avatar5,
  "avatar6.png": avatar6,
  "avatar7.png": avatar7,
  "avatar8.png": avatar8,
  "avatar9.png": avatar9,
  "avatar10.png": avatar10,
  "avatar11.png": avatar11,
};

// List of avatars for selection UI (key + resolved src)
export const AVATARS = Object.entries(AVATAR_MAP).map(([key, src]) => ({ key, src }));

/**
 * Resolve an avatar_url stored in DB to a usable image src.
 * Handles both stable keys ("avatar1.png") and legacy Vite-hashed paths.
 */
export function resolveAvatarUrl(avatarUrl: string): string {
  // Check if it's a stable key
  if (AVATAR_MAP[avatarUrl]) return AVATAR_MAP[avatarUrl];

  // Legacy: check if the hashed path matches any current import
  const allSrcs = Object.values(AVATAR_MAP);
  if (allSrcs.includes(avatarUrl)) return avatarUrl;

  // Fallback: try to extract the avatar name from the path
  // e.g. "/assets/avatar1-Y9QmCMth.png" → "avatar1.png"
  const match = avatarUrl.match(/avatar(\d+)/);
  if (match) {
    const key = `avatar${match[1]}.png`;
    if (AVATAR_MAP[key]) return AVATAR_MAP[key];
  }

  // Return as-is (could be a custom uploaded URL)
  return avatarUrl;
}

interface ProfileLike {
  use_avatar?: boolean | null;
  avatar_url?: string | null;
  profile_photo_url?: string | null;
}

/**
 * Get the correct image src for a profile's avatar/photo.
 */
export function getAvatarSrc(profile: ProfileLike): string {
  if (profile.use_avatar && profile.avatar_url) {
    return resolveAvatarUrl(profile.avatar_url);
  }
  if (profile.profile_photo_url) return profile.profile_photo_url;
  return "";
}
