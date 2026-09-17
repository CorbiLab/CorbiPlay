"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PitchMarkings, PITCH_HEIGHT_UNITS, type PitchMarker } from "./hockey-pitch";
import { TAP_ZONES } from "@/modules/live-encoding/logic/pitch-zones";

interface ZonePitchProps {
  onZoneTap?: (point: { x: number; y: number }) => void;
  markers?: PitchMarker[];
  className?: string;
  interactive?: boolean;
}

/**
 * The live-encoding pitch: large tap zones instead of free-form tapping.
 * iPad landscape, watched-the-match-not-the-screen (spec §75/§87) — aiming
 * for an exact point on a small SVG mid-match is slow and error-prone, so
 * every tap resolves to one of 9 big zones' centre point instead. That
 * centre point is exactly what's stored on hockey_events.start_x/start_y —
 * this is purely an interaction affordance, not a second, coarser data
 * model (see modules/live-encoding/logic/pitch-zones.ts::TAP_ZONES).
 */
export function ZonePitch({ onZoneTap, markers = [], className, interactive = true }: ZonePitchProps) {
  const heightUnits = PITCH_HEIGHT_UNITS;
  const [activeZone, setActiveZone] = useState<string | null>(null);

  function handleTap(zoneId: string, centerX: number, centerY: number) {
    if (!interactive) return;
    setActiveZone(zoneId);
    onZoneTap?.({ x: centerX, y: centerY });
    window.setTimeout(() => setActiveZone((z) => (z === zoneId ? null : z)), 150);
  }

  return (
    <svg
      viewBox={`0 0 100 ${heightUnits}`}
      className={cn("w-full h-full rounded-md bg-[#0e2a1c] touch-none select-none", className)}
      role="img"
      aria-label="Terrain de hockey — zones tactiles"
    >
      <PitchMarkings heightUnits={heightUnits} />

      {/* Inset so each zone reads as its own distinct tappable square (not a
          seamless grid) — most noticeable on the three middle-column zones,
          which otherwise share the same x-band and can blur into one strip. */}
      {TAP_ZONES.map((zone) => {
        const inset = 1.4;
        const x0 = zone.xRange[0] + inset;
        const x1 = zone.xRange[1] - inset;
        const yTop = (zone.yRange[0] / 100) * heightUnits + inset;
        const yBottom = (zone.yRange[1] / 100) * heightUnits - inset;
        const isActive = activeZone === zone.id;

        return (
          <g key={zone.id}>
            <rect
              x={x0}
              y={yTop}
              width={x1 - x0}
              height={yBottom - yTop}
              rx={2}
              fill={isActive ? "var(--category-attack)" : "#ffffff"}
              fillOpacity={isActive ? 0.35 : 0.05}
              stroke={isActive ? "var(--category-attack)" : "#dfe8e2"}
              strokeOpacity={isActive ? 0.9 : 0.55}
              strokeWidth={0.4}
              className={interactive ? "cursor-pointer transition-[fill-opacity,stroke-opacity]" : undefined}
              onClick={() => handleTap(zone.id, zone.centerX, zone.centerY)}
            />
            {zone.isCircle && (
              <circle
                cx={zone.centerX}
                cy={(zone.centerY / 100) * heightUnits}
                r={3.2}
                fill="none"
                stroke="#dfe8e2"
                strokeOpacity={0.5}
                strokeWidth={0.3}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}

      {markers.map((m) => (
        <g key={m.id} pointerEvents="none">
          <circle cx={m.x} cy={(m.y / 100) * heightUnits} r={1.6} fill={m.color ?? "var(--category-attack)"} stroke="#0e2a1c" strokeWidth={0.3} />
          {m.label && (
            <text x={m.x} y={(m.y / 100) * heightUnits - 2.4} fontSize={2.6} fill="#fff" textAnchor="middle">
              {m.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
