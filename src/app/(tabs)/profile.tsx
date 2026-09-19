import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Button } from '@/components/button';
import { LanguageSummary } from '@/components/language-summary';
import { Screen } from '@/components/screen';
import { Body, Muted, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { deleteOwnAccount } from '@/lib/profile';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, userLanguages, languages } = useAuth();
  const [deleting, setDeleting] = useState(false);

  if (!profile) return null;

  const speaks = userLanguages.filter((row) => row.kind !== 'learning');
  const learning = userLanguages.filter((row) => row.kind === 'learning');

  const confirmDelete = () => {
    Alert.alert(strings.profile.deleteConfirmTitle, strings.profile.deleteConfirmBody, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.profile.deleteConfirmButton,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteOwnAccount(profile.id);
          } catch {
            setDeleting(false);
            Alert.alert(strings.errors.generic);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar color={profile.avatar_color} name={profile.display_name} />
        <Title>{profile.display_name}</Title>
      </View>
      <Body>{profile.bio || strings.profile.noBio}</Body>
      <Muted>
        {strings.profile.timezone}: {profile.timezone}
      </Muted>
      <LanguageSummary title={strings.profile.speaks} rows={speaks} languages={languages} />
      <LanguageSummary title={strings.profile.learning} rows={learning} languages={languages} />
      <Button title={strings.profile.edit} onPress={() => router.push('/edit-profile')} />
      <Button title={strings.chats.blockedUsers} variant="secondary" onPress={() => router.push('/blocked-users')} />
      <Button title={strings.profile.signOut} variant="secondary" onPress={() => supabase.auth.signOut()} />
      <Button
        title={strings.profile.deleteAccount}
        variant="danger"
        onPress={confirmDelete}
        loading={deleting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm },
});
