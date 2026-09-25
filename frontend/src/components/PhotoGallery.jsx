import React, { useState } from 'react';
import ImageLightbox from './ImageLightbox';
import { Maximize2, Camera } from 'lucide-react';
import { getSafeImageUrl, DEFAULT_PHOTO_PLACEHOLDER } from '../utils/imageUrl';

const PhotoGallery = ({ photos = [], title = 'Photographs' }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!photos || photos.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400">
        <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No photos attached to this record.</p>
      </div>
    );
  }

  const openLightbox = (index) => {
    setSelectedIndex(index);
    setLightboxOpen(true);
  };

  const primaryPhoto = photos[0];
  const remainingPhotos = photos.slice(1);

  return (
    <div className="space-y-4">
      {/* Featured Primary Photo */}
      <div className="relative group overflow-hidden rounded-2xl bg-slate-900 shadow-md">
        <img
          src={getSafeImageUrl(primaryPhoto.url)}
          alt={primaryPhoto.originalName || `${title} 1`}
          className="w-full h-80 sm:h-96 md:h-[480px] object-cover group-hover:scale-102 transition-transform duration-500 cursor-pointer"
          onClick={() => openLightbox(0)}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex items-end justify-between p-4 sm:p-6 text-white">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-brand-300">
              Primary Photograph
            </span>
            <p className="text-sm font-medium truncate max-w-md">
              {primaryPhoto.originalName || 'High-Resolution Document'}
            </p>
          </div>
          <button
            onClick={() => openLightbox(0)}
            className="pointer-events-auto p-2.5 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 text-white transition-transform hover:scale-105"
            title="Expand to Fullscreen Lightbox"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid of Remaining Photos (Desktop 3-4, Tablet 2-3, Mobile 1-2) */}
      {remainingPhotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {remainingPhotos.map((photo, idx) => {
            const actualIndex = idx + 1;
            return (
              <div
                key={actualIndex}
                className="relative group overflow-hidden rounded-xl bg-slate-100 shadow-xs border border-slate-200/60 aspect-4/3 cursor-pointer"
                onClick={() => openLightbox(actualIndex)}
              >
                <img
                  src={getSafeImageUrl(photo.url)}
                  alt={photo.originalName || `${title} ${actualIndex + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-black/60 backdrop-blur-xs rounded-full">
                    <Maximize2 className="w-3.5 h-3.5" /> View Photo {actualIndex + 1}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                  #{actualIndex + 1}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      <ImageLightbox
        photos={photos}
        currentIndex={selectedIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setSelectedIndex}
      />
    </div>
  );
};

export default PhotoGallery;
