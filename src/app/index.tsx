import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from '@/constants/strings';
import { supabase } from '@/lib/supabase';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; message: string }
  | { kind: 'error'; detail: string };

// Reads one row from the `hello` table. Returns the next screen state instead of setting it,
// so the component can call it from both the mount effect and the retry button.
async function fetchHello(): Promise<Status> {
  const { data, error } = await supabase.from('hello').select('message').limit(1).single();
  if (error) {
    return { kind: 'error', detail: error.message };
  }
  return { kind: 'ok', message: data.message };
}

export default function HomeScreen() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    fetchHello().then(setStatus);
  }, []);

  const retry = () => {
    setStatus({ kind: 'loading' });
    fetchHello().then(setStatus);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{strings.home.title}</Text>

      {status.kind === 'loading' && (
        <>
          <ActivityIndicator />
          <Text style={styles.body}>{strings.home.loading}</Text>
        </>
      )}

      {status.kind === 'ok' && (
        <>
          <Text style={styles.body}>{strings.home.connected}</Text>
          <Text style={styles.quote}>“{status.message}”</Text>
        </>
      )}

      {status.kind === 'error' && (
        <>
          <Text style={[styles.body, styles.error]}>{strings.home.error}</Text>
          <Text style={styles.detail}>{status.detail}</Text>
          <Pressable onPress={retry} style={styles.button}>
            <Text style={styles.buttonText}>{strings.home.retry}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
  },
  quote: {
    fontSize: 20,
    fontStyle: 'italic',
  },
  error: {
    color: '#b00020',
  },
  detail: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#208AEF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
