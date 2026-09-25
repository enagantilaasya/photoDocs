import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyPosts, deletePostApi } from '../services/api';
import {
  Calendar,
  Clock,
  Images,
  Eye,
  Edit,
  Trash2,
  PlusCircle,
  Clock3,
  CheckCircle2,
  XCircle,
  FileText
} from 'lucide-react';

const MyPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetchMyPosts();
      if (res.success) {
        setPosts(res.posts || []);
      }
    } catch (err) {
      console.error('Error fetching my posts:', err);
      setError('Unable to load your posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleDelete = async (postId, postTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${postTitle}"? This will permanently delete its photos.`)) {
      return;
    }
    setDeletingId(postId);
    try {
      await deletePostApi(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            My Posts Archive
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Manage your personal event documentations and photo assets.
          </p>
        </div>

        <Link
          to="/create-post"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Post</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Loading your posts...</p>
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post) => {
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
            const thumbnail = post.photos?.[0]?.url;

            return (
              <div
                key={post._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col md:flex-row items-start md:items-center gap-5"
              >
                {/* Thumbnail Preview */}
                <div className="relative w-full md:w-36 h-36 md:h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Images className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold">
                    {post.photos?.length || 0} {post.photos?.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>

                {/* Content Info */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center">
                    <h3 className="text-lg font-bold font-display text-slate-900 truncate">
                      {post.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>

                  {/* Date & Time Metadata */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formattedDate}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Actions: VIEW, EDIT, DELETE */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                  <Link
                    to={`/post/${post._id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>VIEW</span>
                  </Link>

                  <Link
                    to={`/edit-post/${post._id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:text-brand-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>EDIT</span>
                  </Link>

                  <button
                    onClick={() => handleDelete(post._id, post.title)}
                    disabled={deletingId === post._id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <Images className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">You haven't uploaded any posts yet</h3>
          <p className="text-sm text-slate-500">
            Document your first event or upload memorable photos to preserve them in the public archive.
          </p>
          <Link
            to="/create-post"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Post</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MyPosts;
