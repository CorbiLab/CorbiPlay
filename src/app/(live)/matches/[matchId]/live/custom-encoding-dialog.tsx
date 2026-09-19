"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useLiveEncodingStore } from "@/modules/live-encoding/store";
import { LIVE_ENCODING_BUTTON_GROUPS, getEventDefinition } from "@/modules/live-encoding/event-definitions";
import { CATEGORY_LABEL } from "@/modules/live-encoding/category-colors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import type { EventType } from "@/types/database";

/**
 * The CUSTOM encoding level (spec request 2026-09-19: "choisir les actions à
 * ajouter dans l'encodage live") has no fixed preset — this is where the
 * analyst builds one for *this match*, from every type the full grid can
 * ever show (LIVE_ENCODING_BUTTON_GROUPS). Saved to matches.custom_encoding_types
 * via setCustomEncodingTypes, which persists it (unlike the encoding level
 * choice itself, which is a local-only display toggle).
 */
export function CustomEncodingDialog() {
  const [open, setOpen] = useState(false);
  const customEncodingTypes = useLiveEncodingStore((s) => s.customEncodingTypes);
  const setCustomEncodingTypes = useLiveEncodingStore((s) => s.setCustomEncodingTypes);
  const [selected, setSelected] = useState<Set<EventType>>(new Set());

  function handleOpenChange(next: boolean) {
    if (next) setSelected(new Set(customEncodingTypes));
    setOpen(next);
  }

  function toggle(type: EventType) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  function handleSave() {
    setCustomEncodingTypes(Array.from(selected));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1" />}>
        <Settings2 className="size-4" /> Configurer
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Boutons du niveau Personnalisé</DialogTitle>
          <DialogDescription>
            Choisis les actions à afficher dans la grille d&apos;encodage pour ce match. Propre à ce match — un autre
            match peut avoir sa propre sélection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {LIVE_ENCODING_BUTTON_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABEL[group.category]}</p>
              <div className="flex flex-wrap gap-2">
                {group.types.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 rounded-md border border-input px-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      className="size-3.5"
                      checked={selected.has(type)}
                      onChange={() => toggle(type)}
                    />
                    {getEventDefinition(type).label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Annuler</DialogClose>
          <Button onClick={handleSave}>Enregistrer ({selected.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
