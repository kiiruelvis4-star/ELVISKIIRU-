import { useState, useEffect, useCallback } from 'react';
import {
  GradeName,
  Teacher,
  TimetableCell,
  TimetableSlotDef,
  SLOTS,
} from '../components/admin/types';
import { INITIAL_ADMIN_STATE } from '../components/admin/initialData';
import { ecosystemSync } from './ecosystemSync';
import { pushSchoolStateToCloud } from './cloudSync';

const ADMIN_STORAGE_KEY = 'lra_admin_v3';

export interface TimetableFreezeConfig {
  from: string;
  to: string;
  why: string;
}

export function getStoredTimetable(): Record<string, TimetableCell> {
  if (typeof window === 'undefined') return INITIAL_ADMIN_STATE.timetable;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.timetable) {
        return parsed.timetable;
      }
    }
  } catch (e) {
    console.warn('Failed to read timetable from storage:', e);
  }
  return INITIAL_ADMIN_STATE.timetable;
}

export function getStoredSlots(): TimetableSlotDef[] {
  if (typeof window === 'undefined') return SLOTS;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.timetableSlots) && parsed.timetableSlots.length > 0) {
        return parsed.timetableSlots;
      }
    }
  } catch (e) {
    console.warn('Failed to read timetableSlots from storage:', e);
  }
  return SLOTS;
}

export function getStoredFreeze(): TimetableFreezeConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.freeze) {
        return parsed.freeze;
      }
    }
  } catch (e) {
    console.warn('Failed to read freeze from storage:', e);
  }
  return null;
}

export function getStoredTeachers(): Teacher[] {
  if (typeof window === 'undefined') return INITIAL_ADMIN_STATE.teachers;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.teachers) && parsed.teachers.length > 0) {
        return parsed.teachers;
      }
    }
  } catch (e) {
    console.warn('Failed to read teachers from storage:', e);
  }
  return INITIAL_ADMIN_STATE.teachers;
}

function broadcastTimetableState(nextState: any, extraPayload?: Record<string, any>) {
  try {
    ecosystemSync.syncTimetable?.(nextState.timetable, nextState.freeze);
  } catch {
    // optional
  }

  try {
    if (typeof window !== 'undefined') {
      const payload = {
        timetable: nextState.timetable,
        timetableSlots: nextState.timetableSlots || SLOTS,
        freeze: nextState.freeze || null,
        teachers: nextState.teachers,
        ...(extraPayload || {}),
      };
      window.dispatchEvent(new CustomEvent('lra-admin-state-updated', { detail: nextState }));
      window.dispatchEvent(new CustomEvent('lra-timetable-updated', { detail: payload }));
      window.dispatchEvent(new Event('lra_data_sync'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn('Failed to dispatch broadcast events:', e);
  }

  // Push directly to centralized cloud database so all member devices receive the update
  pushSchoolStateToCloud({
    adminState: {
      timetable: nextState.timetable,
      timetableSlots: nextState.timetableSlots || SLOTS,
      freeze: nextState.freeze ?? null,
      teachers: nextState.teachers,
    },
  }).catch((err) => console.warn('Timetable cloud sync deferred:', err));
}

/**
 * Updates a timetable cell, adjusts teacher assignments (including gradeSubjects),
 * persists to storage, and broadcasts across all 4 portals & cloud devices.
 */
export function persistTimetableCellChange(
  day: string,
  slotKey: string,
  grade: GradeName,
  cell: TimetableCell | null
): {
  timetable: Record<string, TimetableCell>;
  slots: TimetableSlotDef[];
  teachers: Teacher[];
  freeze: TimetableFreezeConfig | null;
} {
  let adminState: any = { ...INITIAL_ADMIN_STATE };
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      adminState = { ...INITIAL_ADMIN_STATE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to read admin state:', e);
  }

  const key = `${day}|${slotKey}|${grade}`;
  const updatedTimetable = { ...(adminState.timetable || {}) };

  if (!cell) {
    delete updatedTimetable[key];
  } else {
    updatedTimetable[key] = cell;
  }

  // Ensure assigned teacher's profile includes this grade, subject, and gradeSubjects mapping
  let updatedTeachers: Teacher[] = [...(adminState.teachers || [])];
  if (cell && cell.teacherId) {
    updatedTeachers = updatedTeachers.map((t) => {
      if (t.id === cell.teacherId) {
        const grades = t.grades.includes(grade) ? t.grades : [...t.grades, grade];
        const subjects = t.subjects.includes(cell.subject) ? t.subjects : [...t.subjects, cell.subject];
        const existingGS = { ...(t.gradeSubjects || {}) };
        const gradeSubs = existingGS[grade] || [];
        if (!gradeSubs.includes(cell.subject)) {
          existingGS[grade] = [...gradeSubs, cell.subject];
        }
        return { ...t, grades, subjects, gradeSubjects: existingGS };
      }
      return t;
    });
  }

  const currentSlots: TimetableSlotDef[] =
    Array.isArray(adminState.timetableSlots) && adminState.timetableSlots.length > 0
      ? adminState.timetableSlots
      : SLOTS;

  const nextState = {
    ...adminState,
    timetable: updatedTimetable,
    timetableSlots: currentSlots,
    teachers: updatedTeachers,
  };

  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextState));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  broadcastTimetableState(nextState, {
    updatedGrade: grade,
    updatedDay: day,
    updatedSlot: slotKey,
    updatedCell: cell,
  });

  return {
    timetable: updatedTimetable,
    slots: currentSlots,
    teachers: updatedTeachers,
    freeze: nextState.freeze || null,
  };
}

/**
 * Updates editable time slots (labels, times, breaks) across all 4 portals & cloud devices
 */
export function persistTimetableSlotsChange(
  slots: TimetableSlotDef[]
): {
  timetable: Record<string, TimetableCell>;
  slots: TimetableSlotDef[];
  teachers: Teacher[];
  freeze: TimetableFreezeConfig | null;
} {
  let adminState: any = { ...INITIAL_ADMIN_STATE };
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      adminState = { ...INITIAL_ADMIN_STATE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to read admin state:', e);
  }

  const sanitizedSlots = slots.length > 0 ? slots : SLOTS;
  const nextState = {
    ...adminState,
    timetableSlots: sanitizedSlots,
  };

  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextState));
  } catch (e) {
    console.warn('Failed to save slots to localStorage:', e);
  }

  broadcastTimetableState(nextState, { updatedSlots: sanitizedSlots });

  return {
    timetable: nextState.timetable || {},
    slots: sanitizedSlots,
    teachers: nextState.teachers || [],
    freeze: nextState.freeze || null,
  };
}

