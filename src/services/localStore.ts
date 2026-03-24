import { EntryRecord, UserProfile } from '@/types';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
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

export function getLocalProfile(uid: string) {
  const profiles = readJson<ProfileMap>(PROFILE_KEY, {});
  return profiles[uid] ?? null;
}

export function putLocalProfile(profile: UserProfile) {
  const profiles = readJson<ProfileMap>(PROFILE_KEY, {});
  profiles[profile.uid] = profile;
  writeJson(PROFILE_KEY, profiles);
}

export function getLocalProfileByUsername(usernameLower: string) {
  const usernames = readJson<UsernameMap>(USERNAME_KEY, {});
  const uid = usernames[usernameLower];
  return uid ? getLocalProfile(uid) : null;
}

export function putLocalUsername(usernameLower: string, uid: string) {
  const usernames = readJson<UsernameMap>(USERNAME_KEY, {});
  usernames[usernameLower] = uid;
  writeJson(USERNAME_KEY, usernames);
}

export function getLocalEntries(uid: string) {
  const entries = readJson<EntryMap>(ENTRIES_KEY, {});
  return entries[uid] ?? [];
}

export function setLocalEntries(uid: string, items: EntryRecord[]) {
  const entries = readJson<EntryMap>(ENTRIES_KEY, {});
  entries[uid] = items;
  writeJson(ENTRIES_KEY, entries);
}

export function upsertLocalEntry(uid: string, item: EntryRecord) {
  const current = getLocalEntries(uid);
  const next = current.filter((entry) => entry.id !== item.id).concat(item).sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  setLocalEntries(uid, next);
}

export function deleteLocalEntry(uid: string, id: string) {
  const current = getLocalEntries(uid);
  setLocalEntries(uid, current.filter((entry) => entry.id !== id));
}
