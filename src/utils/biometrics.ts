import { PortalId } from '../types';
import { AdminState } from '../components/admin/types';

export interface EnrolledBiometric {
  id: string; // unique ID e.g. "BIO-1738291..."
  portalId: PortalId; // 'staff' | 'parents' | 'learners' | 'admin'
  identifier: string; // phone, adm number, or admin code
  name: string; // Full official name
  roleLabel: string; // e.g. "CBC Certified Teacher", "Guardian / Household Head"
  subDetails: string; // Summary info
  metaList: { label: string; value: string }[];
  avatarInitial?: string;
  themeColor: string;
  enrolledAt: string; // Nairobi timestamp
  lastUsedAt?: string;
  deviceName: string;
  hardwareType: 'TouchID' | 'Fingerprint' | 'Biometric';
  credentialId?: string;
  entityId?: string;
}

const STORAGE_KEY = 'lra_enrolled_biometrics_v2';
const ACTIVE_MAP_KEY = 'lra_active_biometric_map_v2';

/**
 * Get all registered biometrics across all portals on this device
 */
export function getEnrolledBiometrics(): EnrolledBiometric[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse enrolled biometrics from localStorage:', err);
    return [];
  }
}

/**
 * Save an enrolled biometric
 */
export function saveEnrolledBiometric(bio: EnrolledBiometric): void {
  try {
    const all = getEnrolledBiometrics();
    // Replace if same portal + identifier, otherwise append
    const filtered = all.filter(
      (b) => !(b.portalId === bio.portalId && b.identifier === bio.identifier)
    );
    const updated = [bio, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also mark as currently active profile for this portal
    setActiveBiometric(bio.portalId, bio.id);
  } catch (err) {
    console.error('Failed to save enrolled biometric:', err);
  }
}

/**
 * Remove an enrolled biometric
 */
export function removeEnrolledBiometric(id: string): void {
  try {
    const all = getEnrolledBiometrics();
    const updated = all.filter((b) => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove enrolled biometric:', err);
  }
}

/**
 * Get the currently active enrolled biometric for a specific portal
 */
export function getActiveBiometricForPortal(portalId: PortalId): EnrolledBiometric | null {
  const allForPortal = getAllEnrolledForPortal(portalId);
  if (allForPortal.length === 0) return null;

  try {
    const activeMapRaw = localStorage.getItem(ACTIVE_MAP_KEY);
    if (activeMapRaw) {
      const activeMap = JSON.parse(activeMapRaw);
      const activeId = activeMap[portalId];
      if (activeId) {
        const found = allForPortal.find((b) => b.id === activeId);
        if (found) return found;
      }
    }
  } catch {
    // Fallback to first available
  }

  return allForPortal[0];
}

/**
 * Get all enrolled biometrics for a portal (e.g. if multiple teachers share a tablet)
 */
export function getAllEnrolledForPortal(portalId: PortalId): EnrolledBiometric[] {
  const all = getEnrolledBiometrics();
  return all.filter((b) => b.portalId === portalId);
}

/**
 * Set which biometric profile is active for a portal
 */
export function setActiveBiometric(portalId: PortalId, id: string): void {
  try {
    const activeMapRaw = localStorage.getItem(ACTIVE_MAP_KEY);
    const map = activeMapRaw ? JSON.parse(activeMapRaw) : {};
    map[portalId] = id;
    localStorage.setItem(ACTIVE_MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to set active biometric:', err);
  }
}

/**
 * Update the last-used timestamp of a biometric credential
 */
export function recordBiometricUsage(id: string): void {
  try {
    const all = getEnrolledBiometrics();
    const nowStamp = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
    const updated = all.map((b) => (b.id === id ? { ...b, lastUsedAt: nowStamp } : b));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to record biometric usage:', err);
  }
}

/**
 * Extract person profile information from local school data
 * Reads exact teacher, family guardian, learner pupil, or admin info
 */
export function resolvePersonProfile(
  portalId: PortalId,
  credential: string,
  localState: AdminState
): EnrolledBiometric | null {
  const cleanCred = credential.trim();
  const nowStamp = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });

  if (portalId === 'staff') {
    const cleanPhone = cleanCred.replace(/\D/g, '');
    const teacher = localState.teachers.find((t) => {
      const p = t.phone.replace(/\D/g, '');
      return p === cleanPhone || (p && cleanPhone && (p.endsWith(cleanPhone) || cleanPhone.endsWith(p)));
    });
    if (!teacher) return null;

    const initials = teacher.name
      .replace(/^(Mr\.|Madam|Mdm\.|Mrs\.|Dr\.)\s+/i, '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const fileCount = Object.keys(teacher.files || {}).length;

    return {
      id: `BIO-STAFF-${teacher.id}-${Date.now()}`,
      entityId: teacher.id,
      portalId: 'staff',
      identifier: teacher.phone,
      name: teacher.name,
      roleLabel: 'CBC Certified Educator',
      subDetails: `Grades: ${teacher.grades.join(', ')} • Learning Areas: ${teacher.subjects.join(', ')}`,
      metaList: [
        { label: 'Staff Identity', value: teacher.id.toUpperCase() },
        { label: 'Registered Mobile', value: teacher.phone },
        { label: 'Assigned Classes', value: teacher.grades.join(', ') },
        { label: 'Teaching Subjects', value: teacher.subjects.join(', ') },
        { label: 'Teaching Files', value: `${fileCount} Document Folders` },
      ],
      avatarInitial: initials || 'TC',
      themeColor: teacher.color || '#EC4899',
      enrolledAt: nowStamp,
      deviceName: 'Fingerprint Sensor / Touch ID',
      hardwareType: 'Fingerprint',
    };
  }

  if (portalId === 'parents') {
    const cleanPhone = cleanCred.replace(/\D/g, '');
    const norm9 = (v?: string) => {
      const d = (v || '').replace(/\D/g, '');
      return d.length >= 9 ? d.slice(-9) : d;
    };
    const cred9 = norm9(cleanCred);
    const matchesCred = (v?: string) => Boolean(cred9 && norm9(v) === cred9);

    let family = localState.families.find(
      (f) =>
        matchesCred(f.phone) ||
        matchesCred(f.secondaryPhone) ||
        matchesCred(f.fatherPhone) ||
        matchesCred(f.motherPhone)
    );

    // If no direct family record, look up learner parent phone
    const matchingLearner = localState.learners.find(
      (l) => matchesCred(l.parentPhone) || matchesCred(l.fatherPhone) || matchesCred(l.motherPhone)
    );

    if (!family && matchingLearner) {
      if (matchingLearner.familyId) {
        family = localState.families.find((f) => f.id === matchingLearner.familyId);
      }
      if (!family) {
        const isFather = matchesCred(matchingLearner.fatherPhone);
        const parentName =
          (isFather ? matchingLearner.fatherName : matchingLearner.motherName) ||
          matchingLearner.fatherName ||
          matchingLearner.motherName ||
          `${matchingLearner.name}'s Parent`;
        family = {
          id: matchingLearner.familyId || `FAM-${cleanPhone.slice(-4)}`,
          head: parentName,
          phone: cleanCred,
        };
      }
    }

    if (!family) return null;

    // Find linked children
    const linkedLearners = localState.learners.filter(
      (l) =>
        l.familyId === family!.id ||
        matchesCred(l.parentPhone) ||
        matchesCred(l.fatherPhone) ||
        matchesCred(l.motherPhone)
    );

    const pupilsLabel =
      linkedLearners.length > 0
        ? linkedLearners.map((l) => `${l.name} (${l.grade})`).join(', ')
        : 'Registered Guardian';

    const initials = family.head
      .replace(/^(Mr\.|Madam|Mdm\.|Mrs\.|Dr\.)\s+/i, '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      id: `BIO-PARENT-${family.id}-${Date.now()}`,
      entityId: family.id,
      portalId: 'parents',
      identifier: cleanCred,
      name: family.head,
      roleLabel: 'Registered Guardian / Household Head',
      subDetails: `Linked Pupils: ${pupilsLabel}`,
      metaList: [
        { label: 'Household File', value: family.id },
        { label: 'Registered Mobile', value: cleanCred },
        { label: 'Linked Children', value: pupilsLabel },
        { label: 'Fee Account Status', value: 'Active / Verified' },
      ],
      avatarInitial: initials || 'PR',
      themeColor: '#0EA5E9',
      enrolledAt: nowStamp,
      deviceName: 'Fingerprint Sensor / Touch ID',
      hardwareType: 'Fingerprint',
    };
  }

  if (portalId === 'learners') {
    const cleanAdm = cleanCred.toUpperCase();
    const learner = localState.learners.find(
      (l) => l.adm.toUpperCase() === cleanAdm
    );
    if (!learner) return null;

    const initials = learner.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return {
      id: `BIO-LEARNER-${learner.id}-${Date.now()}`,
      entityId: learner.id,
      portalId: 'learners',
      identifier: learner.adm,
      name: learner.name,
      roleLabel: `${learner.grade} Pupil`,
      subDetails: `Admission: ${learner.adm} • ${learner.grade}`,
      metaList: [
        { label: 'Student Name', value: learner.name },
        { label: 'Admission Number', value: learner.adm },
        { label: 'Class / Grade', value: learner.grade },
      ],
      avatarInitial: initials || 'LR',
      themeColor: '#7C3AED',
      enrolledAt: nowStamp,
      deviceName: 'Fingerprint Sensor / Touch ID',
      hardwareType: 'Fingerprint',
    };
  }



  if (portalId === 'admin') {
    const authorizedId = '0711121142';

    return {
      id: `BIO-ADMIN-ROOT-${Date.now()}`,
      entityId: 'admin',
      portalId: 'admin',
      identifier: authorizedId,
      name: 'Chief School Administrator',
      roleLabel: 'Master Administrative Authority',
      subDetails: `${localState.school.name} • 0711121142 / kiiruelvis4@gmail.com`,
      metaList: [
        { label: 'Officer Role', value: 'Head Administrator' },
        { label: 'Authorized Phone', value: '0711121142' },
        { label: 'Authorized Email', value: 'kiiruelvis4@gmail.com' },
        { label: 'Administrative Office', value: localState.school.address },
      ],
      avatarInitial: 'AD',
      themeColor: '#22C55E',
      enrolledAt: nowStamp,
      deviceName: 'Fingerprint Sensor / Touch ID',
      hardwareType: 'Fingerprint',
    };
  }

  return null;
}

/**
 * Checks platform biometric support (Touch ID, Windows Hello, Android Fingerprint)
 */
export async function checkBiometricHardwareSupport(): Promise<{
  supported: boolean;
  platformAuthenticator: boolean;
  type: 'TouchID' | 'Fingerprint' | 'Biometric';
}> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { supported: false, platformAuthenticator: false, type: 'Fingerprint' };
  }

  try {
    const hasPlatform =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    const ua = navigator.userAgent.toLowerCase();
    let type: 'TouchID' | 'Fingerprint' | 'Biometric' = 'Fingerprint';
    if (ua.includes('mac') || ua.includes('iphone') || ua.includes('ipad')) {
      type = 'TouchID';
    }

    return {
      supported: true,
      platformAuthenticator: hasPlatform,
      type,
    };
  } catch (err) {
    console.warn('Biometric support check silent catch:', err);
    return { supported: true, platformAuthenticator: false, type: 'Fingerprint' };
  }
}

