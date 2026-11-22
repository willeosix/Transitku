import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BandungLiveMap } from '../../src/components/BandungLiveMap';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StopCard } from '../../src/components/StopCard';
import { VehicleCard } from '../../src/components/VehicleCard';
import { useAuth } from '../../src/context/AuthContext';
import { getApiErrorMessage } from '../../src/services/api';
import { scheduleDepartureReminder } from '../../src/services/notificationService';
import {
  getCorridorById,
  getStopsByCorridor,
  getVehiclesByCorridor,
} from '../../src/services/transitService';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';
import { Corridor, Stop, Vehicle } from '../../src/types/transit';
import { formatRupiah } from '../../src/utils/format';

export default function CorridorDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; code?: string; name?: string }>();
  const corridorId = typeof params.id === 'string' ? params.id : '';
  const { favoriteCorridors, toggleFavoriteCorridor } = useAuth();

  const [corridor, setCorridor] = useState<Corridor | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (isRefresh = false, silent = false) => {
      if (!corridorId) {
        setError('ID koridor tidak valid');
        setLoading(false);
        return;
      }

      if (!silent) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      }
      setError(null);

      try {
        const [corridorData, stopItems, vehicleItems] = await Promise.all([
          getCorridorById(corridorId),
          getStopsByCorridor(corridorId),
          getVehiclesByCorridor(corridorId),
        ]);
        setCorridor(corridorData);
        setStops(stopItems);
        setVehicles(vehicleItems);
      } catch (err) {
        if (!silent) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [corridorId]
  );

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!corridorId) {
      return;
    }
    const timer = setInterval(() => {
      loadDetail(false, true);
    }, 15000);
    return () => clearInterval(timer);
  }, [corridorId, loadDetail]);

  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => a.eta_next_stop_min - b.eta_next_stop_min);
  }, [vehicles]);

  const nearestVehicle = sortedVehicles[0];
  const recommendedNextVehicle = useMemo(() => {
    if (!nearestVehicle || nearestVehicle.crowd_status !== 'RED') {
      return null;
    }
    return (
      sortedVehicles.find(
        (v) => v.id !== nearestVehicle.id && v.crowd_status !== 'RED'
      ) ??
      sortedVehicles[1] ??
      null
    );
  }, [nearestVehicle, sortedVehicles]);

  const handleScheduleReminder = async (vehicle: Vehicle) => {
    const result = await scheduleDepartureReminder(
      vehicle.plate_number,
      corridor?.name ?? params.name ?? 'Koridor TransitKu',
      vehicle.eta_next_stop_min
    );
    setReminderNotice(result.message);
  };

  const isFavorite = corridorId ? favoriteCorridors.includes(corridorId) : false;
  const headerTitle = corridor?.code ?? params.code ?? 'Detail koridor';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: headerTitle }} />

      {loading ? (
        <LoadingState message="Memuat peta, armada, dan halte koridor" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadDetail()} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadDetail(true)}
              tintColor={colors.accent}
            />
          }
        >
          {corridor ? (
            <View style={styles.summaryCard}>
              <View style={styles.topRow}>
                <View style={styles.codePlate}>
                  <Text style={styles.codeText}>{corridor.code}</Text>
                </View>
                {corridor.student_friendly ? (
                  <View style={styles.studentTag}>
                    <Text style={styles.studentTagText}>Ramah pelajar</Text>
                  </View>
                ) : null}
                <View style={styles.spacer} />
                <Text style={styles.fareText}>{formatRupiah(corridor.fare)}</Text>
              </View>

              <Text style={styles.corridorName}>{corridor.name}</Text>

              <View style={styles.infoRow}>
                <Feather name="navigation" size={14} color={colors.textMuted} />
                <Text style={styles.infoText}>
                  {corridor.origin} ke {corridor.destination}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="clock" size={14} color={colors.textMuted} />
                <Text style={styles.infoText}>{corridor.operating_hours}</Text>
              </View>

              <Pressable
                style={[styles.favActionBtn, isFavorite && styles.favActionBtnActive]}
                onPress={() => toggleFavoriteCorridor(corridor.id)}
              >
                <Feather
                  name="bookmark"
                  size={15}
                  color={isFavorite ? colors.accent : colors.textPrimary}
                />
                <Text
                  style={[styles.favActionText, isFavorite && styles.favActionTextActive]}
                >
                  {isFavorite ? 'Tersimpan di Koridor Favorit' : 'Simpan ke Koridor Favorit'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <BandungLiveMap
            vehicles={sortedVehicles}
            corridors={corridor ? [corridor] : []}
            stops={stops}
            height={224}
            title={`Peta live ${headerTitle}`}
            subtitle={`${sortedVehicles.length} bus live · ${stops.length} shelter pada koridor`}
          />

          {reminderNotice ? (
            <View style={styles.reminderBanner}>
              <Feather name="bell" size={15} color={colors.statusGreenText} />
              <Text style={styles.reminderText}>{reminderNotice}</Text>
              <Pressable onPress={() => setReminderNotice(null)}>
                <Feather name="x" size={15} color={colors.statusGreenText} />
              </Pressable>
            </View>
          ) : null}

          {nearestVehicle && nearestVehicle.crowd_status === 'RED' && recommendedNextVehicle ? (
            <View style={styles.recommendCard}>
              <View style={styles.recommendHeader}>
                <Feather name="info" size={16} color={colors.accent} />
                <Text style={styles.recommendTitle}>Rekomendasi armada berikutnya</Text>
              </View>
              <Text style={styles.recommendBody}>
                Armada terdekat {nearestVehicle.plate_number} penuh ({nearestVehicle.load_factor}%).
                Armada berikutnya {recommendedNextVehicle.plate_number} ({recommendedNextVehicle.crowd_status},{' '}
                {recommendedNextVehicle.load_factor}%) tiba dengan selisih{' '}
                {Math.max(
                  1,
                  recommendedNextVehicle.eta_next_stop_min - nearestVehicle.eta_next_stop_min ||
                    nearestVehicle.headway_min
                )}{' '}
                menit (headway {nearestVehicle.headway_min} menit).
              </Text>
              {recommendedNextVehicle.crowd_status === 'GREEN' ? (
                <Pressable
                  style={styles.recommendBtn}
                  onPress={() => handleScheduleReminder(recommendedNextVehicle)}
                >
                  <Feather name="bell" size={14} color={colors.accentText} />
                  <Text style={styles.recommendBtnText}>
                    Ingatkan sebelum {recommendedNextVehicle.plate_number} tiba
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Armada live di koridor ini</Text>
            <Text style={styles.countText}>{sortedVehicles.length} unit</Text>
          </View>

          {sortedVehicles.length === 0 ? (
            <EmptyState
              icon="navigation"
              title="Belum ada armada aktif"
              description="Tarik ke bawah untuk memuat ulang posisi bus live"
            />
          ) : (
            <View style={styles.stack}>
              {sortedVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  onRemindPress={handleScheduleReminder}
                />
              ))}
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Urutan halte resmi</Text>
            <Text style={styles.countText}>{stops.length} halte</Text>
          </View>

          {stops.length === 0 ? (
            <EmptyState
              icon="map-pin"
              title="Belum ada halte terdaftar"
              description="Koridor ini belum memiliki data halte pada server"
            />
          ) : (
            <View style={styles.stack}>
              {stops.map((stop, index) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  showSequence
                  isLast={index === stops.length - 1}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
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
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  codePlate: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.textPrimary,
  },
  codeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.surface,
    ...typography.tabular,
  },
  studentTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  studentTagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.accent,
  },
  spacer: {
    flex: 1,
  },
  fareText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    ...typography.tabular,
  },
  corridorName: {
    ...typography.sectionTitle,
    fontSize: 18,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.body,
    flex: 1,
  },
  favActionBtn: {
    marginTop: spacing.sm,
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
  favActionBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  favActionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  favActionTextActive: {
    color: colors.accent,
  },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.statusGreenBg,
    borderWidth: 1,
    borderColor: colors.statusGreenBorder,
  },
  reminderText: {
    ...typography.body,
    color: colors.statusGreenText,
    flex: 1,
  },
  recommendCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  recommendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recommendTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.accent,
  },
  recommendBody: {
    ...typography.body,
    color: colors.textPrimary,
  },
  recommendBtn: {
    marginTop: spacing.xs,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  recommendBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.accentText,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
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
