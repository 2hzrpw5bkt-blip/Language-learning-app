import { useState } from 'react';

import { Button } from '@/components/button';
import { Chips } from '@/components/chips';
import { Sheet } from '@/components/sheet';
import { Body, Muted } from '@/components/typography';
import { strings } from '@/constants/strings';
import type { TimerMeta } from '@/lib/timer';

const MINUTE_OPTIONS = ['3', '6', '10', '15'];

type Props = {
  visible: boolean;
  onClose: () => void;
  // The two languages of this exchange, in any order.
  codes: string[];
  languageName: (code: string) => string;
  onStart: (meta: TimerMeta) => void;
};

export function TimerSheet({ visible, onClose, codes, languageName, onStart }: Props) {
  const [minutes, setMinutes] = useState('6');
  const [first, setFirst] = useState<string | null>(codes[0] ?? null);
  const firstCode = first ?? codes[0];
  const secondCode = codes.find((code) => code !== firstCode) ?? firstCode;

  const start = () => {
    if (!firstCode || !secondCode) return;
    onStart({ first: firstCode, second: secondCode, minutes: Number(minutes), started_at: new Date().toISOString() });
  };

  return (
    <Sheet
      visible={visible}
      title={strings.chats.timerTitle}
      onClose={onClose}
      footer={codes.length > 0 ? <Button title={strings.chats.timerStart} onPress={start} /> : undefined}>
      <Muted>{strings.chats.timerHelp}</Muted>
      {codes.length === 0 ? (
        <Body>{strings.chats.topicNoLanguages}</Body>
      ) : (
        <>
          <Body>{strings.chats.timerMinutes}</Body>
          <Chips
            options={MINUTE_OPTIONS.map((value) => ({ value, label: value }))}
            value={minutes}
            onChange={setMinutes}
            accessibilityLabel={strings.chats.timerMinutes}
          />
          <Body>{strings.chats.timerFirst}</Body>
          <Chips
            options={codes.map((code) => ({ value: code, label: languageName(code) }))}
            value={firstCode ?? null}
            onChange={setFirst}
            accessibilityLabel={strings.chats.timerFirst}
          />
        </>
      )}
    </Sheet>
  );
}
