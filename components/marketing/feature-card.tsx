import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="h-full">
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-2">{body}</CardDescription>
    </Card>
  );
}

