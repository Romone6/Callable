import { AlertTriangle } from "lucide-react";

export function ErrorCallout({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5" />
        <span>{message}</span>
      </div>
    </div>
  );
}

