"use client";

import { useState } from "react";

export function SportsCardImage({ src, alt }: { src: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src);

  return (
    <img
      src={imageSrc}
      alt={alt}
      onError={() => setImageSrc("/sports-card.svg")}
    />
  );
}
