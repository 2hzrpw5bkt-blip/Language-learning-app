// The microphone button and the recording bar. Tap to start; Send or Cancel while recording.
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { colors, radius, spacing } from '@/constants/theme';
import { formatClip, VOICE_MAX_MS } from '@/lib/voice-meta';

type Props = {
  recording: boolean;
  onRecordingChange: (recording: boolean) => void;
  // Called with the local file and its length when the user taps Send (or the limit is hit).
  onSend: (localUri: string, durationMs: number) => void;
  disabled?: boolean;
};

export function VoiceComposer({ recording, onRecordingChange, onSend, disabled }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const finishing = useRef(false);

  const begin = async () => {
    if (disabled || recording) return;
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(strings.chats.voicePermissionTitle, strings.chats.voicePermissionBody);
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      finishing.current = false;
      onRecordingChange(true);
    } catch {
      Alert.alert(strings.chats.voiceFailed);
    }
  };

  const finish = async (send: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    const durationMs = state.durationMillis;
    try {
      await recorder.stop();
    } catch {
      // Nothing to do: the recording simply did not happen.
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    onRecordingChange(false);
    const uri = recorder.uri;
    if (send && uri && durationMs > 500) onSend(uri, durationMs);
  };

  // Stop and send at the length limit.
  useEffect(() => {
    if (recording && state.durationMillis >= VOICE_MAX_MS) finish(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, state.durationMillis]);

  if (!recording) {
    return (
      <Pressable
        onPress={begin}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={strings.chats.voiceRecord}
        style={[styles.round, disabled && styles.disabled]}>
        <Ionicons name="mic" size={22} color={colors.onPrimary} />
      </Pressable>
    );
  }

  return (
    <View style={styles.bar}>
      <View style={styles.dot} />
      <Text style={styles.time}>{formatClip(state.durationMillis)}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {strings.chats.voiceRecording}
      </Text>
      <Pressable onPress={() => finish(false)} hitSlop={8} accessibilityRole="button">
        <Text style={styles.cancel}>{strings.chats.voiceCancel}</Text>
      </Pressable>
      <Pressable onPress={() => finish(true)} accessibilityRole="button" accessibilityLabel={strings.chats.voiceSend} style={styles.round}>
        <Ionicons name="arrow-up" size={22} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingLeft: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  time: { fontVariant: ['tabular-nums'], fontWeight: '700', color: colors.text },
  label: { flex: 1, color: colors.muted },
  cancel: { color: colors.danger, fontWeight: '600', paddingHorizontal: spacing.sm },
});
