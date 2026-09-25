import React, { useState, useEffect } from 'react';
import { fetchPublicPosts } from '../services/api';
import PostCard from '../components/PostCard';
import { Search, Calendar, ArrowUpDown, Filter, RotateCcw, AlertCircle, Images } from 'lucide-react';

const Gallery = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        sort: sortOrder,
        search: searchTerm || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      };
      const res = await fetchPublicPosts(params);
      if (res.success) {
        setPosts(res.posts || []);
        setTotalCount(res.total || res.posts?.length || 0);
      }
    } catch (err) {
      console.error('Gallery fetch error:', err);
      setError('Unable to load gallery posts at this time. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadPosts();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSortOrder('newest');
    setFromDate('');
    setToDate('');
    setTimeout(() => {
      loadPosts();
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Section */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-3.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
          Public Chronological Documentation
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
          Public Photo Gallery
        </h1>
        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          Explore documented activities, events, and community moments ordered chronologically. All upload dates and timestamps are verified by backend logs.
        </p>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, event, or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
            />
          </div>

          {/* Date Range: From */}
          <div className="md:col-span-3 relative">
            <span className="block text-[10px] uppercase font-bold text-slate-400 absolute top-1 left-3 pointer-events-none">
              From Date
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 pt-4 pb-1 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-xs sm:text-sm text-slate-700"
            />
          </div>

          {/* Date Range: To */}
          <div className="md:col-span-3 relative">
            <span className="block text-[10px] uppercase font-bold text-slate-400 absolute top-1 left-3 pointer-events-none">
              To Date
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 pt-4 pb-1 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-xs sm:text-sm text-slate-700"
            />
          </div>

          {/* Search Button */}
          <div className="md:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </form>

        {/* Secondary Bar: Sorting, Counts & Reset */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-semibold text-slate-900">{totalCount}</span>
            <span>Approved documentation {totalCount === 1 ? 'post' : 'posts'} found</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <label htmlFor="sortOrder" className="text-slate-500 text-xs">
                Sort:
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="newest">Newest First (Default)</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Reset Button */}
            {(searchTerm || fromDate || toDate || sortOrder !== 'newest') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Posts Gallery List */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 rounded-md w-2/3" />
              <div className="h-4 bg-slate-200 rounded-md w-full" />
              <div className="h-4 bg-slate-200 rounded-md w-4/5" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-32 bg-slate-200 rounded-lg" />
                <div className="h-32 bg-slate-200 rounded-lg" />
                <div className="h-32 bg-slate-200 rounded-lg" />
              </div>
              <div className="h-6 bg-slate-200 rounded-md w-1/3" />
            </div>
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-8">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
          <Images className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-900">No approved posts match your criteria</h3>
          <p className="text-sm text-slate-500">
            Try adjusting your search terms or date range filters to discover documentation posts.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold hover:bg-brand-100 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default Gallery;
