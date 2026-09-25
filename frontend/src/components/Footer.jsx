import React from 'react';
import { Camera, Heart, ShieldCheck, FileText, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
                <Camera className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold font-display text-white">
                Photo<span className="text-brand-400">Docs</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              A high-integrity public photo documentation platform for preserving organizational memories,
              cultural festivals, research activities, and community achievements with automated timestamping
              and official Word document reporting.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Admin Curated
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4 text-blue-400" /> DOCX Reports
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-indigo-400" /> Public Access
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-white transition-colors">
                  Public Chronological Gallery
                </Link>
              </li>
              <li>
                <Link to="/create-post" className="hover:text-white transition-colors">
                  Upload Documentation
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About the Platform
                </Link>
              </li>
            </ul>
          </div>

          {/* Account & Administration */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white mb-3">
              Portals
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Contributor Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Register Account
                </Link>
              </li>
              <li>
                <Link to="/my-posts" className="hover:text-white transition-colors">
                  My Posts Archive
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-purple-400 transition-colors">
                  Admin Control Panel
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} PhotoDocs Platform. All Rights Reserved.</p>
          <p className="flex items-center gap-1">
            Built with modern React, Express, MongoDB & Cloudinary
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
