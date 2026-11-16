import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminState, Family, GRADE_COLORS, PaternalRole, MaternalRole } from './types';
import { initials, digitsOnly } from './adminUtils';
import { sound } from '../../utils/sound';
import { useBackHandler } from '../../utils/navigationHistory';
import {
  getFamilyPhones,
  getLearnerParentPhones,
  normPhone9,
  samePhone,
} from '../../utils/familySyncUtils';
import { generate6CharPassword } from '../../utils/learnerPasswordUtils';

interface AdminFamiliesProps {
  state: AdminState;
  onAddFamily: (family: {
    head: string;
    phone: string;
    secondaryPhone?: string;
    passHash?: string;
  }) => void;
  onUpdateFamily?: (family: Family) => void;
  onLinkSibling: (learnerId: string, familyId: string) => void;
  onSendFamilyNotice?: (familyId: string, message: string) => void;
  onResetFamilyAccess: (familyId: string) => void;
  onRegenerateFamilyPassword?: (familyId: string) => void;
  onDeleteFamily: (familyId: string) => void;
  onResolveCollision: (phoneDigits: string, choice: 'same' | 'separate') => void;
  onShowToast: (msg: string) => void;
}

export const AdminFamilies: React.FC<AdminFamiliesProps> = ({
  state,
  onAddFamily,
  onUpdateFamily,
  onLinkSibling,
  onResetFamilyAccess: _onResetFamilyAccess,
  onRegenerateFamilyPassword,
  onDeleteFamily,
  onResolveCollision,
  onShowToast,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Phone back button handlers for family modals
  useBackHandler(
    () => {
      sound.playClick(400);
      setShowAddModal(false);
      return true;
    },
    showAddModal,
    45,
    'families_add_modal'
  );

  useBackHandler(
    () => {
      sound.playClick(400);
      setShowLinkModal(false);
      return true;
    },
    showLinkModal,
    45,
    'families_link_modal'
  );

  // New family form
  const [headName, setHeadName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [familyPass, setFamilyPass] = useState(() => generate6CharPassword('Family', 'NEW'));

  // Link sibling form
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState('');

  // Edit Family modal state
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [editHead, setEditHead] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSecondaryPhone, setEditSecondaryPhone] = useState('');
  const [editFatherRole, setEditFatherRole] = useState<PaternalRole>('Father');
  const [editFatherName, setEditFatherName] = useState('');
  const [editFatherPhone, setEditFatherPhone] = useState('');
  const [editMotherRole, setEditMotherRole] = useState<MaternalRole>('Mother');
  const [editMotherName, setEditMotherName] = useState('');
  const [editMotherPhone, setEditMotherPhone] = useState('');
  const [editPassHash, setEditPassHash] = useState('');

  useBackHandler(
    () => {
      sound.playClick(400);
      setEditingFamily(null);
      return true;
    },
    editingFamily !== null,
    46,
    'families_edit_modal'
  );

  // Delete family confirmation
  const [confirmDeleteFamily, setConfirmDeleteFamily] = useState<Family | null>(null);

  const isDark = state.theme === 'dark';

  // Smart Phone Collision Detection across primary + secondary guardian phones
  const phoneMap: Record<string, Family[]> = {};
  state.families.forEach((f) => {
    getFamilyPhones(f).forEach((rawP) => {
      const clean = normPhone9(rawP);
      if (clean) {
        if (!phoneMap[clean]) phoneMap[clean] = [];
        if (!phoneMap[clean].some((x) => x.id === f.id)) {
          phoneMap[clean].push(f);
        }
      }
    });
  });

  const unresolvedClashes = Object.entries(phoneMap).filter(
    ([cleanPhone, fams]) =>
      fams.length > 1 && !(state.clashResolved || {})[cleanPhone]
  );

  const isLearnerLinked = (l: (typeof state.learners)[0]) => {
    if (l.familyId && state.families.some((f) => f.id === l.familyId)) return true;
    const lPhones = getLearnerParentPhones(l);
    return state.families.some((fam) => {
      const famPhones = getFamilyPhones(fam);
      return lPhones.some((lp) => famPhones.some((fp) => samePhone(lp, fp)));
    });
  };

  const unlinkedLearners = state.learners.filter((l) => !isLearnerLinked(l));

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) {
      onShowToast('Enter the head of family name');
      return;
    }
    if (digitsOnly(phone).length < 9) {
      onShowToast('Enter a valid primary mobile phone number');
      return;
    }

    const finalPw =
      familyPass.trim().length >= 4
        ? familyPass.trim()
        : generate6CharPassword(headName.trim(), phone.trim());

    onAddFamily({
      head: headName.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      passHash: finalPw,
    });

    setHeadName('');
    setPhone('');
    setSecondaryPhone('');
    setFamilyPass(generate6CharPassword('Family', String(Date.now())));
    setShowAddModal(false);
  };

  const handleLinkSibling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamilyId || !selectedLearnerId) {
      onShowToast('Select both a family and a learner to link');
      return;
    }
    onLinkSibling(selectedLearnerId, selectedFamilyId);
    setSelectedLearnerId('');
    setShowLinkModal(false);
  };

  const handleOpenEditFamily = (fam: Family, linkedChildren: typeof state.learners) => {
    sound.playClick(500);
    const firstChild = linkedChildren[0];
    setEditingFamily(fam);
    setEditHead(fam.head || '');
    setEditPhone(fam.phone || fam.fatherPhone || fam.motherPhone || '');
    setEditSecondaryPhone(fam.secondaryPhone || '');
    setEditFatherRole(fam.fatherRole || firstChild?.fatherRole || 'Father');
    setEditFatherName(fam.fatherName ?? firstChild?.fatherName ?? '');
    setEditFatherPhone(fam.fatherPhone ?? firstChild?.fatherPhone ?? '');
    setEditMotherRole(fam.motherRole || firstChild?.motherRole || 'Mother');
    setEditMotherName(fam.motherName ?? firstChild?.motherName ?? '');
    setEditMotherPhone(fam.motherPhone ?? firstChild?.motherPhone ?? '');
    setEditPassHash(fam.passHash || generate6CharPassword(fam.head || 'Parent', fam.id));
  };

  const handleSaveEditFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;
    if (!editHead.trim()) {
      onShowToast('Enter the family / guardian name');
      return;
    }
    const primaryCandidate =
      editPhone.trim() || editFatherPhone.trim() || editMotherPhone.trim();
    if (digitsOnly(primaryCandidate).length < 9) {
      onShowToast('Enter a valid primary phone number');
      return;
    }

    const updated: Family = {
      ...editingFamily,
      head: editHead.trim(),
      phone: primaryCandidate,
      secondaryPhone: editSecondaryPhone.trim() || undefined,
      fatherRole: editFatherRole,
      fatherName: editFatherName.trim() || undefined,
      fatherPhone: editFatherPhone.trim() || undefined,
      motherRole: editMotherRole,
      motherName: editMotherName.trim() || undefined,
      motherPhone: editMotherPhone.trim() || undefined,
      passHash:
        editPassHash.trim().length >= 4
          ? editPassHash.trim().toUpperCase()
          : editingFamily.passHash || generate6CharPassword(editHead.trim(), editingFamily.id),
      passwordReset: false,
    };

    if (onUpdateFamily) {
      onUpdateFamily(updated);
    }
    setEditingFamily(null);
  };

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header and Add Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Parent & Guardian Portal
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {state.families.length} linked family accounts
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick(500);
              setShowLinkModal(true);
            }}
            className="py-2 px-3 text-xs font-black rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>🔗 Link Sibling</span>
          </button>

          <button
            onClick={() => {
              sound.playClick(600);
              setShowAddModal(true);
            }}
            className="py-2 px-3 text-xs font-black rounded-xl bg-[#22C55E] hover:bg-emerald-600 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <span>＋ Add Family</span>
          </button>
        </div>
      </div>

      {/* Smart Phone Collision Alert */}
      {unresolvedClashes.length > 0 && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/15 to-rose-500/15 border border-amber-500/30 text-slate-800 dark:text-slate-200 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-400 mb-1">
            <span>⚡</span>
            <span>Smart Phone Collision Alert</span>
          </div>
          <p className="text-xs leading-relaxed mb-3">
            Phone <strong>{unresolvedClashes[0][1][0].phone}</strong> is registered to multiple family profiles:{' '}
            <em>{unresolvedClashes[0][1].map((f) => `${f.head} (${f.id})`).join(' and ')}</em>. Is this the same household or separate contacts?
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onResolveCollision(unresolvedClashes[0][0], 'same')}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              ✓ Same Family
            </button>
            <button
              onClick={() => onResolveCollision(unresolvedClashes[0][0], 'separate')}
              className="py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 hover:bg-slate-300 text-slate-800 dark:text-white"
            >
              Separate Contact
            </button>
          </div>
        </div>
      )}

      {/* Info Banner: Every learner builds a household */}
      <div className="rounded-2xl p-3 bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <span>🏠</span>
        <span>
          <strong>All Pupils Linked:</strong> Every admitted pupil (including single-child households) automatically appears here. Both registered parent/guardian numbers share <strong>one 6-character password</strong>.
        </span>
      </div>

      {/* Families List */}
      <div className="space-y-3">
        {state.families.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            No families registered yet. Admit a pupil to automatically create their family profile.
          </div>
        ) : (
          state.families.map((fam, idx) => {
            const famPhones = getFamilyPhones(fam);
            const children = state.learners.filter((l) => {
              if (l.familyId === fam.id) return true;
              const lPhones = getLearnerParentPhones(l);
              return lPhones.some((lp) => famPhones.some((fp) => samePhone(lp, fp)));
            });
            const cardPalette = ['#7C3AED', '#EC4899', '#2F6BFF', '#14B8A6', '#F59E0B', '#6366F1'];
            const accent = cardPalette[idx % cardPalette.length];

            const fatherRole = fam.fatherRole || children[0]?.fatherRole || 'Father';
            const fatherName = fam.fatherName || children[0]?.fatherName;
            const fatherPhone = fam.fatherPhone || children[0]?.fatherPhone;
            const motherRole = fam.motherRole || children[0]?.motherRole || 'Mother';
            const motherName = fam.motherName || children[0]?.motherName;
            const motherPhone = fam.motherPhone || children[0]?.motherPhone;

            return (
              <div
                key={fam.id}
                className={`rounded-2xl p-4 border shadow-xs transition-all ${
                  isDark ? 'bg-[#141C33] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Family Avatar */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shrink-0 shadow-xs"
                    style={{ backgroundColor: accent }}
                  >
                    {initials(fam.head)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {fam.head}
                      </h3>
                      <span className="font-mono text-[10px] font-bold text-slate-400">
                        {fam.id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 space-y-0.5">
                      {(fatherPhone || motherPhone) ? (
                        <>
                          {fatherPhone && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{fatherRole === 'Grandfather' ? '👴' : '👨'}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {fatherRole}:
                              </span>
                              <span>{fatherName || 'Guardian'}</span>
                              <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                                {fatherPhone}
                              </span>
                            </div>
                          )}
                          {motherPhone && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{motherRole === 'Grandmother' ? '👵' : '👩'}</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                {motherRole}:
                              </span>
                              <span>{motherName || 'Guardian'}</span>
                              <span className="font-mono text-[11px] text-pink-600 dark:text-pink-400">
                                {motherPhone}
                              </span>
                            </div>
                          )}
                          {famPhones
                            .filter((p) => !samePhone(p, fatherPhone) && !samePhone(p, motherPhone))
                            .map((extraP) => (
                              <div key={extraP} className="font-mono text-[11px]">
                                📞 {extraP}
                              </div>
                            ))}
                        </>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {famPhones.length > 0 ? (
                            famPhones.map((p) => <span key={p}>📞 {p}</span>)
                          ) : (
                            <span className="italic text-slate-400">No guardian phone saved yet</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Shared 6-character Family Password */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        🔑 Shared Parent PW: {fam.passHash || 'Not set'}
                      </span>
                      {onRegenerateFamilyPassword && (
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick(550);
                            onRegenerateFamilyPassword(fam.id);
                          }}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 cursor-pointer"
                        >
                          🎲 New 6-Char PW
                        </button>
                      )}
                    </div>

                    {/* Linked Children */}
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Linked Children ({children.length})
                      </div>

                      {children.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">
                          No pupils linked yet
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {children.map((child) => (
                            <span
                              key={child.id}
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white flex items-center gap-1 shadow-2xs"
                              style={{ backgroundColor: GRADE_COLORS[child.grade] }}
                            >
                              <span>{child.name}</span>
                              <span className="opacity-80">({child.adm})</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {fam.passwordReset && (
                        <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-2">
                          🔑 Access reset: must choose new password at next sign-in
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditFamily(fam, children)}
                      className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs hover:bg-blue-100 cursor-pointer"
                      title="Edit Family Name & Phone Numbers"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => {
                        sound.playClick(400);
                        setConfirmDeleteFamily(fam);
                      }}
                      className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs hover:bg-rose-100 cursor-pointer"
                      title="Delete Family"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Add Family */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black">Register New Family</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Will be assigned ID <strong className="text-purple-500 font-mono">FAM-{String(state.families.length + 1).padStart(3, '0')}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFamily} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Head of Family / Guardian Name
                </label>
                <input
                  type="text"
                  value={headName}
                  onChange={(e) => setHeadName(e.target.value)}
                  placeholder="e.g. Priscilla Wanjiru Kipkoech"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Primary Guardian Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0722 334 455"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Second Parent / Guardian Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                  placeholder="e.g. 0733 556 677 (Shares same password)"
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                    🔑 Shared 6-Char Parent Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick(550);
                      setFamilyPass(generate6CharPassword(headName || 'Parent', `${phone}_${Date.now()}`));
                    }}
                    className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-600 text-white cursor-pointer"
                  >
                    🎲 Generate 6-Char PW
                  </button>
                </div>
                <input
                  type="text"
                  value={familyPass}
                  onChange={(e) => setFamilyPass(e.target.value)}
                  placeholder="6-char shared password"
                  className={`w-full p-2 rounded-xl text-xs font-mono font-bold border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                  }`}
                  required
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-300">
                  Both phone numbers use this single password to view their children's portal.
                </p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#22C55E] text-white shadow-xs"
                >
                  Save Family
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Sibling */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 border shadow-2xl max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black">Link Sibling to Household</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {state.families.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Please create at least one family before linking siblings.
              </p>
            ) : unlinkedLearners.length === 0 ? (
              <p className="text-xs text-emerald-500 py-4 text-center font-bold">
                ✓ All enrolled learners are already linked to a family!
              </p>
            ) : (
              <form onSubmit={handleLinkSibling} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Select Target Family
                  </label>
                  <select
                    value={selectedFamilyId}
                    onChange={(e) => setSelectedFamilyId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                      isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  >
                    <option value="">— Choose a family —</option>
                    {state.families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.head} ({f.id} · {f.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Select Learner (Identified by permanent ADM)
                  </label>
                  <select
                    value={selectedLearnerId}
                    onChange={(e) => setSelectedLearnerId(e.target.value)}
                    className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                      isDark ? 'bg-[#0A0F1F] border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  >
                    <option value="">— Choose an unlinked learner —</option>
                    {unlinkedLearners.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} — {l.adm} ({l.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#7C3AED] text-white shadow-xs"
                  >
                    Link Sibling
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Delete Family Confirmation */}
      {confirmDeleteFamily && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
          <div
            className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl ${
              isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="text-rose-500 font-black text-sm mb-1">
              ⚠️ Delete Family Profile?
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Are you sure you want to delete household <strong>{confirmDeleteFamily.head}</strong> ({confirmDeleteFamily.id})? Children in this household will become unlinked, but their permanent admission numbers remain secure.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteFamily(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteFamily(confirmDeleteFamily.id);
                  setConfirmDeleteFamily(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white"
              >
                Delete Family
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edit Family Name, Phone Numbers & Guardian Details */}
      {editingFamily &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs">
            <div
              className={`w-full max-w-md rounded-3xl border shadow-2xl max-h-[85dvh] flex flex-col overflow-hidden ${
                isDark ? 'bg-[#141C33] border-white/20 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/70 dark:border-white/10 shrink-0">
                <div>
                  <h3 className="text-base font-black flex items-center gap-1.5">
                    <span>✏️</span>
                    <span>Edit Family Details</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {editingFamily.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingFamily(null)}
                  className="w-7 h-7 rounded-full bg-slate-200 dark:bg-white/10 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditFamily} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                    Head of Family / Guardian Name
                  </label>
                  <input
                    type="text"
                    value={editHead}
                    onChange={(e) => setEditHead(e.target.value)}
                    placeholder="e.g. Priscilla Wanjiru Kipkoech"
                    className={`w-full p-2.5 rounded-xl text-xs border font-bold ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Primary Phone Number
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 0722 334 455"
                      className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                      Second Guardian Phone
                    </label>
                    <input
                      type="tel"
                      value={editSecondaryPhone}
                      onChange={(e) => setEditSecondaryPhone(e.target.value)}
                      placeholder="Optional"
                      className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Father / Grandfather Details */}
                <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      {editFatherRole === 'Grandfather' ? '👴' : '👨'} {editFatherRole}
                    </span>
                    <div className="flex rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 text-[10px] font-black">
                      {(['Father', 'Grandfather'] as PaternalRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setEditFatherRole(role)}
                          className={`px-2 py-0.5 cursor-pointer ${
                            editFatherRole === role
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-500 dark:text-slate-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editFatherName}
                      onChange={(e) => setEditFatherName(e.target.value)}
                      placeholder={`${editFatherRole}'s Name`}
                      className={`w-full p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                    <input
                      type="tel"
                      value={editFatherPhone}
                      onChange={(e) => setEditFatherPhone(e.target.value)}
                      placeholder={`${editFatherRole}'s Phone`}
                      className={`w-full p-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Mother / Grandmother Details */}
                <div className="p-3 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                      {editMotherRole === 'Grandmother' ? '👵' : '👩'} {editMotherRole}
                    </span>
                    <div className="flex rounded-lg overflow-hidden border border-pink-200 dark:border-pink-800 text-[10px] font-black">
                      {(['Mother', 'Grandmother'] as MaternalRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setEditMotherRole(role)}
                          className={`px-2 py-0.5 cursor-pointer ${
                            editMotherRole === role
                              ? 'bg-pink-600 text-white'
                              : 'text-slate-500 dark:text-slate-300'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={editMotherName}
                      onChange={(e) => setEditMotherName(e.target.value)}
                      placeholder={`${editMotherRole}'s Name`}
                      className={`w-full p-2 rounded-xl text-xs border ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                    <input
                      type="tel"
                      value={editMotherPhone}
                      onChange={(e) => setEditMotherPhone(e.target.value)}
                      placeholder={`${editMotherRole}'s Phone`}
                      className={`w-full p-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Shared 6-Char Parent Password */}
                <div className="p-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      🔑 Shared 6-Char Parent Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick(550);
                        setEditPassHash(
                          generate6CharPassword(editHead || 'Parent', `${editPhone}_${Date.now()}`)
                        );
                      }}
                      className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-600 text-white cursor-pointer"
                    >
                      🎲 Generate 6-Char
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    value={editPassHash}
                    onChange={(e) =>
                      setEditPassHash(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
                    }
                    className={`w-full p-2 rounded-xl text-xs font-mono font-bold border ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFamily(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
