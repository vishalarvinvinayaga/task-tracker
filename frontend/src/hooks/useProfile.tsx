import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { profileApi, type ProfileInput, type UserProfile } from "../api/profile";
import { applyThemePreset } from "../lib/theme";

type ProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  createProfile: (data: ProfileInput) => Promise<void>;
  updateProfile: (data: Partial<ProfileInput>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi
      .get()
      .then((p) => {
        setProfile(p);
        if (p) applyThemePreset(p.theme_preset);
      })
      .finally(() => setLoading(false));
  }, []);

  async function createProfile(data: ProfileInput) {
    const p = await profileApi.create(data);
    setProfile(p);
    applyThemePreset(p.theme_preset);
  }

  async function updateProfile(data: Partial<ProfileInput>) {
    const p = await profileApi.update(data);
    setProfile(p);
    applyThemePreset(p.theme_preset);
  }

  return (
    <ProfileContext.Provider value={{ profile, loading, createProfile, updateProfile }}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
