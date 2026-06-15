import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface SessionItem {
  id: string;
  email: string;
  device: string;
  platform: 'ios' | 'android' | 'web';
  isOwner: boolean;
  createdAt?: string;
  lastActiveAt?: string;
}

function sessionKey(uid: string) {
  return `appleo.session.current.${uid}`;
}

function sessionsRef(uid: string) {
  return collection(db, 'users', uid, 'sessions');
}

function parseDeviceInfo(): { device: string; platform: 'ios' | 'android' | 'web' } {
  const os = Platform.OS as string;

  if (os === 'ios') return { device: 'iPhone / iPad', platform: 'ios' };
  if (os === 'android') return { device: 'Android device', platform: 'android' };

  if (typeof navigator === 'undefined') return { device: 'Unknown device', platform: 'web' };
  const ua = navigator.userAgent;

  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

  let system = 'Desktop';
  if (ua.includes('iPhone')) system = 'iPhone';
  else if (ua.includes('iPad')) system = 'iPad';
  else if (ua.includes('Android')) system = 'Android';
  else if (ua.includes('Windows')) system = 'Windows';
  else if (ua.includes('Mac OS X')) system = 'macOS';
  else if (ua.includes('Linux')) system = 'Linux';

  return { device: `${browser} on ${system}`, platform: 'web' };
}

function tsToIso(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as Timestamp).toDate().toISOString();
  }
  return undefined;
}

export async function getSessionsOnce(uid: string): Promise<SessionItem[]> {
  try {
    const snap = await getDocs(query(sessionsRef(uid), orderBy('createdAt', 'desc'), limit(20)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        email: String(data.email ?? ''),
        device: String(data.device ?? 'Unknown device'),
        platform: (data.platform ?? 'web') as SessionItem['platform'],
        isOwner: Boolean(data.isOwner),
        createdAt: tsToIso(data.createdAt),
        lastActiveAt: tsToIso(data.lastActiveAt),
      };
    });
  } catch {
    return [];
  }
}

export async function registerSessionForHost(
  hostUid: string,
  joinerEmail: string,
  pairingCode: string,
): Promise<void> {
  const { device, platform } = parseDeviceInfo();
  const id = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
  await setDoc(doc(db, 'users', hostUid, 'sessions', id), {
    email: joinerEmail,
    device,
    platform,
    isOwner: false,
    pairingCode,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });
}

export async function registerCurrentSession(uid: string, email: string): Promise<string> {
  const stored = await AsyncStorage.getItem(sessionKey(uid));

  if (stored) {
    updateDoc(doc(db, 'users', uid, 'sessions', stored), {
      lastActiveAt: serverTimestamp(),
    }).catch(() => {});
    return stored;
  }

  const { device, platform } = parseDeviceInfo();
  const id = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
  const sessionDoc = doc(db, 'users', uid, 'sessions', id);

  // Use a transaction so only the very first session ever gets isOwner:true,
  // even if two devices register simultaneously.
  await runTransaction(db, async (tx) => {
    const existing = await getDocs(query(sessionsRef(uid), limit(1)));
    const isOwner = existing.empty;
    tx.set(sessionDoc, {
      email,
      device,
      platform,
      isOwner,
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
  });

  await AsyncStorage.setItem(sessionKey(uid), id);
  return id;
}

export async function getCurrentSessionId(uid: string): Promise<string | null> {
  return AsyncStorage.getItem(sessionKey(uid));
}

export async function clearCurrentSession(uid: string): Promise<void> {
  await AsyncStorage.removeItem(sessionKey(uid));
}

export function watchSessions(uid: string, onChange: (items: SessionItem[]) => void) {
  const q = query(sessionsRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onChange(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            email: String(data.email ?? ''),
            device: String(data.device ?? 'Unknown device'),
            platform: (data.platform ?? 'web') as SessionItem['platform'],
            isOwner: Boolean(data.isOwner),
            createdAt: tsToIso(data.createdAt),
            lastActiveAt: tsToIso(data.lastActiveAt),
          };
        }),
      );
    },
    () => onChange([]),
  );
}

export async function deleteSession(uid: string, session: SessionItem): Promise<void> {
  if (session.isOwner) throw new Error('Owner session cannot be removed.');
  await deleteDoc(doc(db, 'users', uid, 'sessions', session.id));
}
