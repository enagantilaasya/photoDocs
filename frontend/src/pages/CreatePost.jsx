import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPostApi } from '../services/api';
import {
  UploadCloud,
  X,
  FileImage,
  Video,
  Plus,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Calendar,
  Film
} from 'lucide-react';

const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska', 'video/mpeg'];
const MAX_PHOTO_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_PHOTOS = 10;
const MAX_VIDEOS = 5;

const getLocalDatetimeString = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CreatePost = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customDate, setCustomDate] = useState(getLocalDatetimeString());
  const [isCustomDateEnabled, setIsCustomDateEnabled] = useState(false);

  // Photo state
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // Video state
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [externalVideoUrls, setExternalVideoUrls] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Photo Selection
  const handlePhotosSelected = (filesList) => {
    setError('');
    const newFiles = Array.from(filesList);

    if (selectedPhotos.length + newFiles.length > MAX_PHOTOS) {
      setError(`You can upload a maximum of ${MAX_PHOTOS} photos per post.`);
      return;
    }

    const validNewFiles = [];
    const newPreviews = [];

    for (const file of newFiles) {
      if (!ALLOWED_PHOTO_TYPES.includes(file.type.toLowerCase())) {
        setError(`Invalid format: ${file.name}. Only JPG, JPEG, PNG, WEBP, and GIF are supported.`);
        return;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setError(`Photo exceeds 15MB limit: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }
      validNewFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      });
    }

    setSelectedPhotos((prev) => [...prev, ...validNewFiles]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Handle Video Selection
  const handleVideosSelected = (filesList) => {
    setError('');
    const newFiles = Array.from(filesList);
    const totalVideos = selectedVideos.length + externalVideoUrls.length + newFiles.length;

    if (totalVideos > MAX_VIDEOS) {
      setError(`You can attach a maximum of ${MAX_VIDEOS} videos per post.`);
      return;
    }

    const validNewFiles = [];
    const newPreviews = [];

    for (const file of newFiles) {
      const type = file.type.toLowerCase();
      const isAllowed = ALLOWED_VIDEO_TYPES.includes(type) || file.name.match(/\.(mp4|webm|mov|ogg|mkv)$/i);

      if (!isAllowed) {
        setError(`Invalid video format: ${file.name}. Only MP4, WEBM, MOV, and OGG are supported.`);
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        setError(`Video exceeds 50MB limit: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }
      validNewFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      });
    }

    setSelectedVideos((prev) => [...prev, ...validNewFiles]);
    setVideoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeVideoFile = (index) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index));
    setVideoPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Add External Video URL (YouTube, Vimeo, direct MP4)
  const handleAddVideoUrl = () => {
    if (!videoUrlInput.trim()) return;
    const url = videoUrlInput.trim();

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('Please provide a valid web URL starting with https:// or http://');
      return;
    }

    const totalVideos = selectedVideos.length + externalVideoUrls.length;
    if (totalVideos >= MAX_VIDEOS) {
      setError(`You can attach a maximum of ${MAX_VIDEOS} videos per post.`);
      return;
    }

    setExternalVideoUrls((prev) => [...prev, url]);
    setVideoUrlInput('');
    setError('');
  };

  const removeExternalVideoUrl = (index) => {
    setExternalVideoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!title.trim()) {
      setError('Please provide a highlighted heading/title for this documentation post.');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a description of the event or activity.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());

      if (isCustomDateEnabled && customDate) {
        formData.append('eventDate', new Date(customDate).toISOString());
      }

      // Append photos if present (optional)
      selectedPhotos.forEach((file) => {
        formData.append('photos', file);
      });

      // Append video files if present (optional)
      selectedVideos.forEach((file) => {
        formData.append('videos', file);
      });

      // Append external video links if present (optional)
      if (externalVideoUrls.length > 0) {
        formData.append('videoUrls', JSON.stringify(externalVideoUrls));
      }

      const res = await createPostApi(formData);

      if (res.success) {
        setSuccessMsg(res.message || 'Post created successfully!');
        setTimeout(() => {
          navigate('/gallery');
        }, 1200);
      }
    } catch (err) {
      console.error('Submit post error:', err);
      setError(
        err.response?.data?.message || 'Failed to upload post. Please verify your connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div className="space-y-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <h1 className="text-3xl sm:text-4xl font-black font-display text-slate-900 tracking-tight">
          Create Documentation Post
        </h1>
        <p className="text-sm text-slate-600">
          Document an event, achievement, or public activity. You can include a prominent heading, detailed context, optional photographs, and optional video clips or video links.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
          <span>{successMsg} Redirecting to gallery...</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-8">
        {/* Prominent Heading / Title Input */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Prominent Heading / Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Annual Technical Symposium 2026 / Campus Plantation Drive"
            className="w-full px-4 py-3 sm:text-lg font-semibold rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900"
          />
          <p className="text-xs text-slate-500">
            This will be displayed in large bold text at the top of your post.
          </p>
        </div>

        {/* Description Section */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Description & Context <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide a comprehensive narrative of the event, activity, attendees, location, and key highlights..."
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 text-sm sm:text-base leading-relaxed"
          />
        </div>

        {/* Date / Timestamp Picker (Editable) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Event Date & Timestamp
            </span>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={isCustomDateEnabled}
                onChange={(e) => setIsCustomDateEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Set custom event date / backdate post</span>
            </label>
          </div>

          {isCustomDateEnabled ? (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-700">
                Choose Specific Date & Time:
              </label>
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium text-slate-800"
              />
              <p className="text-[11px] text-slate-500">
                This date & time will be assigned to the post and used for chronological ordering in the public gallery.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Defaults to current moment automatically. Toggle <strong>"Set custom event date"</strong> above if you wish to record a specific or past date.
            </p>
          )}
        </div>

        {/* Optional Photos Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <FileImage className="w-4 h-4 text-brand-600" />
              Photographs <span className="text-xs normal-case font-normal text-slate-500">(Optional)</span>
            </label>
            <span className="text-xs font-semibold text-slate-500">
              {selectedPhotos.length} / {MAX_PHOTOS} photos selected
            </span>
          </div>

          {/* Drag & Drop Photo Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handlePhotosSelected(e.dataTransfer.files);
            }}
            className="relative border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-brand-50/20 transition-all cursor-pointer group"
          >
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.gif"
              onChange={(e) => handlePhotosSelected(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop photographs here
              </p>
              <p className="text-xs text-slate-500">
                JPG, PNG, WEBP, GIF • Up to 10 photos • Max 15MB each
              </p>
            </div>
          </div>

          {/* Selected Photos Thumbnail Strip */}
          {photoPreviews.length > 0 && (
            <div className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {photoPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden aspect-square border border-slate-200 bg-slate-100 shadow-xs"
                  >
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                      title="Remove photograph"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[10px] text-white truncate">
                      {preview.size} MB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Optional Videos Upload & Link Section */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-600" />
              Video Recordings <span className="text-xs normal-case font-normal text-slate-500">(Optional)</span>
            </label>
            <span className="text-xs font-semibold text-slate-500">
              {selectedVideos.length + externalVideoUrls.length} / {MAX_VIDEOS} videos attached
            </span>
          </div>

          {/* Upload Video Files & Link Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Drag & Drop Video File */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleVideosSelected(e.dataTransfer.files);
              }}
              className="relative border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-indigo-50/20 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[160px]"
            >
              <input
                type="file"
                multiple
                accept=".mp4,.webm,.mov,.ogg,.mkv"
                onChange={(e) => handleVideosSelected(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Video className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Upload Video Clip
                </p>
                <p className="text-xs text-slate-500">
                  MP4, WEBM, MOV • Max 50MB per clip
                </p>
              </div>
            </div>

            {/* 2. Paste Video URL (YouTube, Vimeo, MP4 link) */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Attach Video Link
                </span>
                <p className="text-xs text-slate-500">
                  Paste a YouTube, Vimeo, or direct video URL:
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVideoUrl();
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
                <button
                  type="button"
                  onClick={handleAddVideoUrl}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Video Previews List */}
          {(videoPreviews.length > 0 || externalVideoUrls.length > 0) && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Attached Videos ({videoPreviews.length + externalVideoUrls.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Uploaded Video Files */}
                {videoPreviews.map((vid, index) => (
                  <div
                    key={`file-${index}`}
                    className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-2 text-white flex flex-col justify-between"
                  >
                    <video
                      src={vid.url}
                      className="w-full aspect-video rounded-lg object-cover bg-black mb-2"
                      controls
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span className="truncate max-w-[150px]">{vid.name}</span>
                      <span>{vid.size} MB</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideoFile(index)}
                      className="absolute top-3 right-3 p-1 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity shadow-sm"
                      title="Remove video"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* External Video Links */}
                {externalVideoUrls.map((url, index) => (
                  <div
                    key={`link-${index}`}
                    className="relative rounded-xl border border-slate-200 bg-white p-3 flex flex-col justify-between space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-[10px] font-bold uppercase text-indigo-600">Video Link</span>
                        <p className="text-xs font-medium text-slate-700 truncate">{url}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExternalVideoUrl(index)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Remove link"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Security & Timestamp Guarantee notice */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Automatic Upload Timestamp Verification
          </p>
          <p>
            When published, your post is automatically cataloged in chronological order and available immediately in the public gallery.
          </p>
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Publishing Documentation...</span>
              </>
            ) : (
              <span>Publish Post</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
