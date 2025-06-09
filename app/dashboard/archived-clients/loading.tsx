import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Loading archived clients...</p>
    </div>
  );
} 