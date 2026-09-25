import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, User, FileText, ArrowRight, Images, Film, Play, Video } from 'lucide-react';
import { getDownloadReportUrl } from '../services/api';
import { getSafeImageUrl, DEFAULT_PHOTO_PLACEHOLDER } from '../utils/imageUrl';

const PostCard = ({ post }) => {
  if (!post) return null;

  // Format event/upload timestamp into friendly date and time
  const dateObj = new Date(post.eventDate || post.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const photos = post.photos || [];
  const previewPhotos = photos.slice(0, 3);
  const remainingCount = photos.length - 3;
  const contributor = post.uploadedBy?.fullName || 'Anonymous Contributor';

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Post Content Header */}
      <div className="p-6 pb-4">
        {/* Prominent Heading / Title as required */}
        <Link to={`/post/${post._id}`}>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 group-hover:text-brand-600 transition-colors tracking-tight leading-tight line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Description right below heading */}
        <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed line-clamp-3">
          {post.description}
        </p>
      </div>

      {/* Media Preview: Photos or Videos */}
      {photos.length > 0 ? (
        <div className="px-6 py-2">
          <div
            className={`grid gap-2 rounded-xl overflow-hidden ${
              photos.length === 1
                ? 'grid-cols-1'
                : photos.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3'
            }`}
          >
            {previewPhotos.map((photo, index) => {
              const isLastWithOverlay = index === 2 && remainingCount > 0;
              return (
                <Link
                  key={index}
                  to={`/post/${post._id}`}
                  className="relative aspect-4/3 overflow-hidden bg-slate-100 group/img block"
                >
                  <img
                    src={getSafeImageUrl(photo.url)}
                    alt={photo.originalName || `${post.title} photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = DEFAULT_PHOTO_PLACEHOLDER;
                    }}
                  />
                  {isLastWithOverlay && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white p-2">
                      <Images className="w-5 h-5 mb-1" />
                      <span className="text-sm font-bold">+{remainingCount} More</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
          {post.videos && post.videos.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
              <Film className="w-3.5 h-3.5" />
              <span>Includes {post.videos.length} {post.videos.length === 1 ? 'video recording' : 'video recordings'}</span>
            </div>
          )}
        </div>
      ) : post.videos && post.videos.length > 0 ? (
        <div className="px-6 py-2">
          <Link
            to={`/post/${post._id}`}
            className="relative block rounded-xl overflow-hidden bg-slate-900 aspect-video group/vid border border-slate-800 shadow-xs"
          >
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/vid:bg-black/20 transition-colors">
              <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center group-hover/vid:scale-110 transition-transform shadow-lg">
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </div>
            </div>
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
              <span className="font-semibold flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-md backdrop-blur-xs">
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>{post.videos.length} {post.videos.length === 1 ? 'Video' : 'Videos'}</span>
              </span>
              <span className="text-[11px] text-slate-300 bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                Click to Watch
              </span>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Meta Footer: Contributor & Automatically Generated Date/Time */}
      <div className="mt-auto px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4">
          {/* Contributor */}
          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <User className="w-3.5 h-3.5 text-brand-600" />
            <span>Uploaded by: <strong className="font-semibold text-slate-900">{contributor}</strong></span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Date: <strong className="font-medium text-slate-800">{formattedDate}</strong></span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Time: <strong className="font-medium text-slate-800">{formattedTime}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0">
          {/* Download Official Word Report (.docx) */}
          <a
            href={getDownloadReportUrl(post._id)}
            download
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition-colors"
            title="Download Official Word Report (.docx)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>DOCX Report</span>
          </a>

          {/* View Post */}
          <Link
            to={`/post/${post._id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 font-medium transition-colors shadow-xs"
          >
            <span>View Post</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
