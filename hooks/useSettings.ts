"use client";

import { useState, useEffect } from "react";

export type Gender = "kobieta" | "mezczyzna" | "inne";

export interface UserSettings {
  name: string;
  gender: Gender;
}

const STORAGE_KEY = "sekretnik_settings";

const DEFAULT_SETTINGS: UserSettings = {
  name: "",
  gender: "kobieta",
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserSettings>;
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const saveSettings = (s: UserSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSettings(s);
  };

  return { settings, saveSettings, loaded };
}
