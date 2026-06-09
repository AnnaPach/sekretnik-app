"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSettings, type Gender, type UserSettings } from "@/hooks/useSettings";

const GENDER_OPTIONS: { value: Gender; label: string; description: string }[] = [
  { value: "kobieta", label: "Kobieta", description: 'Freud zwraca się: „Pani“' },
  { value: "mezczyzna", label: "Mężczyzna", description: 'Freud zwraca się: „Pan“' },
  { value: "inne", label: "Inne", description: "Freud zwraca się per Ty, neutralnie" },
];

interface SettingsPanelProps {
  /** Expose settings to parent so Freud can use them */
  onChange?: (settings: UserSettings) => void;
}

export function SettingsPanel({ onChange }: SettingsPanelProps) {
  const { settings, saveSettings } = useSettings();
  const [open, setOpen] = useState(false);
  const [draftName, setDraftName] = useState(settings.name);
  const [draftGender, setDraftGender] = useState<Gender>(settings.gender);

  function handleOpen() {
    setDraftName(settings.name);
    setDraftGender(settings.gender);
    setOpen(true);
  }

  function handleSave() {
    const next: UserSettings = { name: draftName.trim(), gender: draftGender };
    saveSettings(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Ustawienia"
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <Settings size={16} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ustawienia</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-2">
            {/* Imię */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium">Twoje imię</label>
              <input
                id="settings-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="np. Anna"
                autoComplete="given-name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Freud będzie używał Twojego imienia podczas sesji.
              </p>
            </div>

            {/* Płeć */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Płeć</label>
              <div className="flex flex-col gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraftGender(opt.value)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                      draftGender === opt.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:border-foreground/40 hover:bg-accent/50"
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
