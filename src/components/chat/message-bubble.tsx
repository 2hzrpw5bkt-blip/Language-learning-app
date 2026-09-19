// Renders one chat message according to its kind.
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CorrectionInline } from '@/components/chat/correction-inline';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import type { Message } from '@/lib/chat';
import { messageTime } from '@/lib/time';

type Props = {
  message: Message;
  mine: boolean;
  // For corrections shown standalone (original not loaded): the message being corrected.
  original?: Message;
  // A correction of this message, shown inside the bubble.
  correction?: { corrected: string; byName: string };
  onLongPress?: () => void;
};

export function MessageBubble({ message, mine, original, correction, onLongPress }: Props) {
  if (message.kind === 'timer') {
    return (
      <View style={styles.system}>
        <Ionicons name="timer-outline" size={14} color={colors.muted} />
        <Text style={styles.systemText}>{message.body}</Text>
      </View>
    );
  }

  if (message.kind === 'topic') {
    const meta = (message.meta ?? {}) as { learner_name?: string; language_name?: string; level_title?: string };
    return (
      <View style={styles.topic}>
        <View style={styles.topicHeader}>
          <Ionicons name="bulb-outline" size={16} color={colors.primary} />
          <Text style={styles.topicLabel}>
            {strings.chats.topicLabel}
            {meta.learner_name ? ` · ${meta.learner_name}` : ''}
            {meta.language_name ? ` · ${meta.language_name}` : ''}
            {meta.level_title ? ` · ${meta.level_title}` : ''}
          </Text>
        </View>
        <Text style={styles.topicText}>{message.body}</Text>
      </View>
    );
  }

  const isCorrection = message.kind === 'correction';
  return (
    <Pressable onLongPress={onLongPress} style={[styles.row, mine && styles.rowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {isCorrection ? (
          <View style={styles.correctionHeader}>
            <Ionicons name="pencil-outline" size={14} color={mine ? colors.onPrimary : colors.primary} />
            <Text style={[styles.correctionLabel, mine && styles.textMine]}>{strings.chats.correctionLabel}</Text>
          </View>
        ) : null}
        {isCorrection && original ? (
          <Text style={[styles.originalText, mine && styles.textMineFaded]}>{original.body}</Text>
        ) : null}
        <Text style={[styles.text, mine && styles.textMine]}>{message.body}</Text>
        {correction ? (
          <CorrectionInline original={message.body} corrected={correction.corrected} byName={correction.byName} />
        ) : null}
        <Text style={[styles.time, mine && styles.textMineFaded]}>{messageTime(message.created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-start' },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  text: { fontSize: 16, lineHeight: 22, color: colors.text },
  textMine: { color: colors.onPrimary },
  textMineFaded: { color: '#DCEBFB' },
  time: { fontSize: 11, color: colors.muted, marginTop: 2, alignSelf: 'flex-end' },
  correctionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  correctionLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
  originalText: { fontSize: 14, color: colors.muted, textDecorationLine: 'line-through', marginBottom: 2 },
  system: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 4, paddingVertical: 2 },
  systemText: { fontSize: 12, color: colors.muted },
  topic: {
    alignSelf: 'center',
    maxWidth: '90%',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  topicHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topicLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
  topicText: { fontSize: 16, lineHeight: 22, color: colors.text, fontWeight: '600' },
});