/**
 * Freezes or unfreezes timetable across all 4 portals
 */
export function persistTimetableFreezeChange(
  freeze: TimetableFreezeConfig | null
): {
  timetable: Record<string, TimetableCell>;
  slots: TimetableSlotDef[];
  teachers: Teacher[];
  freeze: TimetableFreezeConfig | null;
} {
  let adminState: any = { ...INITIAL_ADMIN_STATE };
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      adminState = { ...INITIAL_ADMIN_STATE, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to read admin state:', e);
  }

  const nextState = {
    ...adminState,
    freeze,
  };

  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(nextState));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }

  broadcastTimetableState(nextState);

  return {
    timetable: nextState.timetable || {},
    slots:
      Array.isArray(nextState.timetableSlots) && nextState.timetableSlots.length > 0
        ? nextState.timetableSlots
        : SLOTS,
    teachers: nextState.teachers || [],
    freeze,
  };
}

/**
 * Universal React Hook that connects any portal to live timetable & editable time slot state
 */
export function useTimetableSync() {
  const [timetable, setTimetable] = useState<Record<string, TimetableCell>>(getStoredTimetable);
  const [slots, setSlots] = useState<TimetableSlotDef[]>(getStoredSlots);
  const [freeze, setFreeze] = useState<TimetableFreezeConfig | null>(getStoredFreeze);
  const [teachers, setTeachers] = useState<Teacher[]>(getStoredTeachers);

  const reloadFromStorage = useCallback(() => {
    setTimetable(getStoredTimetable());
    setSlots(getStoredSlots());
    setFreeze(getStoredFreeze());
    setTeachers(getStoredTeachers());
  }, []);

  useEffect(() => {
    const handleTimetableUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.timetable) setTimetable(e.detail.timetable);
        if (Array.isArray(e.detail.timetableSlots) && e.detail.timetableSlots.length > 0) {
          setSlots(e.detail.timetableSlots);
        }
        if (e.detail.freeze !== undefined) setFreeze(e.detail.freeze);
        if (e.detail.teachers) setTeachers(e.detail.teachers);
      } else {
        reloadFromStorage();
      }
    };

    const handleAdminStateUpdate = (e: any) => {
      if (e.detail) {
        if (e.detail.timetable) setTimetable(e.detail.timetable);
        if (Array.isArray(e.detail.timetableSlots) && e.detail.timetableSlots.length > 0) {
          setSlots(e.detail.timetableSlots);
        }
        if (e.detail.freeze !== undefined) setFreeze(e.detail.freeze);
        if (e.detail.teachers) setTeachers(e.detail.teachers);
      } else {
        reloadFromStorage();
      }
    };

    const handleStorageOrSync = () => {
      reloadFromStorage();
    };

    window.addEventListener('lra-timetable-updated', handleTimetableUpdate);
    window.addEventListener('lra-admin-state-updated', handleAdminStateUpdate);
    window.addEventListener('lra_data_sync', handleStorageOrSync);
    window.addEventListener('storage', handleStorageOrSync);

    return () => {
      window.removeEventListener('lra-timetable-updated', handleTimetableUpdate);
      window.removeEventListener('lra-admin-state-updated', handleAdminStateUpdate);
      window.removeEventListener('lra_data_sync', handleStorageOrSync);
      window.removeEventListener('storage', handleStorageOrSync);
    };
  }, [reloadFromStorage]);

  const isFrozen = !!(
    freeze &&
    new Date() >= new Date(freeze.from) &&
    new Date() <= new Date(freeze.to)
  );

  const getTeacherName = useCallback(
    (teacherId: string) => {
      const t = teachers.find((x) => x.id === teacherId);
      return t ? t.name : 'Faculty Teacher';
    },
    [teachers]
  );

  return {
    timetable,
    slots,
    freeze,
    teachers,
    isFrozen,
    getTeacherName,
    saveCell: persistTimetableCellChange,
    saveSlots: persistTimetableSlotsChange,
    setFreezeState: persistTimetableFreezeChange,
    refresh: reloadFromStorage,
  };
}
