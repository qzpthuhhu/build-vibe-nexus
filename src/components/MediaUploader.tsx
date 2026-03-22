import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Film, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface MediaFile {
  id?: string;
  file_url: string;
  file_name: string;
  media_type: string;
  sort_order: number;
}

interface MediaUploaderProps {
  mediaType: 'cover' | 'screenshot' | 'video' | 'document';
  files: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  max?: number;
  label: string;
  accept?: string;
}

export default function MediaUploader({ mediaType, files, onChange, max = 1, label, accept }: MediaUploaderProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !user) return;
    const selectedFiles = Array.from(e.target.files);
    if (files.length + selectedFiles.length > max) {
      toast.error(`最多上传 ${max} 个文件`);
      return;
    }

    setUploading(true);
    try {
      const newFiles: MediaFile[] = [];
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('app-media').upload(path, file);
        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('app-media').getPublicUrl(path);
        newFiles.push({
          file_url: publicUrl,
          file_name: file.name,
          media_type: mediaType,
          sort_order: files.length + newFiles.length,
        });
      }
      onChange([...files, ...newFiles]);
    } catch (err: any) {
      toast.error(err.message || '上传失败');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const icon = mediaType === 'video' ? Film : mediaType === 'document' ? FileText : ImageIcon;
  const Icon = icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{files.length}/{max}</span>
      </div>

      {files.length > 0 && (
        <div className={`grid gap-2 ${mediaType === 'cover' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
          {files.map((f, i) => (
            <div key={i} className="group relative rounded-lg border border-border/50 overflow-hidden bg-secondary/30">
              {f.media_type === 'video' ? (
                <div className="aspect-video flex items-center justify-center">
                  <Film className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground ml-2 truncate max-w-[120px]">{f.file_name}</span>
                </div>
              ) : f.media_type === 'document' ? (
                <div className="p-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{f.file_name}</span>
                </div>
              ) : (
                <div className={mediaType === 'cover' ? 'aspect-[21/9]' : 'aspect-video'}>
                  <img src={f.file_url} alt={f.file_name} className="h-full w-full object-cover" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length < max && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={max > 1}
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 w-full border-dashed"
          >
            <Upload className="h-3.5 w-3.5" />
            {uploading ? '上传中...' : '选择文件'}
          </Button>
        </>
      )}
    </div>
  );
}
