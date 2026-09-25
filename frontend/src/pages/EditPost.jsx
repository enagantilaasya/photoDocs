import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPostById, updatePostApi } from '../services/api';
import { ArrowLeft, Save, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

const getLocalDatetimeString = (d = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(getLocalDatetimeString());
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadPost = async () => {
      try {
        const res = await fetchPostById(id);
        if (res.success && res.post) {
          setPost(res.post);
          setTitle(res.post.title || '');
          setDescription(res.post.description || '');
          const initialDate = res.post.eventDate || res.post.createdAt;
          if (initialDate) {
            setEventDate(getLocalDatetimeString(new Date(initialDate)));
          }
        }
      } catch (err) {
        setError('Failed to load post.');
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim()) {
      setError('Title and description cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const res = await updatePostApi(id, {
        title: title.trim(),
        description: description.trim(),
        eventDate: eventDate ? new Date(eventDate).toISOString() : undefined
      });

      if (res.success) {
        setSuccess('Post updated successfully!');
        setTimeout(() => {
          navigate('/my-posts');
        }, 1200);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating post.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6 animate-fadeIn">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
          Edit Documentation Post
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Modify the heading title, description, and event date of your documentation post.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Heading / Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 font-medium"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
            Description
          </label>
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 text-sm leading-relaxed"
            required
          />
        </div>

        {/* Date & Time Field */}
        <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            <label className="block text-sm font-bold text-slate-800 uppercase tracking-wide">
              Event / Activity Date & Time
            </label>
          </div>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-medium text-slate-800"
          />
          <p className="text-[11px] text-slate-500">
            Edit the date and timestamp associated with this activity. Chronological gallery sorting will update accordingly.
          </p>
        </div>

        {/* Existing photos preview note */}
        {post?.photos?.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Attached Photographs ({post.photos.length})
            </h4>
            <div className="flex gap-2 overflow-x-auto py-1">
              {post.photos.map((p, idx) => (
                <img
                  key={idx}
                  src={p.url}
                  alt=""
                  className="w-16 h-16 object-cover rounded-lg border border-slate-300 flex-shrink-0"
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditPost;
