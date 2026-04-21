import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Video, Image as ImageIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface MediaUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxItems?: number;
}

export const MediaUploader = ({ value, onChange, maxItems = 7 }: MediaUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const uploadFiles = async (files: File[]) => {
    const remaining = maxItems - value.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${maxItems} mídias por produto`);
      return;
    }
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of toUpload) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} ultrapassa 50MB`);
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("product-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) {
        onChange([...value, ...uploaded]);
        toast.success(`${uploaded.length} mídia(s) enviada(s)!`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleInput = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFiles(Array.from(files));
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const swap = (i: number, j: number) => {
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (draggingIdx !== null) return; // reordering, not file drop
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) uploadFiles(files);
  };

  const onItemDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggingIdx === null || draggingIdx === targetIdx) return;
    const next = [...value];
    const [moved] = next.splice(draggingIdx, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
    setDraggingIdx(null);
  };

  const isVideo = (url: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Fotos e Vídeos do Produto</span>
        <span className="text-xs text-muted-foreground">{value.length}/{maxItems}</span>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDraggingIdx(i)}
              onDragEnd={() => setDraggingIdx(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onItemDrop(e, i)}
              className={`relative group aspect-square rounded-lg overflow-hidden bg-muted border-2 transition-all cursor-move ${
                draggingIdx === i ? "opacity-40 border-primary" : "border-transparent hover:border-primary/40"
              }`}
              title="Arraste para reordenar"
            >
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover pointer-events-none" muted playsInline />
              ) : (
                <img src={url} alt={`mídia ${i + 1}`} className="w-full h-full object-cover pointer-events-none" />
              )}
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                  Capa
                </span>
              )}
              <span className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5">
                {isVideo(url) ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
              </span>
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); swap(i, i - 1); }}
                  disabled={i === 0}
                  title="Mover para trás"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); swap(i, i + 1); }}
                  disabled={i === value.length - 1}
                  title="Mover para frente"
                >
                  <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                  title="Remover"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => handleInput(e.target.files)}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !uploading && value.length < maxItems && inputRef.current?.click()}
        className={`w-full rounded-lg border-2 border-dashed transition-all cursor-pointer p-6 text-center ${
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        } ${uploading || value.length >= maxItems ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {value.length >= maxItems
                ? `Limite atingido (${maxItems})`
                : value.length === 0
                  ? "Clique ou arraste fotos/vídeos aqui"
                  : "Adicionar mais (ou arraste aqui)"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Até {maxItems} arquivos · JPG, PNG, WEBP, MP4 · Máx 50MB cada
            </p>
          </>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        💡 Arraste as imagens para reordenar. A primeira é a capa do produto.
      </p>
    </div>
  );
};
