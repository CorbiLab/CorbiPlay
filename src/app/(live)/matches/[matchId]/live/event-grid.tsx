"use client";

import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { getLiveEncodingButtonGroups, getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { CATEGORY_ICON, CATEGORY_BUTTON_CLASS, EVENT_TYPE_BUTTON_CLASS_OVERRIDE } from "@/modules/live-encoding/category-colors";
import { cn } from "@/lib/utils";

// Flat grid, not one box per category (spec §24/84 groups the button *list*,
// not the layout): CSS Grid gives every item in the same row-band one shared
// row height, so boxing each category made the whole grid as tall as its
// single biggest group (PROGRESSION, 6 buttons) repeated per row-band — an
// analyst then had to scroll mid-match to reach the last categories, which
// isn't workable on an iPad during live play. A full-width category header
// row between groups was tried and reverted: forcing a hard row break after
// every group left small groups (POSSESSION: 2 buttons, PRESS: 1) most of a
// row blank, which cost far more height than the headers themselves and
// brought the scroll back at the 1024px worst case. Category is instead
// carried per-button — icon + tinted background + border, all from
// `CATEGORY_BUTTON_CLASS`/`CATEGORY_ICON` — so grouping reads at a glance
// without spending a row on it. `auto-fill`/`minmax` (not a fixed breakpoint
// column count) sizes columns to the grid's *actual* width, which doesn't
// track the viewport 1:1 once a roster panel and pitch share the screen.
// 5rem is a deliberately tight floor: the worst realistic case is a classic
// 1024px-wide iPad in STANDARD/ADVANCED mode, where the roster panel and
// current-event panel leave the button grid well under 500px — at that
// width this still fits 5 columns, so the grid never needs its own scroll.
const GRID_TEMPLATE_COLUMNS = "repeat(auto-fill, minmax(6.5rem, 1fr))";

export function EventGrid() {
  const draft = useLiveEncodingStore((s) => s.draft);
  const beginDraft = useLiveEncodingStore((s) => s.beginDraft);
  const encodingLevel = useLiveEncodingStore((s) => s.encodingLevel);
  const customEncodingTypes = useLiveEncodingStore((s) => s.customEncodingTypes);
  const types = getLiveEncodingButtonGroups(encodingLevel, customEncodingTypes).flatMap((group) => group.types);

  if (encodingLevel === "CUSTOM" && types.length === 0) {
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Aucun bouton configuré pour le niveau Personnalisé — utilise « Configurer » à côté du sélecteur de niveau.
      </p>
    );
  }

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: GRID_TEMPLATE_COLUMNS }}>
      {types.map((type) => {
        const def = getEventDefinition(type);
        const active = draft?.type === type;
        // GREEN_CARD/YELLOW_CARD/RED_CARD get their real card colour instead
        // of DISCIPLINE's shared red — see EVENT_TYPE_BUTTON_CLASS_OVERRIDE.
        const cls = EVENT_TYPE_BUTTON_CLASS_OVERRIDE[type] ?? CATEGORY_BUTTON_CLASS[def.category];
        const Icon = CATEGORY_ICON[def.category];
        return (
          <button
            key={type}
            onClick={() => beginDraft(type)}
            className={cn(
              // 44px+ min height — a real touch target on iPad, not just a
              // desktop-mouse-sized hit area (Apple HIG minimum). `min-w-0`
              // matters as much as the height: a flex item's default
              // min-width is its content's unwrapped width, so without it
              // "Defensive Exit" etc. refuse to wrap and spill out past the
              // button's own right edge instead of staying inside it.
              "flex min-h-11 min-w-0 items-center gap-1.5 rounded-md border-2 px-2 py-2 text-left text-xs leading-tight font-semibold transition-colors",
              active ? cls.active : cls.idle
            )}
          >
            <span className={cn("flex size-5 shrink-0 items-center justify-center rounded", cls.chip)}>
              <Icon className="size-3" />
            </span>
            <span className="min-w-0 break-words">{def.label}</span>
          </button>
        );
      })}
    </div>
  );
}
