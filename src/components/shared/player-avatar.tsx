import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "size-7 text-[10px]",
  sm: "size-9 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-16 text-lg",
} as const;

// Tailwind's spacing scale is 0.25rem (4px) per unit — size-7/9/10/14/16 below.
const SIZE_PX = { xs: 28, sm: 36, md: 40, lg: 56, xl: 64 } as const;

interface PlayerAvatarProps {
  photoUrl?: string | null;
  shirtNumber?: number | null;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}

/**
 * Round player avatar — a real photo when the athlete has one
 * (`players.photo_url`), otherwise the jersey-number fallback everyone
 * already recognises. Used everywhere a player shows up (squad, live
 * encoding roster, athlete profile, match rosters) so the two never drift
 * apart visually.
 */
export function PlayerAvatar({ photoUrl, shirtNumber, name, size = "md", className }: PlayerAvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded photos live on an arbitrary Supabase Storage host, not worth configuring remotePatterns for.
      <img
        src={photoUrl}
        alt={name}
        width={SIZE_PX[size]}
        height={SIZE_PX[size]}
        className={cn("shrink-0 rounded-full object-cover", SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-mono font-semibold text-accent-foreground",
        SIZE_CLASSES[size],
        className
      )}
    >
      {shirtNumber ?? "–"}
    </span>
  );
}
