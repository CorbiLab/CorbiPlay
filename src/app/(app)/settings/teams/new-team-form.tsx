"use client";

import { useActionState } from "react";
import { createTeam, type CreateTeamState } from "@/modules/teams/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateTeamState = {};

export function NewTeamForm({ clubId, seasonId }: { clubId: string; seasonId: string }) {
  const [state, action, pending] = useActionState(createTeam, initialState);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="clubId" value={clubId} />
      <input type="hidden" name="seasonId" value={seasonId} />
      <div className="space-y-1">
        <Label htmlFor="name">Nom de l&apos;équipe</Label>
        <Input id="name" name="name" required placeholder="Waterloo Ducks U12 Boys" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="shortName">Nom court</Label>
        <Input id="shortName" name="shortName" placeholder="U12 Boys" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ageCategory">Catégorie d&apos;âge</Label>
        <Input id="ageCategory" name="ageCategory" placeholder="U12" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="gender">Genre</Label>
        <Input id="gender" name="gender" placeholder="BOYS" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Ajout..." : "Ajouter l'équipe"}
      </Button>
      {state?.error && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
