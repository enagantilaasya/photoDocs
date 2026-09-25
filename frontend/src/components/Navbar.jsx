import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Camera,
  PlusCircle,
  LayoutDashboard,
  Images,
  Shield,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  FileText
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform duration-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold font-display tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
                Photo<span className="text-brand-600">Docs</span>
              </span>
              <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-600 -mt-1">
                Public Archive
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Home
            </Link>
            <Link
              to="/gallery"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/gallery')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Public Gallery
            </Link>
            <Link
              to="/about"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/about')
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              About
            </Link>

            {isAuthenticated && (
              <>
                <div className="h-4 w-px bg-slate-200 mx-2" />
                <Link
                  to="/create-post"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/create-post')
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  Create Post
                </Link>
                <Link
                  to="/my-posts"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/my-posts')
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Images className="w-4 h-4 text-slate-500" />
                  My Posts
                </Link>
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'text-brand-600 bg-brand-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  Dashboard
                </Link>

                {isAdmin && (
                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-all ${
                      isActive('/admin')
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Desktop Right Action Area */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-[11px]">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.fullName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/30 transition-all hover:shadow-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-fadeIn">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            to="/gallery"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Public Gallery
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            About
          </Link>

          {isAuthenticated ? (
            <>
              <div className="pt-2 border-t border-slate-100" />
              <Link
                to="/create-post"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-brand-600 hover:bg-brand-50"
              >
                <PlusCircle className="w-5 h-5" />
                Create New Post
              </Link>
              <Link
                to="/my-posts"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                <Images className="w-5 h-5" />
                My Posts
              </Link>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                <LayoutDashboard className="w-5 h-5" />
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium text-purple-700 bg-purple-50"
                >
                  <Shield className="w-5 h-5" />
                  Admin Panel
                </Link>
              )}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  Signed in as {user?.fullName}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-md"
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
