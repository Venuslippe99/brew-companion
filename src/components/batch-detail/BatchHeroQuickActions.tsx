import { Camera, Droplets, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BatchHeroQuickActions({
  canLogTasteTest,
  photoSupported,
  onAddNote,
  onAddTasteTest,
  onAddPhoto,
}: {
  canLogTasteTest: boolean;
  photoSupported: boolean;
  onAddNote: () => void;
  onAddTasteTest: () => void;
  onAddPhoto?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={onAddNote}>
        <StickyNote className="h-4 w-4" />
        Add note
      </Button>

      {canLogTasteTest && (
        <Button variant="outline" onClick={onAddTasteTest}>
          <Droplets className="h-4 w-4" />
          Taste test
        </Button>
      )}

      {photoSupported && onAddPhoto && (
        <Button variant="outline" onClick={onAddPhoto}>
          <Camera className="h-4 w-4" />
          Add photo
        </Button>
      )}
    </div>
  );
}
