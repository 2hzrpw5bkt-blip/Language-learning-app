import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { Body, ErrorText } from '@/components/typography';
import { strings } from '@/constants/strings';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adult, setAdult] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = (): string | null => {
    if (!EMAIL_PATTERN.test(email.trim())) return strings.auth.invalidEmail;
    if (password.length < 8) return strings.auth.shortPassword;
    if (!adult) return strings.auth.mustConfirmAge;
    if (!accepted) return strings.auth.mustAcceptTerms;
    return null;
  };

  const signUp = async () => {
    const problem = validate();
    setError(problem);
    setNotice(null);
    if (problem) return;
    setBusy(true);
    const result = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Recorded on the user so we can show when consent was given.
        data: { age_confirmed: true, terms_accepted_at: new Date().toISOString() },
      },
    });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    // No session means email confirmation is switched on in Supabase.
    if (!result.data.session) {
      setNotice(strings.auth.checkEmail);
      setTimeout(() => router.back(), 4000);
    }
  };

  return (
    <Screen>
      <TextField
        label={strings.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
      />
      <TextField
        label={strings.auth.password}
        hint={strings.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <Checkbox checked={adult} onChange={setAdult}>
        <Body>{strings.auth.ageConfirm}</Body>
      </Checkbox>
      <Checkbox checked={accepted} onChange={setAccepted}>
        <Body>
          {strings.auth.termsPrefix}
          <Link href="/legal/terms" style={styles.inlineLink}>
            {strings.auth.terms}
          </Link>
          {strings.auth.and}
          <Link href="/legal/privacy" style={styles.inlineLink}>
            {strings.auth.privacy}
          </Link>
        </Body>
      </Checkbox>
      <ErrorText message={error} />
      {notice ? <Body style={styles.notice}>{notice}</Body> : null}
      <Button title={strings.auth.signUp} onPress={signUp} loading={busy} />
      <Link href="/sign-in" style={styles.link}>
        {strings.auth.haveAccount}
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inlineLink: { color: colors.primary, textDecorationLine: 'underline' },
  notice: { color: colors.success },
  link: { color: colors.primary, fontSize: 16, textAlign: 'center', paddingVertical: 8 },
});
