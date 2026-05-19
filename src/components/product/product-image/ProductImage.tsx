'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Props {
  src?: string;
  alt: string;
  className?: React.StyleHTMLAttributes<HTMLImageElement>['className'];
  style?: React.StyleHTMLAttributes<HTMLImageElement>['style'];
  width: number;
  height: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

const resolveSrc = (src?: string) =>
  src
    ? src.startsWith('http') ? src : `/products/${src}`
    : '/imgs/placeholder.jpg';

export const ProductImage = ({
  src,
  alt,
  className,
  style,
  width,
  height,
  priority,
  loading,
}: Props) => {
  const [imgSrc, setImgSrc] = useState(() => resolveSrc(src));

  return (
    <Image
      src={imgSrc}
      width={width}
      height={height}
      alt={alt}
      className={className}
      style={style}
      priority={priority}
      loading={loading}
      onError={() => setImgSrc('/imgs/placeholder.jpg')}
    />
  );
};
