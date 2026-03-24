import { arrayUnion, collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '@/lib/firebase';

export interface PairingSession {
  code: string;
  hostUid: string;
  memberUids: string[];
  status: 'pending' | 'paired';
  createdAt?: string;
  updatedAt?: string;
}

const PAIRING_KEY = 'appleo.pairingSession';
const COLLECTION = 'pairingSessions';

function createCode() {
  const raw = globalThis.crypto?.getRandomValues ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(3))) : [1, 2, 3];
  return raw.map((value) => String(value % 10)).join('').padEnd(6, '0').slice(0, 6);
}

function normalizeCode(code: string) {
  return code.replace(/\D/g, '').slice(0, 6).padEnd(6, '0');
}

async function saveLocal(session: PairingSession | null) {
  if (!session) {
    await AsyncStorage.removeItem(PAIRING_KEY);
    return;
  }
  await AsyncStorage.setItem(PAIRING_KEY, JSON.stringify(session));
}

export async function getLocalPairingSession() {
  const raw = await AsyncStorage.getItem(PAIRING_KEY);
  return raw ? (JSON.parse(raw) as PairingSession) : null;
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

  await saveLocal(session);
  return session;
}

export async function joinPairingSession(codeInput: string, uid: string) {
  const code = normalizeCode(codeInput);
  const ref = doc(collection(db, COLLECTION), code);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const local = await getLocalPairingSession();
    if (!local || local.code !== code) {
      throw new Error('Pairing code not found.');
    }
    const nextLocal: PairingSession = {
      ...local,
      memberUids: Array.from(new Set([...local.memberUids, uid])),
      status: 'paired',
      updatedAt: new Date().toISOString(),
    };
    await saveLocal(nextLocal);
    return nextLocal;
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

  await saveLocal(next);
  return next;
}

export function watchPairingSession(code: string, onChange: (session: PairingSession | null) => void) {
  const ref = doc(collection(db, COLLECTION), normalizeCode(code));
  return onSnapshot(
    ref,
    (snapshot) => {
      onChange(snapshot.exists() ? ({ ...(snapshot.data() as PairingSession), code: normalizeCode(code) } as PairingSession) : null);
    },
    async () => {
      onChange(await getLocalPairingSession());
    },
  );
}
