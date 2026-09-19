// A voice message: play/pause, a progress bar and the clip length. The player is only created
// once the user taps play, so a long chat does not hold dozens of native players.
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, spacing } from '@/constants/theme';
import { signedVoiceUrl } from '@/lib/voice';
import { formatClip, type VoiceMeta } from '@/lib/voice-meta';

type Props = { meta: VoiceMeta; mine: boolean };

export function VoiceBubble({ meta, mine }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const start = async () => {
    if (state !== 'idle') return;
    setState('loading');
    try {
      // Route through the speaker, and play even with the silent switch on.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setUrl(await signedVoiceUrl(meta.path));
      setState('ready');
    } catch {
      setState('error');
    }
  };

  if (state === 'ready' && url) {
    return <VoicePlayer url={url} durationMs={meta.duration_ms} mine={mine} />;
  }

  return (
    <Pressable
      onPress={start}
      accessibilityRole="button"
      accessibilityLabel={state === 'error' ? strings.chats.voiceUnavailable : strings.chats.voicePlay}
      style={styles.row}>
      <View style={[styles.button, mine && styles.buttonMine]}>
        {state === 'loading' ? (
          <ActivityIndicator color={mine ? colors.primary : colors.onPrimary} />
        ) : (
          <Ionicons name={state === 'error' ? 'alert' : 'play'} size={20} color={mine ? colors.primary : colors.onPrimary} />
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, mine && styles.barMine]} />
      </View>
      <Text style={[styles.clock, mine && styles.textMine]}>
        {state === 'error' ? strings.chats.voiceUnavailable : formatClip(meta.duration_ms)}
      </Text>
    </Pressable>
  );
}

function VoicePlayer({ url, durationMs, mine }: { url: string; durationMs: number; mine: boolean }) {
  const player = useAudioPlayer({ uri: url });
  const status = useAudioPlayerStatus(player);
  const autoPlayed = useRef(false);

  // Start playing as soon as the clip has loaded, once.
  useEffect(() => {
    if (status.isLoaded && !autoPlayed.current) {
      autoPlayed.current = true;
      player.play();
    }
  }, [status.isLoaded, player]);

  const total = status.duration > 0 ? status.duration : durationMs / 1000;
  const finished = status.didJustFinish || (total > 0 && status.currentTime >= total - 0.05);
  const progress = total > 0 ? Math.min(1, status.currentTime / total) : 0;

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (finished) await player.seekTo(0);
    player.play();
  };

  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={status.playing ? strings.chats.voicePause : strings.chats.voicePlay}
      style={styles.row}>
      <View style={[styles.button, mine && styles.buttonMine]}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={mine ? colors.primary : colors.onPrimary} />
      </View>
      <View style={styles.track}>
        <View style={[styles.bar, mine && styles.barMine, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={[styles.clock, mine && styles.textMine]}>
        {formatClip((status.playing || progress > 0 ? status.currentTime : total) * 1000)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 200 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonMine: { backgroundColor: colors.onPrimary },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  bar: { height: 4, width: '0%', backgroundColor: colors.primary },
  barMine: { backgroundColor: colors.onPrimary },
  clock: { fontVariant: ['tabular-nums'], fontSize: 13, color: colors.text, minWidth: 36, textAlign: 'right' },
  textMine: { color: colors.onPrimary },
});
