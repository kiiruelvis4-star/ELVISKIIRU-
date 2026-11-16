import React, { useState } from 'react';
import { AdminState, PasswordChangeRequest } from './types';
import { nairobiStamp, uid } from './adminUtils';
import { sound } from '../../utils/sound';

interface PasswordChangeRequestModalProps {
  state: AdminState;
  onClose: () => void;
  onSubmitRequest: (req: Omit<PasswordChangeRequest, 'id' | 'requestedAt' | 'status'>) => void;
  onApproveRequest: (requestId: string, tempPassword: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
  onShowToast: (msg: string) => void;
}

export const PasswordChangeRequestModal: React.FC<PasswordChangeRequestModalProps> = ({
  state,
  onClose,
  onSubmitRequest,
  onApproveRequest,
  onRejectRequest,
  onShowToast,
}) => {
  const isDark = state.theme === 'dark';
  const requests = state.passwordRequests || [];
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  const [activeTab, setActiveTab] = useState<'queue' | 'submit'>('queue');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Submit Form State
  const [userType, setUserType] = useState<PasswordChangeRequest['userType']>('teacher');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [reason, setReason] = useState('Forgotten existing password / PIN');
  const [customReason, setCustomReason] = useState('');
  const [urgency, setUrgency] = useState<PasswordChangeRequest['urgency']>('normal');

  // Approval Modal/Inline state
  const [approvingReqId, setApprovingReqId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState('Roses#' + Math.floor(1000 + Math.random() * 9000));
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('Identity unconfirmed; please visit school administration office.');

  // Handle entity pick from existing records
  const handleEntitySelect = (entityId: string) => {
    setSelectedEntityId(entityId);
    if (userType === 'teacher') {
      const t = state.teachers.find((x) => x.id === entityId);
      if (t) {
        setName(t.name);
        setIdentifier(t.phone);
      }
    } else if (userType === 'family') {
      const f = state.families.find((x) => x.id === entityId);
      if (f) {
        setName(`${f.head} (${f.id})`);
        setIdentifier(f.phone);
      }
    } else if (userType === 'learner') {
      const l = state.learners.find((x) => x.id === entityId);
      if (l) {
        setName(`${l.name} (${l.grade})`);
        setIdentifier(l.adm);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) {
      onShowToast('Please provide the requester name and identifier');
      return;
    }

    sound.playCompleteChime();
    const finalReason = reason === 'Other' ? (customReason || 'Manual password change request') : reason;

    onSubmitRequest({
      userType,
      name: name.trim(),
      identifier: identifier.trim(),
      reason: finalReason,
      urgency,
    });

    // Reset form
    setName('');
    setIdentifier('');
    setSelectedEntityId('');
    setCustomReason('');
    setActiveTab('queue');
    setFilter('pending');
  };

  const handleStartApprove = (req: PasswordChangeRequest) => {
    sound.playClick(500);
    setApprovingReqId(req.id);
    setRejectingReqId(null);
    setTempPassword('Roses#' + Math.floor(1000 + Math.random() * 9000));
  };

  const handleConfirmApprove = (reqId: string) => {
    sound.playCompleteChime();
    onApproveRequest(reqId, tempPassword);
    setApprovingReqId(null);
  };

  const handleStartReject = (req: PasswordChangeRequest) => {
    sound.playClick(400);
    setRejectingReqId(req.id);
    setApprovingReqId(null);
    setRejectionNotes('Identity unconfirmed; please visit school administration office.');
  };

  const handleConfirmReject = (reqId: string) => {
    sound.playClick(350);
    onRejectRequest(reqId, rejectionNotes);
    setRejectingReqId(null);
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className={`relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-[#0E172A] border-white/20 text-white shadow-[0_0_35px_rgba(124,58,237,0.25)]'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-request-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 shrink-0 bg-gradient-to-r from-[#7C3AED]/20 via-purple-500/10 to-transparent flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] text-white flex items-center justify-center text-xl font-black shadow-md">
              🔐
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="password-request-modal-title" className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Password Change Requests
                </h2>
                {pendingCount > 0 && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Review credential change requests & issue temporary login credentials
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick(400);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="p-2 sm:px-5 bg-black/20 border-b border-white/10 flex gap-2 shrink-0">
          <button
            onClick={() => {
              sound.playClick(500);
              setActiveTab('queue');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'queue'
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📋 Review Queue</span>
            {pendingCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              sound.playClick(500);
              setActiveTab('submit');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'submit'
                ? 'bg-[#7C3AED] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>＋ Submit New Request</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'queue' ? (
            /* Tab 1: Review Queue */
            <div className="space-y-3">
              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(['pending', 'all', 'approved', 'rejected'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      sound.playClick(450);
                      setFilter(st);
                    }}
                    className={`py-1 px-3 rounded-full text-[11px] font-bold capitalize transition-all cursor-pointer shrink-0 ${
                      filter === st
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isDark
                        ? 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'pending'
                      ? `Pending (${pendingCount})`
                      : st === 'all'
                      ? `All (${requests.length})`
                      : st}
                  </button>
                ))}
              </div>

              {/* Requests List */}
              {filteredRequests.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border border-dashed border-white/15 p-6">
                  <span className="text-3xl block mb-2">🎉</span>
                  <div className="text-sm font-bold text-slate-300">
                    No {filter !== 'all' ? filter : ''} password change requests found
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    When teachers, parents, or learners request credential resets, they will appear here for administrative approval.
                  </p>
                  <button
                    onClick={() => setActiveTab('submit')}
                    className="mt-3 py-1.5 px-3 rounded-xl text-xs font-bold bg-[#7C3AED] text-white hover:bg-purple-700 cursor-pointer"
                  >
                    ＋ Submit a Request
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const isApproving = approvingReqId === req.id;
                    const isRejecting = rejectingReqId === req.id;

                    const roleBadgeColor =
                      req.userType === 'teacher'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : req.userType === 'family'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : req.userType === 'learner'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

                    const roleIcon =
                      req.userType === 'teacher' ? '👨‍🏫' : req.userType === 'family' ? '👨‍👩‍👧' : req.userType === 'learner' ? '🎓' : '🛡️';

                    const urgencyBadge =
                      req.urgency === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : req.urgency === 'urgent'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30';

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Request Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{roleIcon}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-100">
                                  {req.name}
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
                                  {req.userType}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                Identifier: {req.identifier}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                req.status === 'pending'
                                  ? 'bg-amber-500 text-slate-950 font-bold'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-rose-600 text-white'
                              }`}
                            >
                              {req.status}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {req.requestedAt}
                            </div>
                          </div>
                        </div>

                        {/* Request Body & Reason */}
                        <div className="p-2.5 rounded-xl bg-black/20 border border-white/5 text-xs text-slate-300 mb-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Reason for Request:</span>
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${urgencyBadge}`}>
                              {req.urgency} urgency
                            </span>
                          </div>
                          <p className="text-[11px] font-medium leading-relaxed">
                            {req.reason}
                          </p>
                        </div>

                        {/* Resolved Details if Approved/Rejected */}
                        {req.status === 'approved' && (
                          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 mb-2 space-y-0.5">
                            <div className="font-bold flex items-center gap-1">
                              <span>✓ Approved on {req.resolvedAt || 'Recently'}</span>
                            </div>
                            {req.tempPasswordGenerated && (
                              <div className="text-[10px] text-emerald-200">
                                Temporary Password Issued: <code className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-white">{req.tempPasswordGenerated}</code> (User prompted to change at next sign-in)
                              </div>
                            )}
                          </div>
                        )}

                        {req.status === 'rejected' && (
                          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 mb-2">
                            <span className="font-bold">✕ Request Rejected:</span> {req.notes || 'Verification failed'}
                          </div>
                        )}

                        {/* Inline Approval Form */}
                        {isApproving && (
                          <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-white space-y-3 animate-fade-in">
                            <div className="font-bold text-xs flex items-center gap-1.5 text-emerald-300">
                              <span>🔑</span>
                              <span>Generate Temporary Password for {req.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              In accordance with LRA specification, passwords are stored as cryptographic hashes. The administrator sets a temporary password, and the user must change it at next login.
                            </p>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Temporary Password / PIN
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={tempPassword}
                                  onChange={(e) => setTempPassword(e.target.value)}
                                  className="flex-1 bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-mono text-white"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => setTempPassword('Roses#' + Math.floor(1000 + Math.random() * 9000))}
                                  className="px-2.5 py-1 rounded-xl text-xs bg-white/10 hover:bg-white/20 text-slate-300 font-bold cursor-pointer"
                                  title="Generate new random password"
                                >
                                  🎲 New
                                </button>
                              </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => setApprovingReqId(null)}
                                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmApprove(req.id)}
                                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-black bg-[#16A34A] hover:bg-emerald-600 text-white shadow-sm cursor-pointer flex items-center justify-center gap-1"
                              >
                                <span>Confirm & Issue</span>
                                <span>✓</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Inline Rejection Form */}
                        {isRejecting && (
                          <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-white space-y-3 animate-fade-in">
                            <div className="font-bold text-xs flex items-center gap-1.5 text-rose-300">
                              <span>⚠️</span>
                              <span>Reject Request from {req.name}</span>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Reason for Rejection / Resolution Notes
                              </label>
                              <input
                                type="text"
                                value={rejectionNotes}
                                onChange={(e) => setRejectionNotes(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white"
                                required
                              />
                            </div>

                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => setRejectingReqId(null)}
                                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border border-white/20 bg-white/5 hover:bg-white/10 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleConfirmReject(req.id)}
                                className="flex-1 py-1.5 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer"
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons for Pending Request */}
                        {req.status === 'pending' && !isApproving && !isRejecting && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => handleStartApprove(req)}
                              className="flex-1 py-2 px-3 rounded-xl text-xs font-black bg-[#16A34A] hover:bg-emerald-600 text-white shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                            >
                              <span>✓ Approve & Set Temp Pass</span>
                            </button>
                            <button
                              onClick={() => handleStartReject(req)}
                              className="py-2 px-3 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 cursor-pointer transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Submit New Request */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs">
                <span className="font-bold">ℹ️ Note:</span> Submitting a request places it directly into the Administrator Review Queue.
              </div>

              {/* Role Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  User Role / Category
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['teacher', 'family', 'learner'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        sound.playClick(450);
                        setUserType(r);
                        setSelectedEntityId('');
                        setName('');
                        setIdentifier('');
                      }}
                      className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        userType === r
                          ? 'bg-[#7C3AED] text-white shadow-sm'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{r === 'teacher' ? '👨‍🏫' : r === 'family' ? '👨‍👩‍👧' : '🎓'}</span>
                      <span>{r === 'teacher' ? 'Teacher' : r === 'family' ? 'Family' : 'Learner'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Pick from Registered Database */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Quick Select Registered {userType === 'teacher' ? 'Educator' : userType === 'family' ? 'Household' : 'Student'}
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => handleEntitySelect(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="">— Choose from school records (optional) —</option>
                  {userType === 'teacher' &&
                    state.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.phone})
                      </option>
                    ))}
                  {userType === 'family' &&
                    state.families.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.head} · {f.id} ({f.phone})
                      </option>
                    ))}
                  {userType === 'learner' &&
                    state.learners.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} · {l.adm} ({l.grade})
                      </option>
                    ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Requester Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={userType === 'teacher' ? 'e.g. Mr. Peter Ochieng' : userType === 'family' ? 'e.g. Ali Hassan Mohammed' : 'e.g. Brian Kipkoech'}
                  className={`w-full p-2.5 rounded-xl text-xs border ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              {/* Identifier */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {userType === 'learner' ? 'Student Admission Number' : 'Registered Mobile Phone'}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={userType === 'learner' ? 'e.g. LRA/0002' : 'e.g. 0712 345 678'}
                  className={`w-full p-2.5 rounded-xl text-xs border font-mono ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Reason for Password Change
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs border font-medium ${
                    isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <option value="Forgotten existing password / PIN">Forgotten existing password / PIN</option>
                  <option value="Temporary password expired">Temporary password expired</option>
                  <option value="Switched to new smartphone / device">Switched to new smartphone / device</option>
                  <option value="Compromised or shared credential">Compromised or shared credential</option>
                  <option value="First-time sign-in assistance">First-time sign-in assistance</option>
                  <option value="Other">Other (enter custom details)</option>
                </select>

                {reason === 'Other' && (
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Describe reason for request"
                    className={`mt-2 w-full p-2.5 rounded-xl text-xs border ${
                      isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-200'
                    }`}
                    required
                  />
                )}
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Urgency Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'urgent', 'critical'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                        urgency === u
                          ? u === 'critical'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : u === 'urgent'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-[#7C3AED] hover:bg-purple-700 text-white shadow-md cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  <span>📨</span>
                  <span>Submit Request to Queue</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 sm:px-5 border-t border-white/10 bg-black/30 shrink-0 text-[10px] text-slate-400 flex items-center justify-between">
          <span>🛡️ Passwords encrypted as secure hashes</span>
          <span>Nairobi Standard Time</span>
        </div>
      </div>
    </div>
  );
};
