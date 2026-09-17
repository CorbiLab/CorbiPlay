import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">{note}</CardContent>
      </Card>
    </div>
  );
}
