import React, { useEffect, useState } from 'react';
import { SCHOOL_INFO } from '../data/portalData';
import { sound } from '../utils/sound';

interface SchoolInfoModalProps {
  onClose: () => void;
}

interface ResolvedSchoolDetails {
  name: string;
  motto: string;
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  facebook: string;
  instagram: string;
}

function resolveSchoolDetails(): ResolvedSchoolDetails {
  let savedSchool: any = null;
  try {
    const raw = localStorage.getItem('lra_admin_v3');
    if (raw) {
      savedSchool = JSON.parse(raw)?.school || null;
    }
  } catch {
    savedSchool = null;
  }

  const rawEmail = (savedSchool?.email || '').trim();
  const email =
    !rawEmail ||
    rawEmail === 'admin@littlerosesacademy.sc.ke' ||
    rawEmail === 'info@littlerosesacademy.ac.ke'
      ? SCHOOL_INFO.email
      : rawEmail;

  const rawFacebook = (savedSchool?.facebook || '').trim();
  const facebook =
    !rawFacebook || rawFacebook === 'Little Roses Academy'
      ? SCHOOL_INFO.facebook
      : rawFacebook;

  const rawInstagram = (savedSchool?.instagram || '').trim();
  const instagram =
    !rawInstagram || rawInstagram === 'Little Roses Academy'
      ? SCHOOL_INFO.instagram
      : rawInstagram;

  return {
    name: (savedSchool?.name || '').trim() || SCHOOL_INFO.name,
    motto: (savedSchool?.motto || '').trim() || SCHOOL_INFO.motto,
    location: (savedSchool?.address || '').trim() || SCHOOL_INFO.location,
    phone: (savedSchool?.phone || '').trim() || SCHOOL_INFO.phone,
    whatsapp: (savedSchool?.whatsapp || '').trim() || SCHOOL_INFO.whatsapp,
    email,
    facebook,
    instagram,
  };
}

export const SchoolInfoModal: React.FC<SchoolInfoModalProps> = ({ onClose }) => {
  const [school, setSchool] = useState<ResolvedSchoolDetails>(() => resolveSchoolDetails());

  useEffect(() => {
    const refresh = () => setSchool(resolveSchoolDetails());
    window.addEventListener('lra-admin-state-updated', refresh);
    window.addEventListener('lra_data_sync', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('lra-admin-state-updated', refresh);
      window.removeEventListener('lra_data_sync', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const igSlug = school.instagram.replace(/^@/, '').replace(/\s+/g, '');
  const instagramUrl = igSlug ? `https://www.instagram.com/${encodeURIComponent(igSlug)}/` : '#';
  const facebookUrl = `https://www.facebook.com/search/top?q=${encodeURIComponent(school.facebook)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-3xl border border-[#F5B301]/40 p-5 sm:p-6 text-white shadow-2xl"
        style={{
          background: 'linear-gradient(180deg, #112240 0%, #0A192F 100%)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Little Roses Academy School Details"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src="/images/lra_crest.jpg"
              alt={school.name}
              className="w-11 h-11 rounded-full border-2 border-[#F5B301] shadow-md object-cover"
            />
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">School Details</h2>
              <p className="text-[11px] text-[#F5D27A] font-semibold">{school.name} · Nakuru</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-300">
          {/* School Motto */}
          <div className="p-3 bg-black/30 rounded-xl border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5D27A] block mb-0.5">
                School Motto
              </span>
              <p className="text-white text-sm font-serif italic">"{school.motto}"</p>
            </div>
            <span className="text-2xl" title="Little Roses">🌹</span>
          </div>

          {/* Key Academic Information: Class Level */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-xs uppercase tracking-wider text-slate-400">
              Academic Information
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 block font-medium">Class Level</span>
                <span className="text-[11.5px] font-bold text-white block mt-0.5">{SCHOOL_INFO.levels}</span>
              </div>
              <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                <span className="text-[10px] text-emerald-400 block font-medium">Admission Status</span>
                <span className="text-[11px] font-semibold text-emerald-300 block mt-0.5">{SCHOOL_INFO.intakeNote}</span>
              </div>
            </div>
          </div>

          {/* Why Little Roses Academy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider text-[#F5D27A] flex items-center gap-1.5">
                <span>⭐</span> Why Little Roses Academy
              </h3>
              <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-[#F5B301]/20 text-[#F5D27A] font-semibold border border-[#F5B301]/30">
                School Pillars
              </span>
            </div>
            <ul className="space-y-1.5">
              {SCHOOL_INFO.whyLittleRoses.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-[#F5B301]/30 transition-colors"
                >
                  <span className="text-[#F5B301] text-xs font-black mt-0.5">✓</span>
                  <span className="text-slate-100 text-[11.5px] font-medium leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Enquiry */}
          <div className="p-3.5 bg-black/40 rounded-xl border border-white/10 space-y-2.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F5D27A]">
                Contact & Enquiry
              </span>
              <span className="text-[9.5px] text-slate-400">Official Channels</span>
            </div>

            <div className="space-y-2">
              {/* Location */}
              <div className="flex items-start gap-2 text-slate-200">
                <span className="text-red-400 text-sm">📍</span>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">School Location:</span>
                  <span className="font-medium text-slate-100">{school.location}</span>
                </div>
              </div>

              {/* Call Phone */}
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 text-sm">📞</span>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Call Enquiries:</span>
                  <a
                    href={`tel:${school.phone}`}
                    className="font-bold text-white hover:text-[#F5D27A] transition-colors underline decoration-emerald-500/50"
                  >
                    {school.phone}
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 text-sm">💬</span>
                <div className="flex-1">
                  <span className="text-[10px] text-slate-400 block font-medium">School Official WhatsApp:</span>
                  <a
                    href={`https://wa.me/${school.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-300 hover:text-emerald-200 transition-colors underline decoration-emerald-500/50"
                  >
                    {school.whatsapp}
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 text-slate-200">
                <span className="text-amber-300 text-sm">✉️</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Official School Email:</span>
                  <a
                    href={`mailto:${school.email}`}
                    className="font-bold text-amber-200 hover:text-amber-100 transition-colors underline decoration-amber-400/50 truncate block"
                  >
                    {school.email}
                  </a>
                </div>
              </div>

              {/* Social Channels */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10.5px] text-slate-200 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors min-w-0"
                >
                  <span className="text-blue-400 shrink-0">📘</span>
                  <div className="truncate min-w-0">
                    <span className="text-[9px] text-slate-400 block">Facebook</span>
                    <span className="font-semibold text-white truncate block">{school.facebook}</span>
                  </div>
                </a>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10.5px] text-slate-200 bg-white/5 hover:bg-white/10 p-2 rounded-lg transition-colors min-w-0"
                >
                  <span className="text-pink-400 shrink-0">📷</span>
                  <div className="truncate min-w-0">
                    <span className="text-[9px] text-slate-400 block">Instagram</span>
                    <span className="font-semibold text-white truncate block">{school.instagram}</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick(500);
              onClose();
            }}
            className="w-full py-2.5 bg-[#F5B301] text-[#0A192F] font-bold rounded-xl text-xs hover:bg-[#F5D27A] transition-colors cursor-pointer mt-1 shadow-lg"
          >
            Close School Details
          </button>
        </div>
      </div>
    </div>
  );
};
