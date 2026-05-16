import AsyncStorage from '@react-native-async-storage/async-storage';
import { EntryRecord, UserProfile } from '@/types';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

const PROFILE_KEY = 'appleo.local.profiles';
const USERNAME_KEY = 'appleo.local.usernames';
const ENTRIES_KEY = 'appleo.local.entries';

type ProfileMap = Record<string, UserProfile>;
type UsernameMap = Record<string, string>;
type EntryMap = Record<string, EntryRecord[]>;

function entriesKey(uid: string) {
  return `${ENTRIES_KEY}:${uid}`;
}

export async function getLocalProfile(uid: string): Promise<UserProfile | null> {
  const profiles = await readJson<ProfileMap>(PROFILE_KEY, {});
  return profiles[uid] ?? null;
}

export async function putLocalProfile(profile: UserProfile): Promise<void> {
  const profiles = await readJson<ProfileMap>(PROFILE_KEY, {});
  profiles[profile.uid] = profile;
  await writeJson(PROFILE_KEY, profiles);
}

export async function getLocalProfileByUsername(usernameLower: string): Promise<UserProfile | null> {
  const usernames = await readJson<UsernameMap>(USERNAME_KEY, {});
  const uid = usernames[usernameLower];
  return uid ? getLocalProfile(uid) : null;
}

export async function putLocalUsername(usernameLower: string, uid: string): Promise<void> {
  const usernames = await readJson<UsernameMap>(USERNAME_KEY, {});
  usernames[usernameLower] = uid;
  await writeJson(USERNAME_KEY, usernames);
}

export async function getLocalEntries(uid: string): Promise<EntryRecord[]> {
  const perUser = await readJson<EntryRecord[]>(entriesKey(uid), []);
  if (perUser.length > 0) return perUser;
  // Migration: check old shared-map key and migrate on first read
  const legacyMap = await readJson<EntryMap>(ENTRIES_KEY, {});
  if (legacyMap[uid]?.length) {
    await writeJson(entriesKey(uid), legacyMap[uid]);
    return legacyMap[uid];
  }
  return [];
}

export async function setLocalEntries(uid: string, items: EntryRecord[]): Promise<void> {
  await writeJson(entriesKey(uid), items);
}

export async function upsertLocalEntry(uid: string, item: EntryRecord): Promise<void> {
  const current = await getLocalEntries(uid);
  const next = current
    .filter((entry) => entry.id !== item.id)
    .concat(item)
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  await setLocalEntries(uid, next);
}

export async function deleteLocalEntry(uid: string, id: string): Promise<void> {
  const current = await getLocalEntries(uid);
  await setLocalEntries(uid, current.filter((entry) => entry.id !== id));
}
