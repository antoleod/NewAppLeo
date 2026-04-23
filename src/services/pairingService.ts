import { arrayUnion, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface PairingSession {
  code: string;
  hostUid: string;
  memberUids: string[];
  status: 'pending' | 'paired';
  createdAt?: string;
  updatedAt?: string;
}

const COLLECTION = 'pairingSessions';
const PAIRING_EVENT = 'babyflow:pairing-session-changed';

function emitPairingChange() {
  try {
    globalThis.dispatchEvent?.(new Event(PAIRING_EVENT));
  } catch {
    // ignore
  }
}

function createCode() {
  const raw = globalThis.crypto?.getRandomValues ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3))) : [1, 2, 3];
  return raw.map((value) => String(value % 10)).join('').padEnd(6, '0').slice(0, 6);
}

function normalizeCode(code: string) {
  return code.replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
}

async function saveLocal(session: PairingSession | null) {
  void session;
  emitPairingChange();
}

export async function getLocalPairingSession(): Promise<PairingSession | null> {
  return null;
}

export async function createPairingSession(hostUid: string) {
  const code = createCode();
  const session: PairingSession = {
    code,
    hostUid,
    memberUids: [hostUid],
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(collection(db, COLLECTION), code), {
      ...session,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    await saveLocal(session);
  }
  return session;
}

export async function joinPairingSession(codeInput: string, uid: string) {
  const code = normalizeCode(codeInput);
  const ref = doc(collection(db, COLLECTION), code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Pairing code not found.');
  }

  const data = snap.data() as PairingSession;
  const next: PairingSession = {
    ...data,
    code,
    hostUid: data.hostUid,
    memberUids: Array.from(new Set([...(data.memberUids ?? []), uid])),
    status: 'paired',
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(
      ref,
      {
        memberUids: arrayUnion(uid),
        status: 'paired',
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  } catch {
    await saveLocal(next);
  }
  return next;
}

export async function getActivePairingScope(defaultUid: string) {
  const session = await getLocalPairingSession();
  return session?.status ? session.code : defaultUid;
}

export function subscribeToPairingSessionChanges(onChange: () => void) {
  const handler = () => onChange();
  globalThis.addEventListener?.(PAIRING_EVENT, handler as EventListener);
  return () => {
    globalThis.removeEventListener?.(PAIRING_EVENT, handler as EventListener);
  };
}

export function watchPairingSession(code: string, onChange: (session: PairingSession | null) => void) {
  const ref = doc(collection(db, COLLECTION), normalizeCode(code));
  return onSnapshot(
    ref,
    (snapshot) => {
      onChange(snapshot.exists() ? ({ ...(snapshot.data() as PairingSession), code: normalizeCode(code) } as PairingSession) : null);
    },
    () => {
      onChange(null);
    },
  );
}
