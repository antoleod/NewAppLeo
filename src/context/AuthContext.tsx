import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { OnboardingPayload, RegisterPayload, ThemeMode, UserProfile } from '@/types';
import {
  completeOnboarding,
  loadProfile,
  syncPasswordAccessCredentials,
  updateProfile,
  updateThemeMode,
  watchProfile,
} from '@/services/userProfileService';
import {
  registerAccount,
  resetPasswordWithEmail,
  signInWithEmail,
  signInWithEmailPin,
  signInWithGoogle,
  signOutUser,
} from '@/services/authService';
import {
  clearCachedAuthProfile,
  clearGuestProfile,
  createGuestProfile,
  getCachedAuthProfile,
  getGuestProfile,
  setCachedAuthProfile,
  setGuestProfile,
} from '@/lib/storage';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  guestMode: boolean;
  loading: boolean;
  resetPassword: (email: string) => Promise<void>;
  signInEmail: (payload: { email: string; password: string } | string, password?: string) => Promise<void>;
  signInEmailPin: (payload: { email: string; pin: string }) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  completeUserOnboarding: (payload: OnboardingPayload) => Promise<UserProfile>;
  saveProfile: (partial: Partial<UserProfile>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isPermissionDenied(error: unknown) {
  return Boolean((error as any)?.code === 'permission-denied' || /permission/i.test((error as any)?.message ?? ''));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const pendingPinRecovery = useRef<{ email: string; pin: string } | null>(null);

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
      setLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setLoading(true);
      setGuestMode(false);
      if (!nextUser) {
        void restoreGuestSession();
        setUser(null);
        return;
      }

      setUser(nextUser);

      unsubscribeProfile = watchProfile(
        nextUser.uid,
        (nextProfile) => {
          if (nextProfile) {
            void setCachedAuthProfile(nextProfile);
            setProfile(nextProfile);
            setLoading(false);
            return;
          }
          void getCachedAuthProfile(nextUser.uid).then((cachedProfile) => {
            setProfile(cachedProfile);
            setLoading(false);
          });
        },
        () => {
          void getCachedAuthProfile(nextUser.uid).then((cachedProfile) => {
            setProfile(cachedProfile);
            setLoading(false);
          });
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
      resetPassword: async (email) => {
        await resetPasswordWithEmail(email);
      },
      signInEmail: async (payloadOrEmail, maybePassword) => {
        const payload =
          typeof payloadOrEmail === 'string'
            ? { email: payloadOrEmail, password: maybePassword ?? '' }
            : payloadOrEmail;
        await clearGuestProfile();
        const result = await signInWithEmail(payload);
        if (pendingPinRecovery.current?.email === payload.email.trim().toLowerCase()) {
          await syncPasswordAccessCredentials(result.user.uid, payload.password, pendingPinRecovery.current.pin);
          pendingPinRecovery.current = null;
        }
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
        if (result.profile) {
          await setCachedAuthProfile(result.profile);
        }
      },
      signInEmailPin: async (payload) => {
        await clearGuestProfile();
        try {
          const result = await signInWithEmailPin(payload);
          pendingPinRecovery.current = null;
          setGuestMode(false);
          setUser(result.user);
          setProfile(result.profile);
          if (result.profile) {
            await setCachedAuthProfile(result.profile);
          }
        } catch (error: any) {
          if (String(error?.message ?? '').includes('could not be verified')) {
            pendingPinRecovery.current = { email: payload.email.trim().toLowerCase(), pin: payload.pin };
          }
          throw error;
        }
      },
      signInGoogle: async () => {
        await clearGuestProfile();
        const result = await signInWithGoogle();
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
        if (result.profile) {
          await setCachedAuthProfile(result.profile);
        }
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
        if (result.profile) {
          await setCachedAuthProfile(result.profile);
        }
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
          return nextProfile;
        }
        try {
          await completeOnboarding(user.uid, payload);
          const nextProfile = (await loadProfile(user.uid)) ?? profile;
          setProfile(nextProfile);
          if (nextProfile) {
            await setCachedAuthProfile(nextProfile);
          }
          return nextProfile as UserProfile;
        } catch (error) {
          if (!isPermissionDenied(error)) {
            throw error;
          }
          const fallbackProfile = {
            ...(profile ?? createGuestProfile()),
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
          setProfile(fallbackProfile);
          await setCachedAuthProfile(fallbackProfile);
          return fallbackProfile;
        }
      },
      saveProfile: async (partial) => {
        if (!user) throw new Error('You must be signed in.');
        if (guestMode) {
          const nextProfile = { ...(profile ?? createGuestProfile()), ...partial } as UserProfile;
          await setGuestProfile(nextProfile);
          setProfile(nextProfile);
          return;
        }
        const optimisticProfile = { ...(profile ?? createGuestProfile()), ...partial } as UserProfile;
        setProfile(optimisticProfile);
        await setCachedAuthProfile(optimisticProfile);
        await updateProfile(user.uid, partial);
        const nextProfile = (await loadProfile(user.uid)) ?? optimisticProfile;
        setProfile(nextProfile);
        if (nextProfile) {
          await setCachedAuthProfile(nextProfile);
        }
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
        const nextProfile = (await loadProfile(user.uid)) ?? profile;
        setProfile(nextProfile);
        if (nextProfile) {
          await setCachedAuthProfile(nextProfile);
        }
      },
    }),
    [guestMode, loading, profile, user],
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
