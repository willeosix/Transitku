import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CrowdReportCard } from '../../src/components/CrowdReportCard';
import { CrowdReportModal } from '../../src/components/CrowdReportModal';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { useAuth } from '../../src/context/AuthContext';
import { getApiErrorMessage } from '../../src/services/api';
import {
  DeviceLocationResult,
  getCurrentBandungLocation,
} from '../../src/services/locationService';
import {
  createCrowdReport,
  getCrowdReports,
  getStops,
  getVehicles,
} from '../../src/services/transitService';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';
import {
  CreateCrowdReportPayload,
  CrowdReport,
  Stop,
  Vehicle,
} from '../../src/types/transit';

export default function ReportsScreen() {
  const { user } = useAuth();
  const [reports, setReports] = useState<CrowdReport[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [locationInfo, setLocationInfo] = useState<DeviceLocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [reportItems, vehicleItems, stopItems, loc] = await Promise.all([
        getCrowdReports(),
        getVehicles(),
        getStops(),
        getCurrentBandungLocation(),
      ]);
      setReports(reportItems);
      setVehicles(vehicleItems);
      setStops(stopItems);
      setLocationInfo(loc);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmitReport = async (payload: CreateCrowdReportPayload) => {
    try {
      await createCrowdReport(payload);
      setFeedbackMessage('Laporan warga berhasil dikirim dan tersimpan');
      await loadData(true);
    } catch (err) {
      throw new Error(getApiErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Memuat laporan warga Bandung" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => loadData()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.actionBar}>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => loadData(true)}
          disabled={refreshing}
        >
          <Feather name="refresh-cw" size={15} color={colors.textPrimary} />
          <Text style={styles.secondaryBtnText}>
            {refreshing ? 'Memperbarui' : 'Refresh'}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => setModalVisible(true)}
          disabled={vehicles.length === 0}
        >
          <Feather name="plus" size={15} color={colors.accentText} />
          <Text style={styles.primaryBtnText}>Kirim laporan cepat</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.accent}
          />
        }
      >
        {feedbackMessage ? (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={16} color={colors.statusGreenText} />
            <Text style={styles.successText}>{feedbackMessage}</Text>
            <Pressable onPress={() => setFeedbackMessage(null)}>
              <Feather name="x" size={15} color={colors.statusGreenText} />
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Laporan tervalidasi</Text>
          <Text style={styles.countText}>{reports.length} laporan</Text>
        </View>

        {reports.length === 0 ? (
          <EmptyState
            icon="message-square"
            title="Belum ada laporan warga"
            description="Kirim laporan kondisi armada penuh, antrean halte, atau macet"
          />
        ) : (
          <View style={styles.stack}>
            {reports.map((report) => (
              <CrowdReportCard key={report.id} report={report} />
            ))}
          </View>
        )}
      </ScrollView>

      <CrowdReportModal
        visible={modalVisible}
        vehicles={vehicles}
        stops={stops}
        defaultReporterName={user?.name ?? ''}
        deviceLatitude={locationInfo?.latitude}
        deviceLongitude={locationInfo?.longitude}
        inBandung={locationInfo?.inBandung ?? true}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitReport}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  secondaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryBtnText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  primaryBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.accentText,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.statusGreenBg,
    borderWidth: 1,
    borderColor: colors.statusGreenBorder,
  },
  successText: {
    ...typography.body,
    color: colors.statusGreenText,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  countText: {
    ...typography.meta,
    ...typography.tabular,
  },
  stack: {
    gap: spacing.md,
  },
});
