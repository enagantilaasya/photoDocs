import React from 'react';
import { Play, Video, ExternalLink, Download } from 'lucide-react';
import { getSafeVideoUrl, getYouTubeEmbedUrl, getVimeoEmbedUrl, detectVideoType } from '../utils/videoUrl';

const VideoPlayer = ({ video, index = 0, title = 'Video Recording' }) => {
  if (!video) return null;

  const rawUrl = typeof video === 'string' ? video : video.url;
  const safeUrl = getSafeVideoUrl(rawUrl);
  const videoType = detectVideoType(safeUrl);
  const originalName = video.originalName || `${title} - Clip ${index + 1}`;

  const youtubeEmbed = getYouTubeEmbedUrl(safeUrl);
  const vimeoEmbed = getVimeoEmbedUrl(safeUrl);

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-800 flex flex-col group">
      {/* Video Display Container (16:9 Aspect Ratio) */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {youtubeEmbed ? (
          <iframe
            src={youtubeEmbed}
            title={originalName}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : vimeoEmbed ? (
          <iframe
            src={vimeoEmbed}
            title={originalName}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            src={safeUrl}
          >
            Your browser does not support HTML5 video playback.
          </video>
        )}
      </div>

      {/* Video Footer Info Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-900/95 flex items-center justify-between gap-3 text-white border-t border-slate-800 text-xs">
        <div className="flex items-center gap-2 truncate">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Video className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium text-slate-200 truncate">
            {originalName}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold text-[10px]">
            {videoType}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {videoType === 'html5' && (
            <a
              href={safeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Download or open original video"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Open video link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
