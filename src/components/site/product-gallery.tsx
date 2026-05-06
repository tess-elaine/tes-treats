"use client";

import * as React from "react";
import Image from "next/image";

type Img = { id: string; url: string; alt: string | null };

export function ProductGallery({
  images,
  productName,
}: {
  images: Img[];
  productName: string;
}) {
  const [index, setIndex] = React.useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary-container via-primary-fixed to-tertiary-fixed scalloped-bite shadow-chocolate-lg" />
    );
  }

  const current = images[Math.min(index, images.length - 1)];
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden scalloped-bite shadow-chocolate-lg">
        <Image
          key={current.id}
          src={current.url}
          alt={current.alt ?? productName}
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 text-on-surface backdrop-blur-md hover:bg-surface"
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-surface/85 p-2 text-on-surface backdrop-blur-md hover:bg-surface"
            >
              <Chevron direction="right" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-on-surface/40 px-3 py-1 font-label text-xs text-on-primary backdrop-blur-sm">
              {index + 1} / {images.length}
            </div>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Product images">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md transition-opacity ${
                i === index ? "ring-2 ring-primary" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={img.url} alt={img.alt ?? ""} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}
