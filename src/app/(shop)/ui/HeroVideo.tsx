'use client';

import { useEffect, useRef } from 'react';

interface Props {
  videoUrl:  string;
  posterUrl: string;
}

export function HeroVideo({ videoUrl, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const reduced  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
    if ((reduced || saveData) && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.load(); // cancel pending network fetch
    }
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={posterUrl}
      className="absolute inset-0 w-full h-full object-cover object-center"
    >
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}
