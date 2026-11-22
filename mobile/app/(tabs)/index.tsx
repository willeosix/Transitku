import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CorridorCard } from '../../src/components/CorridorCard';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChips, FilterOption } from '../../src/components/FilterChips';
import { LoadingState } from '../../src/components/LoadingState';
import { getApiErrorMessage } from '../../src/services/api';
import { getCorridors } from '../../src/services/transitService';
import { colors, spacing, typography } from '../../src/theme/tokens';
import { Corridor } from '../../src/types/transit';

type CorridorFilter = 'all' | 'student';

const filterOptions: FilterOption<CorridorFilter>[] = [
  { value: 'all', label: 'Semua' },
  { value: 'student', label: 'Ramah Pelajar' },
];

export default function CorridorsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<CorridorFilter>('all');
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCorridors = useCallback(
    async (selectedFilter: CorridorFilter, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const items = await getCorridors(selectedFilter === 'student');
        setCorridors(items);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCorridors(filter);
  }, [filter, fetchCorridors]);

  const handleOpenCorridor = (corridor: Corridor) => {
    router.push({
      pathname: '/corridor/[id]',
      params: {
        id: corridor.id,
        code: corridor.code,
        name: corridor.name,
      },
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.subtitle}>
          Trans Metro Pasundan dan Angkot Bandung
        </Text>
        <FilterChips
          options={filterOptions}
          selected={filter}
          onSelect={(value) => setFilter(value)}
        />
      </View>

      {loading ? (
        <LoadingState message="Memuat daftar koridor" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchCorridors(filter)} />
      ) : (
        <FlatList
          data={corridors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCorridors(filter, true)}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <CorridorCard corridor={item} onPress={() => handleOpenCorridor(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="git-branch"
              title="Belum ada koridor"
              description="Tidak ditemukan rute koridor untuk filter yang dipilih"
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
