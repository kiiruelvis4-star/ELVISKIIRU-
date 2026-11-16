import { Family, Learner } from '../components/admin/types';
import { generate6CharPassword } from './learnerPasswordUtils';

export function normPhone9(p?: string): string {
  const digits = String(p || '').replace(/\D/g, '');
  return digits.length >= 9 ? digits.slice(-9) : digits;
}

export function samePhone(a?: string, b?: string): boolean {
  const n1 = normPhone9(a);
  const n2 = normPhone9(b);
  return Boolean(n1 && n2 && n1 === n2);
}

/**
 * Collect all normalized phone numbers belonging to a Family record
 */
export function getFamilyPhones(fam: Family): string[] {
  const raw = [fam.phone, fam.secondaryPhone, fam.fatherPhone, fam.motherPhone].filter(Boolean) as string[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of raw) {
    const n = normPhone9(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(p.trim());
    }
  }
  return out;
}

/**
 * Collect all normalized phone numbers belonging to a Learner's parents/guardians
 */
export function getLearnerParentPhones(l: Learner): string[] {
  const raw = [l.fatherPhone, l.motherPhone, l.parentPhone].filter(Boolean) as string[];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of raw) {
    const n = normPhone9(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(p.trim());
    }
  }
  return out;
}

/**
 * Reconciles families from learners so that:
 * 1. EVERY learner (even if a family has only 1 learner) has an entry under Families.
 * 2. Both Father/Grandfather and Mother/Grandmother phone numbers link to that same Family.
 * 3. Each Family has ONE shared 6-character AI-generated password recognized by both parent numbers.
 */
export function reconcileFamiliesFromLearners(
  learners: Learner[],
  existingFamilies: Family[]
): { learners: Learner[]; families: Family[]; changed: boolean } {
  let changed = false;
  const families: Family[] = existingFamilies.map((f) => ({ ...f }));

  // Ensure every existing family has a 6-character shared password
  for (let i = 0; i < families.length; i++) {
    if (!families[i].passHash || families[i].passHash!.trim().length < 4) {
      families[i] = {
        ...families[i],
        passHash: generate6CharPassword(families[i].head || 'Parent', families[i].id),
      };
      changed = true;
    }
  }

  const nextFamNumber = () => {
    let maxNum = families.length;
    for (const f of families) {
      const m = f.id.match(/(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    }
    return `FAM-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const updatedLearners: Learner[] = learners.map((l) => {
    const lPhones = getLearnerParentPhones(l);

    // 1. Try matching by explicit familyId first
    let famIdx = l.familyId ? families.findIndex((f) => f.id === l.familyId) : -1;

    // 2. Otherwise match by ANY parent/guardian phone number on the learner
    if (famIdx === -1 && lPhones.length > 0) {
      famIdx = families.findIndex((f) => {
        const fPhones = getFamilyPhones(f);
        return lPhones.some((lp) => fPhones.some((fp) => samePhone(lp, fp)));
      });
    }

    if (famIdx !== -1) {
      const fam = { ...families[famIdx] };
      let famUpdated = false;

      if (l.fatherName && !fam.fatherName) {
        fam.fatherName = l.fatherName;
        famUpdated = true;
      }
      if (l.fatherRole && !fam.fatherRole) {
        fam.fatherRole = l.fatherRole;
        famUpdated = true;
      }
      if (l.fatherPhone && !fam.fatherPhone) {
        fam.fatherPhone = l.fatherPhone;
        famUpdated = true;
      }
      if (l.motherName && !fam.motherName) {
        fam.motherName = l.motherName;
        famUpdated = true;
      }
      if (l.motherRole && !fam.motherRole) {
        fam.motherRole = l.motherRole;
        famUpdated = true;
      }
      if (l.motherPhone && !fam.motherPhone) {
        fam.motherPhone = l.motherPhone;
        famUpdated = true;
      }

      // Ensure primary & secondary phones hold both distinct guardian numbers
      const primary = fam.phone || l.fatherPhone || l.parentPhone || l.motherPhone || '';
      if (primary && fam.phone !== primary) {
        fam.phone = primary;
        famUpdated = true;
      }
      const otherPhone = lPhones.find((p) => !samePhone(p, primary));
      if (otherPhone && !samePhone(fam.secondaryPhone, otherPhone)) {
        fam.secondaryPhone = otherPhone;
        famUpdated = true;
      }

      if (famUpdated) {
        families[famIdx] = fam;
        changed = true;
      }

      if (l.familyId !== fam.id) {
        changed = true;
        return { ...l, familyId: fam.id };
      }
      return l;
    }

    // 3. Create a brand-new Family even if it's just ONE learner
    const newId = l.familyId && !families.some((f) => f.id === l.familyId) ? l.familyId : nextFamNumber();
    const headName =
      l.fatherName ||
      l.motherName ||
      `${l.name.split(' ')[0]}'s Family`;
    const primaryPhone = l.fatherPhone || l.parentPhone || l.motherPhone || '';
    const secondaryPhone = lPhones.find((p) => !samePhone(p, primaryPhone)) || undefined;

    const newFam: Family = {
      id: newId,
      head: headName,
      phone: primaryPhone,
      secondaryPhone,
      fatherRole: l.fatherRole || 'Father',
      fatherName: l.fatherName,
      fatherPhone: l.fatherPhone,
      motherRole: l.motherRole || 'Mother',
      motherName: l.motherName,
      motherPhone: l.motherPhone,
      passwordReset: false,
      passHash: generate6CharPassword(headName, newId),
    };

    families.push(newFam);
    changed = true;

    return {
      ...l,
      familyId: newId,
    };
  });

  return { learners: updatedLearners, families, changed };
}
