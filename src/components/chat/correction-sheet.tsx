import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { TextField } from '@/components/text-field';
import { Body, ErrorText, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import type { Message } from '@/lib/chat';

type Props = {
  original: Message | null;
  onClose: () => void;
  onSend: (original: Message, corrected: string) => void;
};

export function CorrectionSheet({ original, onClose, onSend }: Props) {
  const [text, setText] = useState(original?.body ?? '');
  const [error, setError] = useState<string | null>(null);

  const send = () => {
    if (!original) return;
    const corrected = text.trim();
    if (corrected.length === 0 || corrected === original.body.trim()) {
      setError(strings.chats.correctionUnchanged);
      return;
    }
    onSend(original, corrected);
  };

  return (
    <Sheet
      visible={original !== null}
      title={strings.chats.correctionTitle}
      onClose={onClose}
      footer={<Button title={strings.chats.sendCorrection} onPress={send} />}>
      <Muted>{strings.chats.correctionHelp}</Muted>
      <View style={styles.original}>
        <Muted>{strings.chats.correctionOriginal}</Muted>
        <Body>{original?.body}</Body>
      </View>
      <TextField label={strings.chats.correctionLabel} value={text} onChangeText={setText} multiline autoFocus maxLength={2000} />
      <ErrorText message={error} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  original: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.xs },
});
