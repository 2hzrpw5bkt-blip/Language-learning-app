import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { LearnLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { useAuth } from '@/lib/auth';

import { useOnboardingDraft } from './_layout';

export default function LearnStep() {
  const router = useRouter();
  const { languages } = useAuth();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    const codes = Object.keys(draft.learn);
    if (codes.length === 0) {
      setError(strings.onboarding.learnRequired);
      return;
    }
    if (codes.some((code) => draft.learn[code] === null)) {
      setError(strings.onboarding.levelRequired);
      return;
    }
    setError(null);
    router.push('/onboarding/teach');
  };

  return (
    <Screen>
      <Muted>{strings.onboarding.learnHelp}</Muted>
      <LearnLanguagePicker
        languages={languages}
        locked={Object.keys(draft.teach)}
        value={draft.learn}
        onChange={(learn) => update({ learn })}
      />
      <ErrorText message={error} />
      <Button title={strings.common.next} onPress={next} />
    </Screen>
  );
}
