"use client";

import { useActionState } from "react";
import { Video } from "lucide-react";
import { setMatchVideo, type SetMatchVideoState } from "@/modules/matches/actions";
import { formatClock } from "@/modules/matches/logic/clock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState: SetMatchVideoState = {};

interface VideoSectionProps {
  matchId: string;
  videoUrl: string | null;
  quarterOffsetsMs: Record<string, number>;
  numberOfQuarters: number;
}

/**
 * A link, not a stored file (spec decision: video storage/provider is a
 * separate, heavier call — see the migration note on matches.video_url).
 * The per-quarter "start" fields exist because match_elapsed_ms is nominal
 * (see modules/matches/logic/video.ts) — a single offset for the whole
 * match would drift by however long the real half-time break ran.
 */
export function VideoSection({ matchId, videoUrl, quarterOffsetsMs, numberOfQuarters }: VideoSectionProps) {
  const [state, action, pending] = useActionState(setMatchVideo, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="size-4" />
          Vidéo du match
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="numberOfQuarters" value={numberOfQuarters} />

          <div className="space-y-1">
            <Label htmlFor="videoUrl">Lien vers la vidéo (YouTube, Veo, Drive...)</Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              defaultValue={videoUrl ?? ""}
            />
          </div>

          <div className="space-y-1">
            <Label>Début de chaque quart-temps dans la vidéo (mm:ss, optionnel)</Label>
            <p className="text-xs text-muted-foreground">
              Laisse vide si tu ne l&apos;as pas encore repéré — les liens vers les événements de ce quart-temps
              pointeront juste vers la vidéo sans se positionner automatiquement.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: numberOfQuarters }, (_, i) => i + 1).map((quarter) => (
                <div key={quarter} className="space-y-1">
                  <Label htmlFor={`offsetQ${quarter}`} className="text-xs text-muted-foreground">
                    Q{quarter}
                  </Label>
                  <Input
                    id={`offsetQ${quarter}`}
                    name={`offsetQ${quarter}`}
                    placeholder="mm:ss"
                    defaultValue={quarterOffsetsMs[String(quarter)] != null ? formatClock(quarterOffsetsMs[String(quarter)]) : ""}
                  />
                </div>
              ))}
            </div>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
