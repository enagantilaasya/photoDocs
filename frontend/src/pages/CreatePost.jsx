import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPostApi } from '../services/api';
import {
  UploadCloud,
  X,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Calendar
} from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFilesSelected = (filesList) => {
    setError('');
    const newFiles = Array.from(filesList);

    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} photos per post.`);
      return;
    }

    const validNewFiles = [];
    const newPreviews = [];

    for (const file of newFiles) {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        setError(`Invalid format: ${file.name}. Only JPG, JPEG, PNG, and WEBP are supported.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`File exceeds 10MB limit: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        return;
      }
      validNewFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2)
      });
    }

    setSelectedFiles((prev) => [...prev, ...validNewFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
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

    if (selectedFiles.length === 0) {
      setError('Please select at least 1 photograph to upload.');
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

      selectedFiles.forEach((file) => {
        formData.append('photos', file);
      });

      const res = await createPostApi(formData);

      if (res.success) {
        setSuccessMsg(res.message || 'Post created successfully!');
        setTimeout(() => {
          navigate('/my-posts');
        }, 1500);
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
          Create New Documentation Post
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Document an event, academic program, or field activity. Official date and time will be recorded automatically.
        </p>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg} Redirecting to your posts archive...</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Heading / Title Field */}
        <div className="space-y-1.5">
          <label htmlFor="heading" className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Heading / Title <span className="text-red-500">*</span>
          </label>
          <input
            id="heading"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='e.g., "Annual College Cultural Fest 2026"'
            maxLength={200}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 font-medium placeholder-slate-400 text-base"
            required
          />
          <p className="text-xs text-slate-500">
            This heading will become the primary highlighted title of the public post.
          </p>
        </div>

        {/* Description Field */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Description / Context <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the event, activity, attendees, performances, and significance..."
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 text-sm sm:text-base placeholder-slate-400 leading-relaxed"
            required
          />
          <p className="text-xs text-slate-500">
            Explain the activity in depth. It will be showcased alongside your photo gallery and included in official Word reports.
          </p>
        </div>

        {/* Activity / Event Date & Time Field */}
        <div className="space-y-2 p-4 bg-slate-50/90 rounded-2xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Upload & Event Date
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-600 hover:text-brand-700">
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

        {/* Photos Upload Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
              Event Photographs <span className="text-red-500">*</span>
            </label>
            <span className="text-xs font-semibold text-slate-500">
              {selectedFiles.length} / {MAX_FILES} photos selected
            </span>
          </div>

          {/* Drag & Drop File Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
            }}
            className="relative border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 text-center bg-slate-50 hover:bg-brand-50/20 transition-all cursor-pointer group"
          >
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop photographs here
              </p>
              <p className="text-xs text-slate-500">
                Supported formats: <strong>JPG, JPEG, PNG, WEBP</strong> • Maximum <strong>10MB</strong> per photo (Up to 10 photos)
              </p>
            </div>
          </div>

          {/* Selected Photos Thumbnail Strip */}
          {previews.length > 0 && (
            <div className="pt-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Selected Photos Preview
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {previews.map((preview, index) => (
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
                      onClick={() => removeFile(index)}
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

        {/* Security & Timestamp Guarantee notice */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Automatic Upload Timestamp Verification
          </p>
          <p>
            The backend server automatically records the upload timestamp at the exact moment of submission.
            Uploaded photos are stored securely via Cloudinary.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-7 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/25 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Uploading to Cloudinary...</span>
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
