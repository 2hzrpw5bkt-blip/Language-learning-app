import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ColorPicker } from '@/components/color-picker';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Body, ErrorText } from '@/components/typography';
import { strings } from '@/constants/strings';
import { containsBannedWords } from '@/lib/profile';

import { useOnboardingDraft } from './_layout';

export default function AboutYouStep() {
  const router = useRouter();
  const { draft, update } = useOnboardingDraft();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const next = async () => {
    if (draft.name.trim().length === 0) {
      setError(strings.onboarding.nameRequired);
      return;
    }
    setChecking(true);
    const blocked = (await containsBannedWords(draft.name)) || (await containsBannedWords(draft.bio));
    setChecking(false);
    if (blocked) {
      setError(strings.errors.bannedWords);
      return;
    }
    setError(null);
    router.push('/onboarding/learn');
  };

  return (
    <Screen>
      <View style={styles.avatar}>
        <Avatar color={draft.color} name={draft.name} />
      </View>
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
      <Body style={styles.label}>{strings.onboarding.colorLabel}</Body>
      <ColorPicker value={draft.color} onChange={(color) => update({ color })} />
      <ErrorText message={error} />
      <Button title={strings.common.next} onPress={next} loading={checking} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center' },
  label: { fontWeight: '600' },
});
