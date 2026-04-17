import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Video, Image as ImageIcon, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface MediaUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxItems?: number;
}

export const MediaUploader = ({ value, onChange, maxItems = 7 }: MediaUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = maxItems - value.length;
    if (remaining <= 0) {
      toast.error(`Máximo de ${maxItems} mídias por produto`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of toUpload) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} ultrapassa 50MB`);
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('product-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });
        if (error) {
          toast.error(`Erro ao enviar ${file.name}`);
          continue;
        }
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      if (uploaded.length) {
        onChange([...value, ...uploaded]);
        toast.success(`${uploaded.length} mídia(s) enviada(s)!`);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...value];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
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
            <div key={url + i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border">
              {isVideo(url) ? (
                <video src={url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={url} alt={`mídia ${i + 1}`} className="w-full h-full object-cover" />
              )}
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                  Capa
                </span>
              )}
              <span className="absolute top-1 right-8 bg-background/90 rounded-full p-0.5">
                {isVideo(url) ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {i > 0 && (
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => moveUp(i)} title="Mover para frente">
                    <GripVertical className="h-3 w-3" />
                  </Button>
                )}
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => removeAt(i)}>
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
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || value.length >= maxItems}
        className="w-full"
      >
        {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
        {uploading ? 'Enviando...' : value.length === 0 ? 'Enviar fotos/vídeos do dispositivo' : 'Adicionar mais mídias'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Até {maxItems} arquivos. Imagens (JPG/PNG/WEBP) e vídeos (MP4/WEBM). Máx 50MB cada. A primeira é a capa.
      </p>
    </div>
  );
};
