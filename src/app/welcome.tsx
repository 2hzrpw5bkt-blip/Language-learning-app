import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { markWelcomeSeen } from '@/lib/welcome';

export default function WelcomeScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Mark it seen on open, not on "Got it": swiping the sheet away should count too.
  useEffect(() => {
    if (session) markWelcomeSeen(session.user.id);
  }, [session]);

  const done = () => router.back();

  return (
    <Screen footer={<Button title={strings.welcome.gotIt} onPress={done} />}>
      {strings.welcome.steps.map((step, index) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{index + 1}</Text>
          </View>
          <View style={styles.text}>
            <Body style={styles.title}>{step.title}</Body>
            <Muted>{step.body}</Muted>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  number: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.onPrimary, fontWeight: '700' },
  text: { flex: 1, gap: 2 },
  title: { fontWeight: '600' },
});
