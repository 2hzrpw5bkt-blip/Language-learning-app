import { useState } from 'react';

import { Button } from '@/components/button';
import { LearnLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { useAuth } from '@/lib/auth';
import { saveProfile, saveUserLanguages } from '@/lib/profile';
import { deviceTimezone } from '@/lib/timezone';

import { useOnboardingDraft } from './_layout';

export default function LearnStep() {
  const { session, languages, refreshProfile } = useAuth();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    const codes = Object.keys(draft.learn);
    if (codes.length === 0) {
      setError(strings.onboarding.learnRequired);
      return;
    }
    if (codes.some((code) => draft.learn[code] === null)) {
      setError(strings.onboarding.levelRequired);
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
      await saveUserLanguages(session.user.id, draft.speak, draft.learn);
      // The profile now has onboarded_at, so the root layout switches to the main app.
      await refreshProfile();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : strings.errors.generic);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Muted>{strings.onboarding.learnHelp}</Muted>
      <LearnLanguagePicker
        languages={languages}
        exclude={Object.keys(draft.speak)}
        value={draft.learn}
        onChange={(learn) => update({ learn })}
      />
      <ErrorText message={error} />
      <Button title={strings.onboarding.finish} onPress={finish} loading={busy} />
    </Screen>
  );
}
