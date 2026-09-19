import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { LearnLanguagePicker, TeachLanguagePicker } from '@/components/language-pickers';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { removeAvatarFiles, saveProfile, saveUserLanguages, uploadAvatar } from '@/lib/profile';
import { deviceTimezone } from '@/lib/timezone';
import { choicesFromRows } from '@/lib/types';

export default function EditProfileScreen() {
  const router = useRouter();
  const { session, profile, userLanguages, languages, refreshProfile } = useAuth();
  const initial = choicesFromRows(userLanguages);

  const [name, setName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [timezone, setTimezone] = useState(profile?.timezone ?? deviceTimezone());
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [teach, setTeach] = useState(initial.teach);
  const [learn, setLearn] = useState(initial.learn);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  if (!session || !profile) return null;
  const userId = session.user.id;

  const report = (caught: unknown) => setError(errorMessage(caught));

  const changePhoto = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    setPhotoBusy(true);
    try {
      const url = await uploadAvatar(userId, asset.uri, asset.mimeType);
      await saveProfile(userId, { avatar_url: url });
      setAvatarUrl(url);
    } catch (caught) {
      report(caught);
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      await removeAvatarFiles(userId);
      await saveProfile(userId, { avatar_url: null });
      setAvatarUrl(null);
    } catch (caught) {
      report(caught);
    } finally {
      setPhotoBusy(false);
    }
  };

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
      await saveProfile(userId, { display_name: name.trim(), bio: bio.trim(), timezone });
      await saveUserLanguages(userId, teach, learn);
      await refreshProfile();
      router.back();
    } catch (caught) {
      report(caught);
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} disabled={busy}>
              <Text style={styles.headerButton}>{strings.common.cancel}</Text>
            </Pressable>
          ),
          headerRight: () =>
            busy ? (
              <ActivityIndicator />
            ) : (
              <Pressable onPress={save} hitSlop={8}>
                <Text style={[styles.headerButton, styles.headerSave]}>{strings.common.save}</Text>
              </Pressable>
            ),
        }}
      />
      <ErrorText message={error} />
      <View style={styles.photo}>
        <Avatar url={avatarUrl} name={name} />
        <View style={styles.photoButtons}>
          <Button
            title={strings.editProfile.changePhoto}
            variant="secondary"
            onPress={changePhoto}
            loading={photoBusy}
          />
          {avatarUrl ? (
            <Button
              title={strings.editProfile.removePhoto}
              variant="secondary"
              onPress={removePhoto}
              disabled={photoBusy}
            />
          ) : null}
        </View>
      </View>
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
  headerSave: { fontWeight: '600' },
  photo: { alignItems: 'center', gap: spacing.sm },
  photoButtons: { flexDirection: 'row', gap: spacing.sm },
});
