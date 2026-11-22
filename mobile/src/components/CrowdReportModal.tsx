import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CreateCrowdReportPayload, CrowdStatus, Stop, Vehicle } from '../types/transit';
import { formatCrowdLabel } from '../utils/format';

interface CrowdReportModalProps {
  visible: boolean;
  vehicles: Vehicle[];
  stops: Stop[];
  initialVehicleId?: string;
  defaultReporterName?: string;
  onClose: () => void;
  onSubmit: (payload: CreateCrowdReportPayload) => Promise<void>;
}

const statusOptions: CrowdStatus[] = ['GREEN', 'YELLOW', 'RED'];

export function CrowdReportModal({
  visible,
  vehicles,
  stops,
  initialVehicleId,
  defaultReporterName = '',
  onClose,
  onSubmit,
}: CrowdReportModalProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState('');
  const [reporterName, setReporterName] = useState(defaultReporterName);
  const [reportedStatus, setReportedStatus] = useState<CrowdStatus>('GREEN');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedVehicleId(initialVehicleId ?? vehicles[0]?.id ?? '');
      setSelectedStopId('');
      setReporterName(defaultReporterName);
      setReportedStatus('GREEN');
      setNote('');
      setErrorMessage(null);
    }
  }, [visible, initialVehicleId, vehicles, defaultReporterName]);

  const handleSubmit = async () => {
    if (!selectedVehicleId) {
      setErrorMessage('Pilih armada yang ingin dilaporkan');
      return;
    }
    if (!reporterName.trim()) {
      setErrorMessage('Nama pelapor wajib diisi');
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      await onSubmit({
        vehicle: selectedVehicleId,
        stop: selectedStopId || undefined,
        reporter_name: reporterName.trim(),
        reported_status: reportedStatus,
        note: note.trim(),
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Gagal mengirim laporan kepadatan'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Kirim laporan kepadatan</Text>
          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            disabled={submitting}
          >
            <Feather name="x" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={16} color={colors.statusRedText} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pilih armada</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
              {vehicles.map((item) => {
                const active = item.id === selectedVehicleId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.selectChip, active && styles.selectChipActive]}
                    onPress={() => setSelectedVehicleId(item.id)}
                  >
                    <Text
                      style={[
                        styles.selectChipText,
                        active && styles.selectChipTextActive,
                      ]}
                    >
                      {item.plate_number} ({item.vehicle_type})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Halte terdekat (opsional)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionRow}
            >
              <Pressable
                style={[styles.selectChip, selectedStopId === '' && styles.selectChipActive]}
                onPress={() => setSelectedStopId('')}
              >
                <Text
                  style={[
                    styles.selectChipText,
                    selectedStopId === '' && styles.selectChipTextActive,
                  ]}
                >
                  Tidak ditentukan
                </Text>
              </Pressable>
              {stops.map((stop) => {
                const active = stop.id === selectedStopId;
                return (
                  <Pressable
                    key={stop.id}
                    style={[styles.selectChip, active && styles.selectChipActive]}
                    onPress={() => setSelectedStopId(stop.id)}
                  >
                    <Text
                      style={[
                        styles.selectChipText,
                        active && styles.selectChipTextActive,
                      ]}
                    >
                      {stop.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kondisi kepadatan</Text>
            <View style={styles.statusRow}>
              {statusOptions.map((status) => {
                const active = reportedStatus === status;
                return (
                  <Pressable
                    key={status}
                    style={[styles.statusOption, active && styles.statusOptionActive]}
                    onPress={() => setReportedStatus(status)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        active && styles.statusOptionTextActive,
                      ]}
                    >
                      {formatCrowdLabel(status)}
                    </Text>
                    <Text
                      style={[
                        styles.statusCodeText,
                        active && styles.statusOptionTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama pelapor</Text>
            <TextInput
              style={styles.input}
              value={reporterName}
              onChangeText={setReporterName}
              placeholder="Contoh: Penumpang Halte ITB"
              placeholderTextColor={colors.textMuted}
              editable={!submitting}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Catatan kondisi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              placeholder="Contoh: Kursi bagian belakang masih tersedia"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!submitting}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              submitting && styles.submitBtnDisabled,
              pressed && !submitting && styles.pressed,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.accentText} />
            ) : (
              <Text style={styles.submitBtnText}>Kirim laporan</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.sectionTitle,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    backgroundColor: colors.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xl,
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
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  selectChip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  selectChipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  selectChipTextActive: {
    color: colors.accentText,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    gap: 2,
  },
  statusOptionActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  statusOptionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  statusCodeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
  statusOptionTextActive: {
    color: colors.surface,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  textArea: {
    minHeight: 88,
    paddingTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitBtn: {
    height: 48,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.accentText,
  },
  pressed: {
    opacity: 0.85,
  },
});
