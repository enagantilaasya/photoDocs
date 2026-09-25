import React from 'react';
import { Camera, Calendar, ShieldCheck, FileText, Cloud, Database, Lock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 animate-fadeIn">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="px-3.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-bold uppercase tracking-wider">
          Platform Architecture & Purpose
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-slate-900 tracking-tight">
          Public Photo Documentation Gallery
        </h1>
        <p className="text-slate-600 text-base leading-relaxed">
          Designed as a digital photo documentation system, institutional event gallery, and community archive.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Automated Database Timestamps
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Upload dates and timestamps are generated server-side at the exact moment of creation via MongoDB timestamps. Contributors cannot manually edit or spoof timestamps, ensuring chronological integrity.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Role-Based Moderation
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Content submitted by users begins in a PENDING state. Only once an authorized Administrator reviews and approves the submission does it appear live in the Public Gallery.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Cloud className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Cloudinary Image Hosting
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Heavy image binaries are streamed via Multer to Cloudinary CDN storage (with automatic fallback storage), while MongoDB stores lean metadata (publicId, secure_url, dimensions, bytes).
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Word (.docx) Report Generation
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Built-in docx reporting converts any documentation record into a formatted Microsoft Word document with embedded photographs, contributor details, and live hyperlinks.
          </p>
        </div>
      </div>

      {/* System Flow Diagram */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h2 className="text-xl font-bold font-display text-slate-900">
          The Lifecycle of a Documented Post
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-center text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-brand-600 block mb-1">Step 1</span>
            User inputs heading, description & selects up to 10 photos
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-brand-600 block mb-1">Step 2</span>
            Multer streams photos to Cloudinary CDN
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-brand-600 block mb-1">Step 3</span>
            Backend generates official UTC timestamp & sets status PENDING
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-brand-600 block mb-1">Step 4</span>
            Admin reviews, validates and approves post
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-brand-600 block mb-1">Step 5</span>
            Post is published in Chronological Public Gallery
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="text-center pt-4">
        <Link
          to="/gallery"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors shadow-md"
        >
          Explore Public Gallery
        </Link>
      </div>
    </div>
  );
};

export default About;
