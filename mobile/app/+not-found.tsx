import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../src/theme/tokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Halaman tidak ditemukan' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Halaman tidak ditemukan</Text>
        <Text style={styles.description}>
          Rute yang Anda buka tidak tersedia di TransitKu
        </Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Kembali ke Koridor</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  link: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.accentText,
  },
});