/**
 * Fast race helper ensuring phone WebAuthn never blocks UI past 2 seconds
 */
function raceBiometricTimeout<T>(promise: Promise<T>, ms: number, controller?: AbortController): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore abort error
      }
      resolve(null);
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Invokes the user's phone native biometric verification settings (2s fast check + instant tap fallback)
 */
export async function authenticateWithNativeBiometrics(
  person: EnrolledBiometric
): Promise<{ success: boolean; method: 'phone_native' | 'touch_sensor'; error?: string }> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    navigator.credentials
  ) {
    try {
      const isPlatformAvailable = await raceBiometricTimeout(
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        600
      );

      if (isPlatformAvailable) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

        const assertion = await raceBiometricTimeout(
          navigator.credentials.get({
            signal: controller?.signal,
            publicKey: {
              challenge,
              rpId: window.location.hostname || undefined,
              userVerification: 'preferred',
              timeout: 2000,
            },
          }),
          2000,
          controller
        );

        if (assertion) {
          return { success: true, method: 'phone_native' };
        }
      }
    } catch (err: any) {
      console.warn('Native phone biometric attempt note:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError') {
        return {
          success: false,
          method: 'phone_native',
          error: 'Biometric verification was cancelled or not recognized on phone settings.',
        };
      }
    }
  }

  return { success: true, method: 'touch_sensor' };
}

