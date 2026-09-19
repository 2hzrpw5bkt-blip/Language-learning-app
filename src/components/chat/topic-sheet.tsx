import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Sheet } from '@/components/sheet';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { randomTopic } from '@/constants/topics';
import type { ExchangeLanguage } from '@/lib/exchange';

type Props = {
  visible: boolean;
  onClose: () => void;
  options: ExchangeLanguage[];
  languageName: (code: string) => string;
  onSend: (prompt: string, option: ExchangeLanguage) => void;
};

export function TopicSheet({ visible, onClose, options, languageName, onSend }: Props) {
  const [selectedCode, setSelectedCode] = useState<string | null>(options[0]?.code ?? null);
  const option = options.find((item) => item.code === selectedCode) ?? options[0];
  const [prompt, setPrompt] = useState<string | null>(option ? randomTopic(option.level) : null);

  const pick = (code: string | null) => {
    setSelectedCode(code);
    const next = options.find((item) => item.code === code);
    if (next) setPrompt(randomTopic(next.level, prompt ?? undefined));
  };

  return (
    <Sheet
      visible={visible}
      title={strings.chats.topicTitle}
      onClose={onClose}
      footer={
        option && prompt ? (
          <Button title={strings.chats.topicSend} onPress={() => onSend(prompt, option)} />
        ) : undefined
      }>
      <Muted>{strings.chats.topicHelp}</Muted>
      {options.length === 0 ? (
        <Body>{strings.chats.topicNoLanguages}</Body>
      ) : (
        <>
          <Chips
            options={options.map((item) => ({
              value: item.code,
              label: strings.chats.topicFor(item.learnerName, languageName(item.code), strings.levels[item.level].title),
            }))}
            value={option?.code ?? null}
            onChange={pick}
            accessibilityLabel={strings.chats.topicTitle}
          />
          <View style={styles.card}>
            <Body style={styles.prompt}>{prompt}</Body>
          </View>
          <Button
            title={strings.chats.topicAnother}
            variant="secondary"
            onPress={() => option && setPrompt(randomTopic(option.level, prompt ?? undefined))}
          />
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    minHeight: 120,
    justifyContent: 'center',
  },
  prompt: { fontSize: 20, lineHeight: 28, textAlign: 'center', fontWeight: '600' },
});
