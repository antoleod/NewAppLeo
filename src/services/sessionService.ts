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
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  const probe = await getDocs(query(sessionsRef(uid), limit(1)));
  const isOwner = probe.empty;

  await setDoc(doc(db, 'users', uid, 'sessions', id), {
    email,
    device,
    platform,
    isOwner,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
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
