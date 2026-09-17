import { getCurrentClub } from "@/modules/club/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ClubSettingsPage() {
  const club = await getCurrentClub();
  if (!club) return null;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Club</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{club.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Nom court" value={club.short_name} />
          <Row label="Pays" value={club.country} />
          <Row label="Couleur principale" value={club.primary_color} swatch />
          <Row label="Couleur secondaire" value={club.secondary_color} swatch />
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        La modification des couleurs/branding du club arrive dans un sprint ultérieur — vue en lecture seule pour le Sprint 1.
      </p>
    </div>
  );
}

function Row({ label, value, swatch }: { label: string; value: string | null; swatch?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        {swatch && value && <span className="size-4 rounded-full border border-border" style={{ backgroundColor: value }} />}
        {value ?? "—"}
      </span>
    </div>
  );
}
