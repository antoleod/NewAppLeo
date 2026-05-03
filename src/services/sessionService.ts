import { collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SessionItem {
  id: string;
  email: string;
  device: string;
  isOwner: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function sessionsRef(uid: string) {
  return collection(db, 'users', uid, 'sessions');
}

export async function createSession(uid: string, email: string) {
  const device = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : 'Mobile device';
  const id = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
  const ownerProbe = await getDocs(query(sessionsRef(uid), limit(1)));
  const isOwner = ownerProbe.empty;
  await setDoc(doc(db, 'users', uid, 'sessions', id), {
    email,
    device,
    isOwner,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export function watchSessions(uid: string, onChange: (items: SessionItem[]) => void) {
  const q = query(sessionsRef(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    onChange(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SessionItem, 'id'>),
      })),
    );
  });
}

export async function deleteSession(uid: string, session: SessionItem) {
  if (session.isOwner) {
    throw new Error('Owner session cannot be removed.');
  }
  await deleteDoc(doc(db, 'users', uid, 'sessions', session.id));
}
