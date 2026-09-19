import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Body, ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { blockUser, REPORT_REASONS, submitReport, type ReportReason } from '@/lib/chat';
import { useChats } from '@/lib/chat-context';
import { errorMessage } from '@/lib/errors';

export default function ReportScreen() {
  const router = useRouter();
  const { userId, messageId, messageBody } = useLocalSearchParams<{
    userId: string;
    messageId?: string;
    messageBody?: string;
  }>();
  const { session } = useAuth();
  const { reload } = useChats();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) {
      setError(strings.report.reasonRequired);
      return;
    }
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await submitReport({
        reportedUserId: userId,
        reason,
        details,
        messageId: messageId ? Number(messageId) : undefined,
      });
      if (alsoBlock) {
        await blockUser(session.user.id, userId);
        await reload();
      }
      Alert.alert(strings.report.thanksTitle, strings.report.thanksBody, [
        {
          text: strings.common.done,
          onPress: () => (alsoBlock ? router.dismissAll() : router.back()),
        },
      ]);
    } catch (caught) {
      setError(errorMessage(caught));
      setBusy(false);
    }
  };

  return (
    <Screen footer={<Button title={strings.report.submit} onPress={submit} loading={busy} />}>
      <Muted>{strings.report.intro}</Muted>
      {messageBody ? (
        <View style={styles.quote}>
          <Muted>{strings.report.reportedMessage}</Muted>
          <Body>{messageBody}</Body>
        </View>
      ) : null}
      <Body style={styles.label}>{strings.report.reasonLabel}</Body>
      <View style={styles.reasons}>
        {REPORT_REASONS.map((item) => {
          const active = item === reason;
          return (
            <Pressable
              key={item}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setReason(item)}
              style={[styles.reason, active && styles.reasonActive]}>
              <Text style={[styles.reasonText, active && styles.reasonTextActive]}>{strings.report.reasons[item]}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label={strings.report.detailsLabel}
        placeholder={strings.report.detailsPlaceholder}
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
        multiline
      />
      <Checkbox checked={alsoBlock} onChange={setAlsoBlock}>
        <Body>{strings.report.alsoBlock}</Body>
      </Checkbox>
      <ErrorText message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  quote: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.xs },
  label: { fontWeight: '600' },
  reasons: { gap: spacing.xs },
  reason: { padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surface },
  reasonActive: { backgroundColor: colors.primary },
  reasonText: { fontSize: 16, color: colors.text },
  reasonTextActive: { color: colors.onPrimary, fontWeight: '600' },
});
