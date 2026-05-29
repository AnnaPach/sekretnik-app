"use client";

const MOODS = [
  { value: 1, emoji: "😞", label: "Bardzo zły" },
  { value: 2, emoji: "😕", label: "Zły" },
  { value: 3, emoji: "😐", label: "Neutralny" },
  { value: 4, emoji: "🙂", label: "Dobry" },
  { value: 5, emoji: "😄", label: "Bardzo dobry" },
];

interface MoodPickerProps {
  value: number;
  onChange: (value: number) => void;
}

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <div className="flex gap-2">
      {MOODS.map((mood) => (
        <button
          key={mood.value}
          type="button"
          onClick={() => onChange(mood.value)}
          aria-label={mood.label}
          aria-pressed={value === mood.value}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-colors
            ${
              value === mood.value
                ? "border-primary bg-accent text-primary"
                : "border-transparent bg-card hover:bg-accent/50"
            }`}
        >
          <span className="text-xl leading-none">{mood.emoji}</span>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{mood.label}</span>
        </button>
      ))}
    </div>
  );
}

interface MoodDisplayProps {
  value: number;
}

export function MoodDisplay({ value }: MoodDisplayProps) {
  const mood = MOODS.find((m) => m.value === value);
  if (!mood) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="text-base">{mood.emoji}</span>
      {mood.label}
    </span>
  );
}
