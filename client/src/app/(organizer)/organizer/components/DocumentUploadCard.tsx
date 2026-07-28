"use client";

import { motion } from "framer-motion";
import { CheckCircle2, FileUp, ShieldCheck, X } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { useUploadKycDocumentMutation } from "@/store";

type UploadStatus = "Pending" | "Uploaded" | "Verified";

type DocumentUploadCardProps = {
  name: string;
  documentType: string;
  required?: boolean;
  examples?: string[];
  fileName?: string;
  onFileChange?: (fileName: string) => void;
  onRemove?: () => void;
};

export function DocumentUploadCard({ 
  name, 
  documentType,
  required = false, 
  examples = [],
  fileName: initialFileName = "",
  onFileChange,
  onRemove 
}: DocumentUploadCardProps) {
  const inputId = useId();
  const [status, setStatus] = useState<UploadStatus>(initialFileName ? "Uploaded" : "Pending");
  const [fileName, setFileName] = useState(initialFileName);
  const [dragging, setDragging] = useState(false);
  const [uploadKycDocument, { isLoading: isUploading }] = useUploadKycDocumentMutation();

  const markUploaded = async (file?: File) => {
    if (!file) return;

    setStatus("Pending");
    setFileName(file.name);

    try {
      const result = await uploadKycDocument({ file, documentType }).unwrap();
      setStatus("Uploaded");
      setFileName(result.data.fileName || file.name);
      if (onFileChange) {
        onFileChange(result.data.fileName || file.name);
      }
    } catch (error) {
      setStatus("Pending");
      setFileName("");
    }
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    markUploaded(event.dataTransfer.files?.[0]);
  };

  const handleRemove = () => {
    setStatus("Pending");
    setFileName("");
    if (onRemove) onRemove();
  };

  const statusClass =
    status === "Verified"
      ? "bg-[var(--color-status-success)]/10 text-[var(--color-status-success)]"
      : status === "Uploaded"
        ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
        : "bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)]";

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-4 shadow-[0_14px_36px_rgba(17,24,39,0.05)] transition hover:border-[var(--color-brand-secondary)]"
    >
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex min-h-[180px] cursor-pointer flex-col justify-between rounded-[18px] border border-dashed p-4 transition ${dragging ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5" : "border-[var(--color-border-strong)] bg-[var(--app-background)]"
          }`}
      >
        <input
          id={inputId}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => markUploaded(event.target.files?.[0])}
        />
        <div>
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]">
            <FileUp className="size-5" />
          </span>
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[var(--color-text-primary)]">{name}</h3>
              <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{required ? "Required" : "Optional"}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>
              {isUploading ? "Uploading..." : status}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold leading-5 text-[var(--color-text-secondary)]">Accepted: PDF, PNG, JPG</p>
          <p className="text-xs font-bold leading-5 text-[var(--error-text-secondary)]">Max size: 10MB</p>
          {examples.length ? <p className="mt-2 text-xs font-semibold leading-5 text-[var(--color-text-secondary)]">{examples.join(", ")}</p> : null}
          {fileName ? (
            <p className="mt-3 flex items-center gap-2 truncate text-xs font-black text-[var(--color-text-primary)]">
              <CheckCircle2 className="size-4 shrink-0 text-[var(--color-status-success)]" />
              {fileName}
            </p>
          ) : null}
        </div>
      </label>

      {fileName ? (
        <button
          type="button"
          onClick={handleRemove}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-50 px-4 text-sm font-black text-red-600 transition hover:bg-red-100"
        >
          <X className="size-4" />
          Remove
        </button>
      ) : null}
    </motion.article>
  );
}
