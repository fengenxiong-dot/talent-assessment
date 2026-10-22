// 从 talent-grid/src/components/UploadArea.tsx 迁移

import { useState, useRef, type DragEvent } from "react";

interface Props {
  onUpload: (file: File) => void;
  loading: boolean;
  error: string | null;
  fileName: string | null;
}

export function UploadArea({ onUpload, loading, error, fileName }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      onUpload(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="upload-area-wrapper">
      <div
        className={`upload-area ${dragOver ? "drag-over" : ""} ${fileName ? "has-file" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          style={{ display: "none" }}
        />

        {loading ? (
          <div className="upload-message">解析中...</div>
        ) : fileName ? (
          <div className="upload-message">
            <span className="upload-icon">&#10003;</span>
            <span>{fileName}</span>
            <span className="upload-hint">点击重新上传</span>
          </div>
        ) : (
          <div className="upload-message">
            <span className="upload-icon">&#128196;</span>
            <span>拖拽 Excel 文件到此处，或点击选择</span>
            <span className="upload-hint">支持 .xlsx / .xls 格式</span>
          </div>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}
