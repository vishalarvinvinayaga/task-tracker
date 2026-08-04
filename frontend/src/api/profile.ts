import { api } from "../lib/api";

export type ThemePreset = "indigo" | "emerald" | "rose" | "cyan" | "amber" | "slate";

export type UserProfile = {
  id: number;
  name: string;
  timezone: string;
  theme_preset: ThemePreset;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = {
  name: string;
  timezone: string;
  theme_preset: ThemePreset;
};

export const profileApi = {
  get: () => api.get<UserProfile | null>("/profile"),
  create: (data: ProfileInput) => api.post<UserProfile>("/profile", data),
  update: (data: Partial<ProfileInput>) => api.put<UserProfile>("/profile", data),
};
