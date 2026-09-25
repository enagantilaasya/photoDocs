import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchAdminStats,
  fetchAdminPosts,
  approvePostApi,
  rejectPostApi,
  deletePostAdminApi,
  fetchAdminUsers
} from '../services/api';
import {
  Shield,
  Users,
  Images,
  FileCheck2,
  Clock3,
  XCircle,
  Eye,
  Check,
  X,
  Trash2,
  Search,
  Filter,
  AlertCircle,
  RefreshCw,
  Calendar,
  CloudLightning
} from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'users'

  // Reject Modal State
  const [rejectingPost, setRejectingPost] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, postsRes, usersRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminPosts({ status: statusFilter || undefined, search: searchTerm || undefined }),
        fetchAdminUsers()
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (postsRes.success) setPosts(postsRes.posts || []);
      if (usersRes.success) setUsers(usersRes.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const res = await approvePostApi(id);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p._id === id ? { ...p, status: 'APPROVED' } : p))
        );
        // refresh stats
        fetchAdminStats().then((res) => res.success && setStats(res.stats));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error approving post.');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (post) => {
    setRejectingPost(post);
    setReviewNote('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingPost) return;
    setProcessingId(rejectingPost._id);
    try {
      const res = await rejectPostApi(rejectingPost._id, reviewNote);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p._id === rejectingPost._id
              ? { ...p, status: 'REJECTED', reviewNote: reviewNote }
              : p
          )
        );
        setRejectingPost(null);
        fetchAdminStats().then((res) => res.success && setStats(res.stats));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error rejecting post.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently remove post "${title}" and all its photos?`)) {
      return;
    }
    setProcessingId(id);
    try {
      const res = await deletePostAdminApi(id);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p._id !== id));
        fetchAdminStats().then((res) => res.success && setStats(res.stats));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting post.');
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            APPROVED
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            REJECTED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Administrative Command</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">
            Admin Moderation & Control Panel
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Review uploaded documentation, approve public gallery posts, and manage platform assets.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Users
            </span>
            <div className="mt-1 text-2xl font-black text-slate-900 font-display">
              {stats.totalUsers}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Posts
            </span>
            <div className="mt-1 text-2xl font-black text-slate-900 font-display">
              {stats.totalPosts}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs bg-amber-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Pending Posts
            </span>
            <div className="mt-1 text-2xl font-black text-amber-600 font-display">
              {stats.pendingPosts}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs bg-emerald-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Approved Posts
            </span>
            <div className="mt-1 text-2xl font-black text-emerald-600 font-display">
              {stats.approvedPosts}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-red-200/80 shadow-xs bg-red-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700">
              Rejected Posts
            </span>
            <div className="mt-1 text-2xl font-black text-red-600 font-display">
              {stats.rejectedPosts}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-xs bg-blue-50/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Photos Hosted
            </span>
            <div className="mt-1 text-2xl font-black text-blue-600 font-display">
              {stats.totalPhotos}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'posts'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Post Moderation & Approvals ({posts.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          User Accounts Directory ({users.length})
        </button>
      </div>

      {activeTab === 'posts' ? (
        <div className="space-y-4">
          {/* Filtering Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status filters */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === ''
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  statusFilter === 'REJECTED'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                Rejected
              </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search post titles..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </form>
          </div>

          {/* Admin Posts Moderation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Title / Heading</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Uploaded Date & Time</th>
                    <th className="py-3 px-4">Photos</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {posts.length > 0 ? (
                    posts.map((post) => {
                      const dateObj = new Date(post.createdAt);
                      const formattedDate = dateObj.toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      const formattedTime = dateObj.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <tr key={post._id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Title */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[200px] truncate">
                            <span title={post.title}>{post.title}</span>
                          </td>

                          {/* Contributor User */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>
                              <span className="font-semibold text-slate-800">
                                {post.uploadedBy?.fullName || 'Anonymous'}
                              </span>
                              <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                                {post.uploadedBy?.email}
                              </span>
                            </div>
                          </td>

                          {/* Backend Timestamp */}
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            <div>
                              <span className="font-medium">{formattedDate}</span>
                              <span className="block text-[10px] text-slate-400">{formattedTime}</span>
                            </div>
                          </td>

                          {/* Photos count */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{post.photos?.length || 0}</span>
                              {post.photos?.[0]?.url && (
                                <a
                                  href={post.photos[0].url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-brand-600 underline"
                                >
                                  Preview
                                </a>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {getStatusBadge(post.status)}
                          </td>

                          {/* Actions: VIEW, APPROVE, REJECT, DELETE */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* VIEW */}
                              <Link
                                to={`/post/${post._id}`}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="View public/full post"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              {/* APPROVE */}
                              {post.status !== 'APPROVED' && (
                                <button
                                  onClick={() => handleApprove(post._id)}
                                  disabled={processingId === post._id}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                                  title="Approve post for public gallery"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>APPROVE</span>
                                </button>
                              )}

                              {/* REJECT */}
                              {post.status !== 'REJECTED' && (
                                <button
                                  onClick={() => openRejectModal(post)}
                                  disabled={processingId === post._id}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors"
                                  title="Reject post"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>REJECT</span>
                                </button>
                              )}

                              {/* DELETE */}
                              <button
                                onClick={() => handleDelete(post._id, post.title)}
                                disabled={processingId === post._id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No posts found matching the filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* User Accounts Management */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Total Posts Created</th>
                  <th className="py-3 px-4">Member Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-600 text-white font-bold flex items-center justify-center text-xs">
                        {u.fullName?.charAt(0) || 'U'}
                      </div>
                      <span>{u.fullName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {u.totalPosts || 0} posts
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Reject Post Submission</h3>
              <button
                onClick={() => setRejectingPost(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are rejecting: <strong className="text-slate-900">"{rejectingPost.title}"</strong>.
              This post will NOT appear in the Public Gallery.
            </p>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Feedback Note for Contributor (Optional)
              </label>
              <textarea
                rows={3}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="Reason for rejection (e.g. insufficient context, blur photos, duplicate)..."
                className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingPost(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={processingId === rejectingPost._id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
