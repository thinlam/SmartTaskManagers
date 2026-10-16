import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';

const ACCEPTED_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.mp4', '.webm'];

export function UploadZone({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 text-center transition-colors ${
        isDragOver ? 'border-emerald-400 bg-emerald-400/5' : 'border-white/15 hover:border-white/25'
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
        <Upload className="h-7 w-7 text-emerald-400" />
      </div>
      <div>
        <p className="font-medium text-white">Kéo thả file âm thanh vào đây</p>
        <p className="mt-1 text-sm text-white/50">
          hoặc bấm để chọn file — hỗ trợ {ACCEPTED_EXTENSIONS.join(', ')}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