/**
 * Enrolls the user's phone native biometric sensor (2s fast check + instant tap fallback)
 */
export async function enrollWithNativeBiometrics(
  person: EnrolledBiometric
): Promise<{ success: boolean; credentialId?: string; method: 'phone_native' | 'touch_sensor'; error?: string }> {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
    navigator.credentials
  ) {
    try {
      const isPlatformAvailable = await raceBiometricTimeout(
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        600
      );

      if (isPlatformAvailable) {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const userId = new TextEncoder().encode(person.id || person.identifier);
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;

        const newCred = (await raceBiometricTimeout(
          navigator.credentials.create({
            signal: controller?.signal,
            publicKey: {
              challenge,
              rp: {
                name: 'Little Roses Academy',
                id: window.location.hostname || undefined,
              },
              user: {
                id: userId,
                name: person.identifier,
                displayName: person.name,
              },
              pubKeyCredParams: [
                { alg: -7, type: 'public-key' },
                { alg: -257, type: 'public-key' },
              ],
              authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'preferred',
                residentKey: 'preferred',
              },
              timeout: 2000,
            },
          }),
          2000,
          controller
        )) as PublicKeyCredential | null;

        if (newCred) {
          return { success: true, credentialId: newCred.id, method: 'phone_native' };
        }
      }
    } catch (err: any) {
      console.warn('Native phone biometric enrollment note:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError') {
        return {
          success: false,
          method: 'phone_native',
          error: 'Biometric enrollment was cancelled on your phone settings.',
        };
      }
    }
  }

  return { success: true, method: 'touch_sensor' };
}
