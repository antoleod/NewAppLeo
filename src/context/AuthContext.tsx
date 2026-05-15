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
import { consumeGoogleRedirectResult, registerAccount, signInWithEmail, signInWithGoogle, signOutUser } from '@/services/authService';
import { clearGuestProfile, clearLocalSession, createGuestProfile, getGuestProfile, setGuestProfile } from '@/lib/storage';
import { getLocalProfile } from '@/services/localStore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { registerCurrentSession as createSession } from '@/services/sessionService';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  guestMode: boolean;
  loading: boolean;
  profileLoading: boolean;
  signInEmail: (payload: { email: string; password: string }) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signInGuest: () => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeUserOnboarding: (payload: OnboardingPayload) => Promise<void>;
  saveProfile: (partial: Partial<UserProfile>) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryProfile: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  // Bump to force the auth-state effect to tear down + re-attach the
  // profile listener (used by the recovery screen's "Retry" button).
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let alive = true;

    // If we just came back from a Google redirect, finalise the profile.
    // The auth state listener below will then pick up the user normally.
    void consumeGoogleRedirectResult();

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

    // Holds the pending profile-load timeout so it can be cancelled when the
    // Firestore listener fires first (normal case) or when auth changes again.
    let profileTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      // Cancel any outstanding profile-load timeout from the previous auth state.
      if (profileTimeoutId) { clearTimeout(profileTimeoutId); profileTimeoutId = null; }

      setGuestMode(false);
      setUser(nextUser);
      if (!nextUser) {
        void restoreGuestSession();
        return;
      }

      setProfileLoading(true);

      // If Firestore doesn't call back within 8 s (e.g. reconnecting after a
      // long mobile-browser suspension), try to unblock the app with the last
      // known local profile so the user never sees a permanent loading screen.
      //
      // CRITICAL: only unblock when we actually have a cached profile. If
      // local is null AND we set profile = null AND unblock loading, the app
      // layout treats this as "hasn't completed onboarding" and redirects an
      // already-onboarded user to the onboarding flow. Leaving loading=true
      // lets the layout's 10 s recovery screen kick in (with a retry button),
      // which is the correct behaviour when we genuinely cannot determine
      // the user's profile state.
      profileTimeoutId = setTimeout(async () => {
        profileTimeoutId = null;
        if (!alive) return;
        let local: UserProfile | null = null;
        try {
          local = await getLocalProfile(nextUser.uid);
        } catch {}
        if (!alive) return;
        if (local) {
          setProfile(local);
          setProfileLoading(false);
          setLoading(false);
        }
        // else: keep loading; let watchProfile resolve when it can or let
        // the recovery UI take over after the 10 s threshold.
      }, 8000);

      unsubscribeProfile = watchProfile(
        nextUser.uid,
        (nextProfile) => {
          if (profileTimeoutId) { clearTimeout(profileTimeoutId); profileTimeoutId = null; }
          setProfile(nextProfile);
          setProfileLoading(false);
          setLoading(false);
        },
        () => {
          if (profileTimeoutId) { clearTimeout(profileTimeoutId); profileTimeoutId = null; }
          setProfileLoading(false);
          setLoading(false);
        },
      );
    });

    return () => {
      alive = false;
      if (profileTimeoutId) { clearTimeout(profileTimeoutId); profileTimeoutId = null; }
      unsubscribeProfile?.();
      unsubscribe();
    };
  }, [retryToken]);

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
        await createSession(result.user.uid, result.user.email ?? payload.email);
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      signInGoogle: async () => {
        await clearGuestProfile();
        const result = await signInWithGoogle();
        await createSession(result.user.uid, result.user.email ?? profile?.authEmail ?? 'unknown');
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
        await createSession(result.user.uid, result.user.email ?? payload.email);
        setGuestMode(false);
        setUser(result.user);
        setProfile(result.profile);
      },
      resetPassword: async (email) => {
        await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      },
      signOut: async () => {
        try {
          if (!guestMode) {
            await signOutUser();
          }
        } catch {
          // Firebase signOut failure — local cleanup still runs
        } finally {
          await clearLocalSession(user?.uid ?? undefined);
          setUser(null);
          setProfile(null);
          setGuestMode(false);
        }
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
      retryProfile: () => {
        setLoading(true);
        setProfileLoading(true);
        setRetryToken((n) => n + 1);
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
