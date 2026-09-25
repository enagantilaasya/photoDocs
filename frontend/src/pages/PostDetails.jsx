import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchPostById, getDownloadReportUrl, deletePostApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhotoGallery from '../components/PhotoGallery';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  FileText,
  Share2,
  CheckCircle,
  AlertTriangle,
  Clock3,
  Edit,
  Trash2
} from 'lucide-react';

const PostDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchPostById(id);
        if (res.success && res.post) {
          setPost(res.post);
        } else {
          setError('Post not found or access restricted.');
        }
      } catch (err) {
        console.error('Fetch post error:', err);
        setError(err.response?.data?.message || 'Error loading post details.');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [id]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this documentation post?')) {
      return;
    }
    setDeleting(true);
    try {
      await deletePostApi(post._id);
      navigate('/gallery');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-500 font-medium">Loading documentation record...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Post Unavailable</h2>
        <p className="text-slate-600 text-sm leading-relaxed">{error || 'This post could not be found.'}</p>
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </Link>
      </div>
    );
  }

  // Format event/upload timestamp
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

  const isOwner = user && post.uploadedBy && (user.id === post.uploadedBy._id || user.id === post.uploadedBy);
  const canEditOrDelete = isOwner || isAdmin;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Chronological Gallery</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Share Link */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            title="Copy share link to clipboard"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied URL!' : 'Share Post'}</span>
          </button>

          {/* Download Word Document (.docx) */}
          <a
            href={getDownloadReportUrl(post._id)}
            download
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            title="Generate & download official Word document report"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download Official Report (.docx)</span>
          </a>

          {/* Owner / Admin Edit & Delete Actions */}
          {canEditOrDelete && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <Link
                to={`/edit-post/${post._id}`}
                className="p-1.5 rounded-lg text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                title="Edit Heading / Description"
              >
                <Edit className="w-4 h-4" />
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete Post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Post Header */}
      <div className="space-y-4">


        {/* Visual Prominent Title/Heading as specified */}
        <h1 className="text-3xl sm:text-5xl font-black font-display text-slate-900 tracking-tight leading-tight">
          {post.title}
        </h1>

        {/* Upload Metadata Row */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-slate-600 pt-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-xs">
              {post.uploadedBy?.fullName?.charAt(0) || 'U'}
            </div>
            <span>
              Uploaded by <strong className="font-semibold text-slate-900">{post.uploadedBy?.fullName || 'Anonymous'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <h2 className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-3">
          Activity Description & Context
        </h2>
        <p className="text-slate-700 text-base sm:text-lg leading-relaxed whitespace-pre-line">
          {post.description}
        </p>
      </div>

      {/* Photo Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
            Documented Photographs ({post.photos?.length || 0})
          </h2>
          <span className="text-xs text-slate-600">
            Click any photograph to view high-resolution lightbox
          </span>
        </div>

        <PhotoGallery photos={post.photos} title={post.title} />
      </div>

      {/* Word Document Report CTA Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-800 font-bold text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Need an official printed report for this activity?</span>
          </div>
          <p className="text-sm text-slate-600 max-w-xl">
            Download an auto-generated Microsoft Word document (.docx) containing the title, description,
            embedded photographs, official timestamps, and direct web links to this post.
          </p>
        </div>
        <a
          href={getDownloadReportUrl(post._id)}
          download
          className="flex-shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
        >
          Download DOCX Report
        </a>
      </div>
    </div>
  );
};

export default PostDetails;
