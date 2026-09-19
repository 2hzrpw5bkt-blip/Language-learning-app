import { useState } from 'react';

import { Button } from '@/components/button';
import { TeachLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { saveProfile, saveUserLanguages } from '@/lib/profile';
import { deviceTimezone } from '@/lib/timezone';

import { useOnboardingDraft } from './_layout';

export default function TeachStep() {
  const { session, languages, refreshProfile } = useAuth();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    if (Object.keys(draft.teach).length === 0) {
      setError(strings.onboarding.teachRequired);
      return;
    }
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await saveProfile(session.user.id, {
        display_name: draft.name.trim(),
        bio: draft.bio.trim(),
        timezone: deviceTimezone(),
        onboarded_at: new Date().toISOString(),
      });
      await saveUserLanguages(session.user.id, draft.teach, draft.learn);
      // The profile now has onboarded_at, so the root layout switches to the main app.
      await refreshProfile();
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Muted>{strings.onboarding.teachHelp}</Muted>
      <TeachLanguagePicker
        languages={languages}
        locked={Object.keys(draft.learn)}
        value={draft.teach}
        onChange={(teach) => update({ teach })}
      />
      <ErrorText message={error} />
      <Button title={strings.onboarding.finish} onPress={finish} loading={busy} />
    </Screen>
  );
}
