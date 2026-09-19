import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { ColorPicker } from '@/components/color-picker';
import { LearnLanguagePicker, TeachLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Body, ErrorText, Muted } from '@/components/typography';
import { DEFAULT_AVATAR_COLOR } from '@/constants/avatar-colors';
import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { saveProfile, saveUserLanguages } from '@/lib/profile';
import { deviceTimezone } from '@/lib/timezone';
import { choicesFromRows } from '@/lib/types';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, profile, userLanguages, languages, refreshProfile } = useAuth();
  const initial = choicesFromRows(userLanguages);

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? deviceTimezone());
  const [color, setColor] = useState(profile?.avatar_color ?? DEFAULT_AVATAR_COLOR);
  const [teach, setTeach] = useState(initial.teach);
  const [learn, setLearn] = useState(initial.learn);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session || !profile) return null;
  const userId = session.user.id;

  const report = (caught: unknown) => setError(errorMessage(caught));

  const save = async () => {
    if (name.trim().length === 0) {
      setError(strings.onboarding.nameRequired);
      return;
    }
    const learnCodes = Object.keys(learn);
    if (learnCodes.length === 0) {
      setError(strings.onboarding.learnRequired);
      return;
    }
    if (learnCodes.some((code) => learn[code] === null)) {
      setError(strings.onboarding.levelRequired);
      return;
    }
    if (Object.keys(teach).length === 0) {
      setError(strings.onboarding.teachRequired);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await saveProfile(userId, { display_name: name.trim(), bio: bio.trim(), avatar_color: color, timezone });
      await saveUserLanguages(userId, teach, learn);
      await refreshProfile();
      router.back();
    } catch (caught) {
      report(caught);
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title={strings.common.save} onPress={save} loading={busy} />}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} disabled={busy}>
              <Text style={styles.headerButton}>{strings.common.cancel}</Text>
            </Pressable>
          ),
        }}
      />
      <ErrorText message={error} />
      <View style={styles.photo}>
        <Avatar color={color} name={name} />
      </View>
      <Body style={styles.label}>{strings.onboarding.colorLabel}</Body>
      <ColorPicker value={color} onChange={setColor} />
      <TextField label={strings.onboarding.nameLabel} value={name} onChangeText={setName} maxLength={40} />
      <TextField
        label={`${strings.onboarding.bioLabel} (${strings.common.optional})`}
        value={bio}
        onChangeText={setBio}
        maxLength={300}
        multiline
      />
      <Muted>
        {strings.profile.timezone}: {timezone}
      </Muted>
      <Button
        title={strings.editProfile.useDeviceTimezone}
        variant="secondary"
        onPress={() => setTimezone(deviceTimezone())}
      />
      <Muted>{strings.onboarding.learnTitle}</Muted>
      <LearnLanguagePicker
        languages={languages}
        locked={Object.keys(teach)}
        value={learn}
        onChange={setLearn}
      />
      <Muted>{strings.onboarding.teachTitle}</Muted>
      <TeachLanguagePicker
        languages={languages}
        locked={Object.keys(learn)}
        value={teach}
        onChange={setTeach}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: { fontSize: 17, color: colors.primary },
  photo: { alignItems: 'center', gap: spacing.sm },
  label: { fontWeight: '600' },
});
