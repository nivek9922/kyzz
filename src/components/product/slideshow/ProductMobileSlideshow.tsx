'use client';

import { useState } from 'react';
import { Swiper as SwiperObject } from 'swiper';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode, Thumbs } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/free-mode';
import 'swiper/css/thumbs';
import './slideshow.css';

import { ProductImage } from '../product-image/ProductImage';

interface Props {
  images:     string[];
  title:      string;
  className?: string;
}

export const ProductMobileSlideshow = ({ images, title, className }: Props) => {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperObject>();

  return (
    <div className={className}>
      {/* Imagen principal */}
      <Swiper
        style={{
          '--swiper-pagination-color': '#8C7365',
        } as React.CSSProperties}
        thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
        modules={[FreeMode, Thumbs]}
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

      {/* Tiras horizontales abajo */}
      {images.length > 1 && (
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
