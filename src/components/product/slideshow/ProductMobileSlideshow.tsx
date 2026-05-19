'use client';

import { useState } from 'react';
import { Swiper as SwiperObject } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Pagination, Thumbs } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import './slideshow.css';

import { ProductImage } from '../product-image/ProductImage';

interface Props {
  images:     string[];
  title:      string;
  className?: string;
}

const THUMB_THRESHOLD = 3;

export const ProductMobileSlideshow = ({ images, title, className }: Props) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperObject>();
  const showThumbs = images.length >= THUMB_THRESHOLD;

  return (
    <div className={className}>
      {/* Imagen principal con dots de paginación */}
      <Swiper
        style={{
          '--swiper-pagination-color':                 '#8C7365',
          '--swiper-pagination-bullet-inactive-color': '#C8B8B0',
          '--swiper-pagination-bullet-inactive-opacity': '1',
        } as React.CSSProperties}
        thumbs={{ swiper: showThumbs && thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
        modules={[FreeMode, Pagination, Thumbs]}
        pagination={{ clickable: true, dynamicBullets: images.length > 5 }}
        className="kyzz-main-mobile"
      >
        {images.map((image, i) => (
          <SwiperSlide key={`${image}-${i}`}>
            <ProductImage
              width={600}
              height={800}
              src={image}
              alt={title}
              className="object-cover w-full h-full"
              priority={i === 0}
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Tiras horizontales — solo cuando hay 3+ imágenes */}
      {showThumbs && (
        <Swiper
          onSwiper={setThumbsSwiper}
          spaceBetween={4}
          slidesPerView={5}
          freeMode={true}
          watchSlidesProgress={true}
          modules={[FreeMode, Thumbs]}
          className="kyzz-thumbs-mobile"
        >
          {images.map((image, i) => (
            <SwiperSlide key={`${image}-${i}-thumb`}>
              <ProductImage
                width={80}
                height={80}
                src={image}
                alt={`${title} - ${i + 1}`}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </div>
  );
};
