"use client";

import { useActionState } from "react";
import { createTrainingSession, type CreateTrainingSessionState } from "@/modules/training/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRAINING_SESSION_TYPE_LABEL } from "@/modules/training/status-labels";
import type { TrainingSessionType } from "@/types/database";

const initialState: CreateTrainingSessionState = {};
const SESSION_TYPES = Object.keys(TRAINING_SESSION_TYPE_LABEL) as TrainingSessionType[];

export function NewTrainingForm({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(createTrainingSession, initialState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="teamId" value={teamId} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionType">Type</Label>
          <Select name="sessionType" defaultValue="TECHNICAL">
            <SelectTrigger id="sessionType" className="w-full">
              <SelectValue>{(value: string) => TRAINING_SESSION_TYPE_LABEL[value as TrainingSessionType]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SESSION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {TRAINING_SESSION_TYPE_LABEL[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input id="title" name="title" placeholder="Préparation physique" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" placeholder="Contenu de la séance, objectifs..." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="plannedLoad">Charge planifiée (optionnel)</Label>
        <Input id="plannedLoad" name="plannedLoad" type="number" min={0} step="0.1" />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Création..." : "Créer la séance"}
      </Button>
    </form>
  );
}
