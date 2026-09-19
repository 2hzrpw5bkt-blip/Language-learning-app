// Holds the answers across the three onboarding steps until the last step saves them.
import { Stack } from 'expo-router';
import { createContext, useContext, useState, type ReactNode } from 'react';

import { strings } from '@/constants/strings';
import { DEFAULT_AVATAR_COLOR } from '@/constants/avatar-colors';
import type { LearnChoices, TeachChoices } from '@/lib/types';

type Draft = {
  name: string;
  bio: string;
  color: string;
  learn: LearnChoices;
  teach: TeachChoices;
};

type DraftContextValue = {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
};

const DraftContext = createContext<DraftContextValue | null>(null);

export function useOnboardingDraft(): DraftContextValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error('useOnboardingDraft must be used inside the onboarding layout');
  return value;
}

function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ name: '', bio: '', color: DEFAULT_AVATAR_COLOR, learn: {}, teach: {} });
  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  return <DraftContext.Provider value={{ draft, update }}>{children}</DraftContext.Provider>;
}

export default function OnboardingLayout() {
  return (
    <DraftProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: strings.onboarding.aboutTitle }} />
        <Stack.Screen name="learn" options={{ title: strings.onboarding.learnTitle }} />
        <Stack.Screen name="teach" options={{ title: strings.onboarding.teachTitle }} />
      </Stack>
    </DraftProvider>
  );
}
