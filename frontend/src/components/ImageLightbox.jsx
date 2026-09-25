import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Download } from 'lucide-react';

const ImageLightbox = ({
  photos = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onIndexChange
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    } else {
      onIndexChange(photos.length - 1);
    }
  }, [currentIndex, photos.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      onIndexChange(currentIndex + 1);
    } else {
      onIndexChange(0);
    }
  }, [currentIndex, photos.length, onIndexChange]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/20">
            {currentIndex + 1} / {photos.length}
          </span>
          <span className="text-sm font-medium text-slate-300 truncate max-w-[200px] sm:max-w-md">
            {currentPhoto?.originalName || 'Photograph'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct download current image */}
          <a
            href={currentPhoto?.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="p-2 rounded-full hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Open original high-res image"
          >
            <Download className="w-5 h-5" />
          </a>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 text-slate-300 hover:text-white transition-colors ml-2"
            title="Close lightbox (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="relative max-w-7xl max-h-[85vh] w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={currentPhoto?.url}
          src={currentPhoto?.url}
          alt={currentPhoto?.originalName || 'Photo Preview'}
          className="max-h-[80vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-transform duration-200 select-none animate-fadeIn"
          loading="lazy"
        />

        {/* Previous Button */}
        {photos.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-xs transition-all hover:scale-110 focus:outline-none"
            title="Previous (Left arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Button */}
        {photos.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-xs transition-all hover:scale-110 focus:outline-none"
            title="Next (Right arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {photos.length > 1 && (
        <div
          className="absolute bottom-4 inset-x-0 flex justify-center gap-2 overflow-x-auto px-4 py-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((photo, index) => (
            <button
              key={index}
              onClick={() => onIndexChange(index)}
              className={`relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-brand-500 scale-105 shadow-md shadow-brand-500/50'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={photo.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageLightbox;
