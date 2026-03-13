"use client";

import { useEffect } from "react";
import { TriangleAlert, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-6 text-center text-red-500">
      <TriangleAlert className="mb-4 h-16 w-16 text-destructive" />
      <h2 className="mb-2 text-2xl font-bold font-mono tracking-wider">
        Aïe, court-circuit dans la matrice.
      </h2>
      <p className="mb-6 text-muted-foreground">
        Une erreur système inattendue s'est produite.
      </p>
      
      <div className="mb-8 w-full max-w-2xl rounded bg-black/50 p-4 text-left border border-destructive/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <p className="text-sm font-semibold text-destructive mb-2">Détails techniques :</p>
        <pre className="overflow-auto text-xs text-red-400">
          {error.message || "Erreur non spécifiée"}
        </pre>
      </div>

      <Button
        onClick={() => reset()}
        variant="destructive"
        className="gap-2 font-mono uppercase tracking-wide px-8"
      >
        <RotateCcw className="h-4 w-4" />
        Relancer le système
      </Button>
    </div>
  );
}
