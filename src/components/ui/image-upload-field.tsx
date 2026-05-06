"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  /** Form field name. Must match what the server action reads from formData. */
  name: string;
  /** Whether to allow multiple files (e.g. custom-request reference shots). */
  multiple?: boolean;
  /** Whether the field is required. */
  required?: boolean;
  /** Headline text shown when no file is selected. */
  label?: string;
  /** Subhead/help text. */
  hint?: string;
  /** Optional className passthrough for the outer wrapper. */
  className?: string;
};

type Pick = { file: File; previewUrl: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ImageUploadField({
  name,
  multiple = false,
  required = false,
  label = "Drop an image here, or click to choose",
  hint = "JPG, PNG, or WebP. We'll auto-resize and optimize on upload.",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Free object URLs when picks change or component unmounts so we don't leak.
  useEffect(() => {
    return () => {
      picks.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [picks]);

  const ingest = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      const next = arr.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setPicks((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
        return multiple ? [...prev, ...next].slice(0, 10) : next.slice(0, 1);
      });
      // Sync the underlying <input>'s files so the form submits them.
      if (inputRef.current) {
        const dt = new DataTransfer();
        const all = multiple ? [...picks, ...next] : next.slice(0, 1);
        all.forEach((p) => dt.items.add(p.file));
        inputRef.current.files = dt.files;
      }
    },
    [multiple, picks],
  );

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    ingest(e.dataTransfer.files);
  };

  const clear = () => {
    picks.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPicks([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={className}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "block cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary-fixed"
            : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/*"
          multiple={multiple}
          required={required && picks.length === 0}
          onChange={(e) => ingest(e.target.files)}
          className="sr-only"
        />
        <div aria-hidden className="mx-auto mb-3 text-3xl">
          {picks.length > 0 ? "✓" : "+"}
        </div>
        <p className="font-headline font-bold text-on-surface">{label}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{hint}</p>
      </label>

      {picks.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {picks.map((p, i) => (
            <figure
              key={`${p.file.name}-${i}`}
              className="rounded-md bg-surface-container-low p-2"
            >
              <div className="relative aspect-square overflow-hidden rounded-md bg-surface-container-high">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
              <figcaption className="mt-2 truncate font-body text-xs text-on-surface">
                {p.file.name}
              </figcaption>
              <p className="font-label text-[0.625rem] uppercase tracking-[0.12em] text-on-surface-variant">
                {formatBytes(p.file.size)}
              </p>
            </figure>
          ))}
        </div>
      ) : null}

      {picks.length > 0 ? (
        <button
          type="button"
          onClick={clear}
          className="mt-3 font-label text-xs uppercase tracking-[0.12em] text-on-error-container hover:underline"
        >
          Clear selection
        </button>
      ) : null}
    </div>
  );
}
