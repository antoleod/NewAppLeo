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
import { registerAccount, signInWithEmail, signInWithUsernamePin, signOutUser } from '@/services/authService';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signInEmail: (payload: { email: string; password: string }) => Promise<void>;
  signInUsernamePin: (payload: { username: string; pin: string }) => Promise<void>;
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
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
        setLoading(false);
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
      unsubscribeProfile?.();
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      profileLoading,
      signInEmail: async (payload) => {
        const result = await signInWithEmail(payload);
        setUser(result.user);
        setProfile(result.profile);
      },
      signInUsernamePin: async (payload) => {
        const result = await signInWithUsernamePin(payload);
        setUser(result.user);
        setProfile(result.profile);
      },
      register: async (payload) => {
        const result = await registerAccount(payload);
        setUser(result.user);
        setProfile(result.profile);
      },
      signOut: async () => {
        await signOutUser();
        setUser(null);
        setProfile(null);
      },
      completeUserOnboarding: async (payload) => {
        if (!user) throw new Error('You must be signed in.');
        await completeOnboarding(user.uid, payload);
        setProfile(await loadProfile(user.uid));
      },
      saveProfile: async (partial) => {
        if (!user) throw new Error('You must be signed in.');
        await updateProfile(user.uid, partial);
        setProfile(await loadProfile(user.uid));
      },
      setThemeMode: async (mode) => {
        if (!user) throw new Error('You must be signed in.');
        await updateThemeMode(user.uid, mode);
        setProfile(await loadProfile(user.uid));
      },
      refreshProfile: async () => {
        if (!user) return;
        setProfile(await loadProfile(user.uid));
      },
    }),
    [loading, profile, profileLoading, user],
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
