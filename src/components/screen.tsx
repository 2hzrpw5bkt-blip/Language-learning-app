// expo-router bundles its own navigation elements; the standalone package is not compatible.
import { HeaderHeightContext } from 'expo-router/build/react-navigation/elements';
import { use, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  // Which screen edges need safe-area padding. Screens under a native header only need the bottom.
  edges?: Edge[];
  // Always-visible content below the scrolling area, for example a Save button.
  footer?: ReactNode;
};

export function Screen({ children, scroll = true, edges = ['bottom'], footer }: Props) {
  // Exact height of the native header above this screen, so the keyboard pushes the content up
  // by the right amount. Read from context rather than useHeaderHeight(), which throws when this
  // screen is rendered outside a navigator (the offline retry screen is).
  const headerHeight = use(HeaderHeightContext) ?? 0;
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.content, styles.flex]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
