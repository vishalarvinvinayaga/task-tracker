import { useEffect, useRef, useState } from "react";
import { attachmentsApi, type Attachment } from "../../api/attachments";

type Parent = { taskId?: number; noteId?: number; kbArticleId?: number };

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({ parent }: { parent: Parent }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    attachmentsApi.list(parent).then(setAttachments);
  }

  useEffect(load, [parent.taskId, parent.noteId, parent.kbArticleId]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await attachmentsApi.upload(file, parent);
      }
      load();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium uppercase text-gray-400">Attachments</label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors ${
          dragging ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30" : "border-gray-300 text-gray-400 dark:border-gray-700"
        }`}
      >
        {uploading ? "Uploading…" : "Drop files here, or click to browse"}
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {attachments.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {attachments.map((a) => {
            const isImage = a.file_type?.startsWith("image/");
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-800">
                {isImage ? (
                  <img src={attachmentsApi.url(a.file_path)} alt={a.file_name} className="h-10 w-10 rounded object-cover" />
                ) : (
                  <span className="text-lg">📎</span>
                )}
                <a href={attachmentsApi.url(a.file_path)} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">
                  {a.file_name}
                </a>
                <span className="shrink-0 text-xs text-gray-400">{formatSize(a.file_size_bytes)}</span>
                <button
                  onClick={() => attachmentsApi.remove(a.id).then(load)}
                  className="shrink-0 text-xs text-gray-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
