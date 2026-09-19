import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { SpeakLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { useAuth } from '@/lib/auth';

import { useOnboardingDraft } from './_layout';

export default function SpeakStep() {
  const router = useRouter();
  const { languages } = useAuth();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (Object.keys(draft.speak).length === 0) {
      setError(strings.onboarding.speakRequired);
      return;
    }
    setError(null);
    router.push('/onboarding/learn');
  };

  return (
    <Screen>
      <Muted>{strings.onboarding.speakHelp}</Muted>
      <SpeakLanguagePicker
        languages={languages}
        exclude={Object.keys(draft.learn)}
        value={draft.speak}
        onChange={(speak) => update({ speak })}
      />
      <ErrorText message={error} />
      <Button title={strings.common.next} onPress={next} />
    </Screen>
  );
}
