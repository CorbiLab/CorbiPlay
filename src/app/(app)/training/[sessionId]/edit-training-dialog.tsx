"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { updateTrainingSession, type UpdateTrainingSessionState } from "@/modules/training/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TRAINING_SESSION_TYPE_LABEL } from "@/modules/training/status-labels";
import type { TrainingSessionType } from "@/types/database";

const initialState: UpdateTrainingSessionState = {};
const SESSION_TYPES = Object.keys(TRAINING_SESSION_TYPE_LABEL) as TrainingSessionType[];

interface EditTrainingDialogProps {
  sessionId: string;
  date: string;
  sessionType: TrainingSessionType;
  title: string | null;
  description: string | null;
  plannedLoad: number | null;
}

export function EditTrainingDialog({ sessionId, date, sessionType, title, description, plannedLoad }: EditTrainingDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateTrainingSession, initialState);
  const submittedRef = useRef(false);

  // Snapshot on open only — see edit-match-dialog.tsx for why (a revalidatePath
  // re-render mid-close would otherwise trip Base UI's uncontrolled-field warning).
  const [fields, setFields] = useState({ date, sessionType, title, description, plannedLoad });

  function handleOpenChange(next: boolean) {
    if (next) setFields({ date, sessionType, title, description, plannedLoad });
    setOpen(next);
  }

  useEffect(() => {
    if (submittedRef.current && !pending && !state.error) {
      submittedRef.current = false;
      setOpen(false);
    }
  }, [state, pending]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Modifier la séance" />}>
        <Pencil className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
        </DialogHeader>
        <form action={action} onSubmit={() => { submittedRef.current = true; }} className="space-y-3">
          <input type="hidden" name="sessionId" value={sessionId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="date" type="date" defaultValue={fields.date.slice(0, 10)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-sessionType">Type</Label>
              <Select name="sessionType" defaultValue={fields.sessionType}>
                <SelectTrigger id="edit-sessionType" className="w-full">
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
          <div className="space-y-1">
            <Label htmlFor="edit-title">Titre</Label>
            <Input id="edit-title" name="title" defaultValue={fields.title ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" name="description" defaultValue={fields.description ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-plannedLoad">Charge planifiée</Label>
            <Input id="edit-plannedLoad" name="plannedLoad" type="number" min={0} step="0.1" defaultValue={fields.plannedLoad ?? ""} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
