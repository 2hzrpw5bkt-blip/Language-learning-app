import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ErrorText } from '@/components/typography';
import { strings } from '@/constants/strings';

import { useOnboardingDraft } from './_layout';

export default function AboutYouStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (draft.name.trim().length === 0) {
      setError(strings.onboarding.nameRequired);
      return;
    }
    setError(null);
    router.push('/onboarding/speak');
  };

  return (
    <Screen>
      <TextField
        label={strings.onboarding.nameLabel}
        placeholder={strings.onboarding.namePlaceholder}
        value={draft.name}
        onChangeText={(name) => update({ name })}
        maxLength={40}
        autoComplete="name"
      />
      <TextField
        label={`${strings.onboarding.bioLabel} (${strings.common.optional})`}
        placeholder={strings.onboarding.bioPlaceholder}
        value={draft.bio}
        onChangeText={(bio) => update({ bio })}
        maxLength={300}
        multiline
      />
      <ErrorText message={error} />
      <Button title={strings.common.next} onPress={next} />
    </Screen>
  );
}
