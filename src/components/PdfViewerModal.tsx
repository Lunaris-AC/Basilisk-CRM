'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PdfViewerModalProps {
  url: string | null;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function PdfViewerModal({ url, isOpen, onClose, title = 'Visionneuse PDF' }: PdfViewerModalProps) {
  if (!url) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 bg-muted/20 w-full h-full p-2">
          {/* Native PDF Viewer via object tag */}
          <object data={`${url}#toolbar=1&navpanes=0&scrollbar=1`} type="application/pdf" className="w-full h-full rounded-md shadow-sm border">
            <p className="p-4 text-center text-muted-foreground">
              Votre navigateur ne gère pas l'affichage des PDF in-app.
              <br />
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Télécharger ou ouvrir le PDF dans un nouvel onglet
              </a>
            </p>
          </object>
        </div>
      </DialogContent>
    </Dialog>
  );
}
