import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OnboardingPayload, RegisterPayload, ThemeMode, UserProfile } from '@/types';
import {
  completeOnboarding,
  loadProfile,
  updateProfile,
  updateThemeMode,
  watchProfile,
} from '@/services/userProfileService';
import { registerAccount, signInWithEmail, signInWithGoogle, signInWithUsernamePin, signOutUser } from '@/services/authService';
import { clearGuestProfile, createGuestProfile, getGuestProfile, setGuestProfile } from '@/lib/storage';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  guestMode: boolean;
  loading: boolean;
  profileLoading: boolean;
  signInEmail: (payload: { email: string; password: string }) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInUsernamePin: (payload: { username: string; pin: string }) => Promise<void>;
  signInGuest: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  completeUserOnboarding: (payload: OnboardingPayload) => Promise<void>;
  saveProfile: (partial: Partial<UserProfile>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let alive = true;

    const restoreGuestSession = async () => {
      const guestProfile = await getGuestProfile();
      if (!alive) return;
      if (guestProfile) {
        setGuestMode(true);
        setUser({
          uid: guestProfile.uid,
          email: guestProfile.authEmail,
          displayName: guestProfile.displayName,
        } as User);
        setProfile(guestProfile);
      } else {
        setGuestMode(false);
        setUser(null);
        setProfile(null);
      }
      setProfileLoading(false);
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setGuestMode(false);
      setUser(nextUser);
      if (!nextUser) {
        void restoreGuestSession();
        return;
      }

      setProfileLoading(true);
      unsubscribeProfile = watchProfile(
        nextUser.uid,
        (nextProfile) => {
          setProfile(nextProfile);
          setProfileLoading(false);
          setLoading(false);
        },
        () => {
          setProfileLoading(false);
          setLoading(false);
        },
      );
    });

    return () => {
      alive = false;
      unsubscribeProfile?.();
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      guestMode,
      loading,
      profileLoading,
      signInEmail: async (payload) => {
        await clearGuestProfile();
        const result = await signInWithEmail(payload);
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      signInGoogle: async () => {
        await clearGuestProfile();
        const result = await signInWithGoogle();
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      signInUsernamePin: async (payload) => {
        await clearGuestProfile();
        const result = await signInWithUsernamePin(payload);
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      signInGuest: async () => {
        const nextProfile = createGuestProfile();
        await setGuestProfile(nextProfile);
        setGuestMode(true);
        setUser({
          uid: nextProfile.uid,
          email: nextProfile.authEmail,
          displayName: nextProfile.displayName,
        } as User);
        setProfile(nextProfile);
        setLoading(false);
      },
      register: async (payload) => {
        await clearGuestProfile();
        const result = await registerAccount(payload);
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      signOut: async () => {
        if (guestMode) {
          await clearGuestProfile();
        } else {
          await signOutUser();
        }
        setUser(null);
        setProfile(null);
        setGuestMode(false);
      },
      completeUserOnboarding: async (payload) => {
        if (!user) throw new Error('You must be signed in.');
        if (guestMode) {
          const baseProfile = profile ?? createGuestProfile();
          const nextProfile = {
            ...baseProfile,
            caregiverName: payload.caregiverName,
            babyName: payload.babyName,
            babyBirthDate: payload.babyBirthDate,
            babySex: payload.babySex,
            birthWeightKg: payload.birthWeightKg,
            currentWeightKg: payload.currentWeightKg,
            heightCm: payload.heightCm,
            headCircCm: payload.headCircCm,
            babyNotes: payload.babyNotes,
            language: payload.language,
            goalFeedingsPerDay: payload.goalFeedingsPerDay,
            goalSleepHoursPerDay: payload.goalSleepHoursPerDay,
            goalDiapersPerDay: payload.goalDiapersPerDay,
            hasCompletedOnboarding: true,
          } as UserProfile;
          await setGuestProfile(nextProfile);
          setProfile(nextProfile);
          return;
        }
        await completeOnboarding(user.uid, payload);
        setProfile(await loadProfile(user.uid));
      },
      saveProfile: async (partial) => {
        if (!user) throw new Error('You must be signed in.');
        if (guestMode) {
          const nextProfile = { ...(profile ?? createGuestProfile()), ...partial } as UserProfile;
          await setGuestProfile(nextProfile);
          setProfile(nextProfile);
          return;
        }
        await updateProfile(user.uid, partial);
        setProfile(await loadProfile(user.uid));
      },
      setThemeMode: async (mode) => {
        if (!user) throw new Error('You must be signed in.');
        if (guestMode) {
          const nextProfile = { ...(profile ?? createGuestProfile()), themeMode: mode } as UserProfile;
          await setGuestProfile(nextProfile);
          setProfile(nextProfile);
          return;
        }
        await updateThemeMode(user.uid, mode);
        setProfile(await loadProfile(user.uid));
      },
      refreshProfile: async () => {
        if (!user) return;
        if (guestMode) {
          setProfile(await getGuestProfile());
          return;
        }
        setProfile(await loadProfile(user.uid));
      },
    }),
    [guestMode, loading, profile, profileLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
