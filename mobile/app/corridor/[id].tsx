import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StopCard } from '../../src/components/StopCard';
import { getApiErrorMessage } from '../../src/services/api';
import { getCorridorById, getStopsByCorridor } from '../../src/services/transitService';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';
import { Corridor, Stop } from '../../src/types/transit';
import { formatRupiah } from '../../src/utils/format';

export default function CorridorDetailScreen() {
  const params = useLocalSearchParams<{ id?: string; code?: string; name?: string }>();
  const corridorId = typeof params.id === 'string' ? params.id : '';

  const [corridor, setCorridor] = useState<Corridor | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(
    async (isRefresh = false) => {
      if (!corridorId) {
        setError('ID koridor tidak valid');
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [corridorData, stopItems] = await Promise.all([
          getCorridorById(corridorId),
          getStopsByCorridor(corridorId),
        ]);
        setCorridor(corridorData);
        setStops(stopItems);
      } catch (err) {
        setError(getApiErrorMessage(err));
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

  const headerTitle = corridor?.code ?? params.code ?? 'Detail koridor';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: headerTitle }} />

      {loading ? (
        <LoadingState message="Memuat daftar halte koridor" />
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
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Urutan halte</Text>
            <Text style={styles.countText}>{stops.length} halte</Text>
          </View>

          {stops.length === 0 ? (
            <EmptyState
              icon="map-pin"
              title="Belum ada halte terdaftar"
              description="Koridor ini belum memiliki data halte pada server"
            />
          ) : (
            <View style={styles.stopList}>
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
  stopList: {
    gap: spacing.md,
  },
});
