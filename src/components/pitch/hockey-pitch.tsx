"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface PitchMarker {
  id: string;
  x: number; // 0-100
  y: number; // 0-100
  color?: string;
  label?: string;
}

interface HockeyPitchProps {
  onTap?: (point: { x: number; y: number }) => void;
  markers?: PitchMarker[];
  className?: string;
  interactive?: boolean;
}

/** Pitch is 91.4m long (x) x 55m wide (y); viewBox height matches that ratio within a 0-100 x-axis. */
export const PITCH_HEIGHT_UNITS = (55 / 91.4) * 100;

/**
 * The drawn field markings (lines, circles, goals) shared by every pitch
 * variant — <HockeyPitch /> (free tap, kept for read-only marker displays
 * like future heatmaps) and <ZonePitch /> (the large-zone touch grid used by
 * live encoding, see docs/ARCHITECTURE.md "Pitch geometry & zones").
 */
export function PitchMarkings({ heightUnits }: { heightUnits: number }) {
  const circleRx = 16; // approximate radius in x-units (~14.6m of 91.4m)
  const circleRy = 30; // approximate radius in y-units, clipped to backline

  return (
    <>
      <rect x={0} y={0} width={100} height={heightUnits} fill="#0e2a1c" />
      <rect x={0.5} y={0.5} width={99} height={heightUnits - 1} fill="none" stroke="#dfe8e2" strokeWidth={0.4} />
      <line x1={50} y1={0} x2={50} y2={heightUnits} stroke="#dfe8e2" strokeWidth={0.3} />
      <line x1={25} y1={0} x2={25} y2={heightUnits} stroke="#dfe8e2" strokeWidth={0.25} strokeDasharray="1,1" />
      <line x1={75} y1={0} x2={75} y2={heightUnits} stroke="#dfe8e2" strokeWidth={0.25} strokeDasharray="1,1" />
      <path
        d={`M 0 ${heightUnits / 2 - circleRy / 2} A ${circleRx} ${circleRy / 2} 0 0 1 0 ${heightUnits / 2 + circleRy / 2}`}
        fill="none"
        stroke="#dfe8e2"
        strokeWidth={0.3}
      />
      <path
        d={`M 100 ${heightUnits / 2 - circleRy / 2} A ${circleRx} ${circleRy / 2} 0 0 0 100 ${heightUnits / 2 + circleRy / 2}`}
        fill="none"
        stroke="#dfe8e2"
        strokeWidth={0.3}
      />
      <rect x={-1.2} y={heightUnits / 2 - 3.6} width={1.2} height={7.2} fill="none" stroke="#dfe8e2" strokeWidth={0.3} />
      <rect x={100} y={heightUnits / 2 - 3.6} width={1.2} height={7.2} fill="none" stroke="#dfe8e2" strokeWidth={0.3} />
      <circle cx={7.5} cy={heightUnits / 2} r={0.4} fill="#dfe8e2" />
      <circle cx={92.5} cy={heightUnits / 2} r={0.4} fill="#dfe8e2" />
    </>
  );
}

/**
 * SVG field-hockey pitch at real proportions (91.4m x 55m — spec §27).
 * viewBox is 0-100 on both axes so callers work in normalised coordinates
 * directly; a tap is converted back to that same 0-100 space via the click
 * event's SVG-space position, not pixel math, so it works at any rendered
 * size. Zones are derived elsewhere (modules/live-encoding/logic/pitch-zones)
 * — this component only draws lines and reports raw taps (spec §27: "Do NOT
 * store only predefined zones").
 *
 * Live encoding itself uses <ZonePitch /> instead (large touch zones — spec
 * §75/§87); this free-tap version is kept for future read-only marker
 * displays (heatmaps, pitch maps) where precise per-event coordinates matter
 * more than fast touch targets.
 */
export function HockeyPitch({ onTap, markers = [], className, interactive = true }: HockeyPitchProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const heightUnits = PITCH_HEIGHT_UNITS;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!interactive || !onTap || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onTap({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 100 ${heightUnits}`}
      className={cn("w-full h-full rounded-md bg-[#0e2a1c] touch-none select-none", className)}
      onClick={handleClick}
      role="img"
      aria-label="Hockey pitch"
    >
      <PitchMarkings heightUnits={heightUnits} />

      {markers.map((m) => (
        <g key={m.id}>
          <circle cx={m.x} cy={(m.y / 100) * heightUnits} r={1.4} fill={m.color ?? "var(--category-attack)"} stroke="#0e2a1c" strokeWidth={0.3} />
          {m.label && (
            <text x={m.x} y={(m.y / 100) * heightUnits - 2} fontSize={2.4} fill="#fff" textAnchor="middle">
              {m.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
