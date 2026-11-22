import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LoadingState } from '../../src/components/LoadingState';
import { useAuth } from '../../src/context/AuthContext';
import { getApiErrorMessage } from '../../src/services/api';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';

type AuthMode = 'login' | 'register';

export default function AccountScreen() {
  const { user, token, isHydrating, signIn, signUp, signOut } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleUseDemo = () => {
    setMode('login');
    setEmail('demo@transitku.id');
    setPassword('transitku123');
    setErrorMessage(null);
    setStatusMessage('Kredensial akun demo siap digunakan');
  };

  const handleSwitchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setStatusMessage(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (mode === 'login') {
      if (!email.trim() || !password) {
        setErrorMessage('Email dan kata sandi wajib diisi');
        return;
      }

      setSubmitting(true);
      try {
        await signIn({ identity: email.trim(), password });
      } catch (err) {
        setErrorMessage(getApiErrorMessage(err, 'Login gagal. Periksa email dan kata sandi'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!name.trim() || !email.trim() || !password || !passwordConfirm) {
      setErrorMessage('Seluruh kolom pendaftaran wajib diisi');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Kata sandi minimal 8 karakter');
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok');
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
      });
    } catch (err) {
      setErrorMessage(getApiErrorMessage(err, 'Pendaftaran gagal. Coba lagi'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setSubmitting(true);
    try {
      await signOut();
      setPassword('');
      setPasswordConfirm('');
      setStatusMessage('Anda telah keluar dari akun');
    } finally {
      setSubmitting(false);
    }
  };

  if (isHydrating) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Memeriksa sesi login" />
      </View>
    );
  }

  if (user && token) {
    const tokenPreview = `${token.slice(0, 16)}...${token.slice(-8)}`;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarBox}>
            <Feather name="user" size={20} color={colors.accent} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.sessionBadge}>
              <View style={styles.sessionDot} />
              <Text style={styles.sessionText}>Sesi aktif</Text>
            </View>
            <Text style={styles.profileName}>{user.name || 'Komuter TransitKu'}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>ID pengguna</Text>
            <Text style={styles.detailValue}>{user.id}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Token JWT</Text>
            <Text style={styles.detailValue}>{tokenPreview}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status autentikasi</Text>
            <Text style={styles.detailValue}>Header Bearer aktif</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.pressed,
            submitting && styles.disabled,
          ]}
          onPress={handleLogout}
          disabled={submitting}
        >
          <Feather name="log-out" size={16} color={colors.statusRedText} />
          <Text style={styles.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, mode === 'login' && styles.segmentBtnActive]}
            onPress={() => handleSwitchMode('login')}
          >
            <Text
              style={[styles.segmentText, mode === 'login' && styles.segmentTextActive]}
            >
              Masuk
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, mode === 'register' && styles.segmentBtnActive]}
            onPress={() => handleSwitchMode('register')}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'register' && styles.segmentTextActive,
              ]}
            >
              Daftar
            </Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Masuk ke TransitKu' : 'Buat akun komuter'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Token JWT akan disisipkan otomatis pada setiap permintaan API'
                : 'Gunakan email aktif untuk mendaftar pada layanan akun TransitKu'}
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color={colors.statusRedText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {statusMessage ? (
            <View style={styles.infoBanner}>
              <Feather name="info" size={16} color={colors.accent} />
              <Text style={styles.infoText}>{statusMessage}</Text>
            </View>
          ) : null}

          {mode === 'register' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nama komuter"
                placeholderTextColor={colors.textMuted}
                editable={!submitting}
              />
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nama@transitku.id"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kata sandi</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 8 karakter"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              editable={!submitting}
            />
          </View>

          {mode === 'register' ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Konfirmasi kata sandi</Text>
              <TextInput
                style={styles.input}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="Ulangi kata sandi"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                editable={!submitting}
              />
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              submitting && styles.disabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Masuk' : 'Daftar sekarang'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.demoBtn, pressed && styles.pressed]}
            onPress={handleUseDemo}
            disabled={submitting}
          >
            <Feather name="key" size={15} color={colors.textPrimary} />
            <Text style={styles.demoBtnText}>Gunakan Akun Demo</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.raised,
    borderRadius: radius.control,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    height: 36,
    borderRadius: radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  formHeader: {
    gap: spacing.xs,
  },
  formTitle: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.statusRedBg,
    borderWidth: 1,
    borderColor: colors.statusRedBorder,
  },
  errorText: {
    ...typography.body,
    color: colors.statusRedText,
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  infoText: {
    ...typography.body,
    color: colors.accent,
    flex: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  input: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  primaryBtn: {
    height: 46,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.accentText,
  },
  demoBtn: {
    height: 42,
    borderRadius: radius.control,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  demoBtnText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.statusGreenDot,
  },
  sessionText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.statusGreenText,
  },
  profileName: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
  },
  profileEmail: {
    ...typography.body,
  },
  detailCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detailLabel: {
    ...typography.meta,
  },
  detailValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
    ...typography.tabular,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  logoutBtn: {
    height: 46,
    borderRadius: radius.control,
    backgroundColor: colors.statusRedBg,
    borderWidth: 1,
    borderColor: colors.statusRedBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.statusRedText,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
});
