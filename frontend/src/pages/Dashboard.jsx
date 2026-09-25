import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUserStats, fetchMyPosts } from '../services/api';
import {
  PlusCircle,
  Images,
  Globe,
  User,
  LogOut,
  Calendar,
  Clock,
  Clock3,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Camera
} from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalPosts: 0,
    totalPhotos: 0,
    approvedPosts: 0,
    pendingPosts: 0,
    rejectedPosts: 0,
    latestUpload: null
  });
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsRes, postsRes] = await Promise.all([
          fetchUserStats(),
          fetchMyPosts()
        ]);

        if (statsRes.success) {
          setStats(statsRes.stats);
        }
        if (postsRes.success) {
          setRecentUploads(postsRes.posts?.slice(0, 3) || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const formattedLatest = stats.latestUpload
    ? new Date(stats.latestUpload).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'No uploads yet';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider border border-brand-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Contributor Dashboard
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-white">
              Welcome, {user?.fullName || 'Contributor'}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              Track your uploaded event documentations, monitor pending admin reviews, and publish high-quality photo records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/create-post"
              className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Post</span>
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors flex items-center gap-1.5 border border-white/20"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Quick Options Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/create-post"
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 hover:shadow-md transition-all group flex flex-col items-center text-center space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <PlusCircle className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-800">Create New Post</span>
          <span className="text-xs text-slate-500">Upload photos & heading</span>
        </Link>

        <Link
          to="/my-posts"
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 hover:shadow-md transition-all group flex flex-col items-center text-center space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Images className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-800">My Posts</span>
          <span className="text-xs text-slate-500">View and edit submissions</span>
        </Link>

        <Link
          to="/gallery"
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-brand-300 hover:shadow-md transition-all group flex flex-col items-center text-center space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-800">Public Gallery</span>
          <span className="text-xs text-slate-500">Explore live posts</span>
        </Link>

        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs group flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <span className="text-sm font-bold text-slate-800">Profile Details</span>
          <span className="text-xs text-slate-500 truncate max-w-[140px]">{user?.email}</span>
        </div>
      </div>

      {/* Dashboard Statistics Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
          Dashboard Statistics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Posts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Posts
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-display">
                {stats.totalPosts}
              </span>
              <span className="text-xs text-slate-500">entries</span>
            </div>
          </div>

          {/* Total Photos Uploaded */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Photos Uploaded
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-brand-600 font-display">
                {stats.totalPhotos}
              </span>
              <span className="text-xs text-slate-500">images</span>
            </div>
          </div>

          {/* Approved Posts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Approved
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-600 font-display">
                {stats.approvedPosts}
              </span>
              <span className="text-xs text-slate-500">live</span>
            </div>
          </div>

          {/* Pending Posts */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5" /> Pending Review
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-600 font-display">
                {stats.pendingPosts}
              </span>
              <span className="text-xs text-slate-500">queued</span>
            </div>
          </div>

          {/* Latest Upload */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Latest Upload
            </span>
            <div className="mt-3">
              <span className="text-sm font-bold text-slate-900 block truncate">
                {formattedLatest}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Uploads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-display text-slate-900 tracking-tight">
            Recent Uploads
          </h2>
          <Link
            to="/my-posts"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>View All My Posts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentUploads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentUploads.map((post) => (
              <div
                key={post._id}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  {post.photos?.[0]?.url ? (
                    <img
                      src={post.photos[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      post.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white'
                        : post.status === 'REJECTED'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 mb-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/post/${post._id}`}
                      className="font-semibold text-brand-600 hover:text-brand-700"
                    >
                      View Post →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
            <p className="text-sm text-slate-500">You have not submitted any posts yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
