/**
 * Deliberately bypasses AppShell (no sidebar, no header) — the live-encoding
 * screen is an iPad-landscape, watch-the-match-not-the-screen tool (spec
 * §75/§87), and the analyst asked for it explicitly: this screen should take
 * the entire display, not share it with app chrome. See ADR note in
 * ARCHITECTURE.md "Live-encoding screen is fullscreen, on its own route
 * group" for why this needed its own route group rather than a CSS overlay.
 */
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-dvh w-full overflow-hidden bg-background">{children}</div>;
}
