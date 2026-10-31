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
      className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        isDragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
        <Upload className="h-7 w-7 text-indigo-600" />
      </div>
      <div>
        <p className="font-medium text-slate-900">Kéo thả file âm thanh vào đây</p>
        <p className="mt-1 text-sm text-slate-400">
          hoặc bấm để chọn file
        </p>
      </div>
      <span className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white">
        Chọn file
      </span>
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
