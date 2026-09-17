"use client";

import { useActionState } from "react";
import { createPlayer, type CreatePlayerState } from "@/modules/athletes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLAYER_POSITIONS, POSITION_LABEL } from "@/modules/athletes/position-labels";
import type { Team } from "@/types/database";

const initialState: CreatePlayerState = {};

export function NewPlayerForm({ clubId, teams }: { clubId: string; teams: Team[] }) {
  const [state, action, pending] = useActionState(createPlayer, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="clubId" value={clubId} />
      <div className="space-y-1">
        <Label htmlFor="firstName">Prénom</Label>
        <Input id="firstName" name="firstName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="lastName">Nom</Label>
        <Input id="lastName" name="lastName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="birthDate">Date de naissance</Label>
        <Input id="birthDate" name="birthDate" type="date" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shirtNumber">N° maillot</Label>
        <Input id="shirtNumber" name="shirtNumber" type="number" min={1} className="w-20" />
      </div>
      <div className="space-y-1">
        <Label>Postes</Label>
        <div className="flex flex-wrap gap-2">
          {PLAYER_POSITIONS.map((pos) => (
            <label key={pos} className="flex items-center gap-1.5 rounded-md border border-input px-2 py-1.5 text-sm">
              <input type="checkbox" name="positions" value={pos} className="size-3.5" />
              {POSITION_LABEL[pos]}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamId">Équipe</Label>
        <select id="teamId" name="teamId" required className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.short_name || t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="membershipType">Appartenance</Label>
        <select id="membershipType" name="membershipType" defaultValue="PERMANENT" className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
          <option value="PERMANENT">Permanent</option>
          <option value="TEMPORARY">Temporaire</option>
          <option value="GUEST">Invité</option>
          <option value="TRAINING_ONLY">Entraînement seul</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Ajout..." : "Ajouter le joueur"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
      {state?.duplicateWarning && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <span>{state.duplicateWarning}</span>
          <Button type="submit" name="confirmDuplicate" value="true" size="sm" variant="outline" disabled={pending}>
            Créer quand même
          </Button>
        </div>
      )}
    </form>
  );
}
