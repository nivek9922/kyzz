'use client';

import { useState } from 'react';
import { Swiper as SwiperObject } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Navigation, Thumbs } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/navigation';
import 'swiper/css/thumbs';
import './slideshow.css';

import { ProductImage } from '../product-image/ProductImage';

interface Props {
  images:    string[];
  title:     string;
  className?: string;
}

export const ProductSlideshow = ({ images, title, className }: Props) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperObject>();

  return (
    <div className={`slideshow-wrapper ${className ?? ''}`}>

      {/* ── Miniaturas verticales (izquierda) ── */}
      <Swiper
        onSwiper={setThumbsSwiper}
        direction="vertical"
        spaceBetween={6}
        slidesPerView="auto"
        freeMode={true}
        watchSlidesProgress={true}
        modules={[FreeMode, Thumbs]}
        className="kyzz-thumbs"
      >
        {images.map((image, i) => (
          <SwiperSlide key={`${image}-${i}`}>
            <ProductImage
              width={76}
              height={96}
              src={image}
              alt={`${title} - ${i + 1}`}
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* ── Imagen principal (derecha) ── */}
      <Swiper
        style={{ '--swiper-navigation-color': '#8C7365' } as React.CSSProperties}
        spaceBetween={0}
        navigation={images.length > 1}
        thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
        modules={[FreeMode, Navigation, Thumbs]}
        className="kyzz-main"
      >
        {images.map((image, i) => (
          <SwiperSlide key={`${image}-${i}-main`}>
            <ProductImage
              width={800}
              height={1067}
              src={image}
              alt={title}
              className="object-cover w-full h-full"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};
