import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChips, FilterOption } from '../../src/components/FilterChips';
import { LoadingState } from '../../src/components/LoadingState';
import { StopCard } from '../../src/components/StopCard';
import { getApiErrorMessage } from '../../src/services/api';
import { getStops } from '../../src/services/transitService';
import { colors, spacing, typography } from '../../src/theme/tokens';
import { Stop, ZoneTag } from '../../src/types/transit';

type StopFilter = 'all' | ZoneTag;

const filterOptions: FilterOption<StopFilter>[] = [
  { value: 'all', label: 'Semua' },
  { value: 'tourism', label: 'Wisata' },
  { value: 'campus', label: 'Kampus' },
  { value: 'general', label: 'Umum' },
];

export default function StopsScreen() {
  const [filter, setFilter] = useState<StopFilter>('all');
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStops = useCallback(async (selectedFilter: StopFilter, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const items = await getStops(selectedFilter === 'all' ? undefined : selectedFilter);
      setStops(items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStops(filter);
  }, [filter, fetchStops]);

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.subtitle}>
          Titik halte dan landmark sekitar Bandung
        </Text>
        <FilterChips
          options={filterOptions}
          selected={filter}
          onSelect={(value) => setFilter(value)}
        />
      </View>

      {loading ? (
        <LoadingState message="Memuat daftar halte" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchStops(filter)} />
      ) : (
        <FlatList
          data={stops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchStops(filter, true)}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => <StopCard stop={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="map-pin"
              title="Halte tidak ditemukan"
              description="Belum ada data halte untuk kategori zona ini"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  subtitle: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
});
