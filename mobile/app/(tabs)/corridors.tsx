import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BandungLiveMap } from '../../src/components/BandungLiveMap';
import { CorridorCard } from '../../src/components/CorridorCard';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { FilterChips, FilterOption } from '../../src/components/FilterChips';
import { LoadingState } from '../../src/components/LoadingState';
import { useAuth } from '../../src/context/AuthContext';
import { getApiErrorMessage } from '../../src/services/api';
import {
  DeviceLocationResult,
  getCurrentBandungLocation,
} from '../../src/services/locationService';
import {
  getCorridors,
  getStops,
  getVehicles,
} from '../../src/services/transitService';
import { colors, radius, spacing, typography } from '../../src/theme/tokens';
import { Corridor, Stop, Vehicle } from '../../src/types/transit';

type ModeTab = 'Bus Kota' | 'KRL' | 'Angkot';

const modeOptions: FilterOption<ModeTab>[] = [
  { value: 'Bus Kota', label: 'Bus Kota (Live)' },
  { value: 'KRL', label: 'KRL (Segera)' },
  { value: 'Angkot', label: 'Angkot (Segera)' },
];

export default function CorridorsScreen() {
  const router = useRouter();
  const { favoriteCorridors, toggleFavoriteCorridor } = useAuth();

  const [modeTab, setModeTab] = useState<ModeTab>('Bus Kota');
  const [studentOnly, setStudentOnly] = useState(false);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [locationInfo, setLocationInfo] = useState<DeviceLocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (isStudentOnly: boolean, isRefresh = false, silent = false) => {
      if (!silent) {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      }
      setError(null);

      try {
        const [corridorItems, vehicleItems, stopItems, loc] = await Promise.all([
          getCorridors({ mode: 'Bus Kota', studentFriendlyOnly: isStudentOnly }),
          getVehicles(),
          getStops(),
          silent ? Promise.resolve(null) : getCurrentBandungLocation(),
        ]);
        setCorridors(corridorItems);
        setVehicles(vehicleItems);
        setStops(stopItems);
        if (loc) {
          setLocationInfo(loc);
        }
      } catch (err) {
        if (!silent) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData(studentOnly);
  }, [studentOnly, loadData]);

  useEffect(() => {
    if (modeTab !== 'Bus Kota') {
      return;
    }
    const timer = setInterval(() => {
      loadData(studentOnly, false, true);
    }, 15000);
    return () => clearInterval(timer);
  }, [modeTab, studentOnly, loadData]);

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

  const userPoint =
    locationInfo?.status === 'granted' &&
    typeof locationInfo.latitude === 'number' &&
    typeof locationInfo.longitude === 'number'
      ? { latitude: locationInfo.latitude, longitude: locationInfo.longitude }
      : null;

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <FilterChips
          options={modeOptions}
          selected={modeTab}
          onSelect={(value) => setModeTab(value)}
        />
        {modeTab === 'Bus Kota' ? (
          <Pressable
            style={[styles.toggleRow, studentOnly && styles.toggleRowActive]}
            onPress={() => setStudentOnly((prev) => !prev)}
          >
            <Feather
              name={studentOnly ? 'check-square' : 'square'}
              size={16}
              color={studentOnly ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.toggleText, studentOnly && styles.toggleTextActive]}>
              Ramah pelajar
            </Text>
          </Pressable>
        ) : null}
      </View>

      {modeTab !== 'Bus Kota' ? (
        <ScrollView contentContainerStyle={styles.comingSoonWrap}>
          <View style={styles.comingSoonCard}>
            <View style={styles.comingSoonIcon}>
              <Feather name="clock" size={18} color={colors.accent} />
            </View>
            <Text style={styles.comingSoonTitle}>
              {modeTab === 'KRL' ? 'Commuter Line Bandung Raya' : 'Angkot Kota Bandung'}
            </Text>
            <Text style={styles.comingSoonStatus}>Segera hadir</Text>
            <Text style={styles.comingSoonBody}>
              Data posisi GPS real-time untuk moda {modeTab} belum dibuka secara publik oleh operator.
              TransitKu saat ini memfokuskan pemantauan live pada 5 koridor utama Trans Metro Bandung
              dari BEMO Dishub Kota Bandung.
            </Text>
            <Pressable
              style={styles.backToLiveBtn}
              onPress={() => setModeTab('Bus Kota')}
            >
              <Text style={styles.backToLiveText}>Lihat 5 koridor Bus Kota live</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : loading ? (
        <LoadingState message="Memuat peta live dan koridor Bandung" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => loadData(studentOnly)} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(studentOnly, true)}
              tintColor={colors.accent}
            />
          }
        >
          <BandungLiveMap
            vehicles={vehicles}
            corridors={corridors}
            stops={stops}
            userLocation={userPoint}
            height={264}
            title="Peta live Metro Jabar Trans"
            subtitle={`${vehicles.length} armada live · ${stops.length} shelter resmi · sinkron 15 dtk`}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Koridor Metro Jabar Trans</Text>
            <Text style={styles.countText}>{corridors.length} rute</Text>
          </View>

          {corridors.length === 0 ? (
            <EmptyState
              icon="map"
              title="Koridor tidak ditemukan"
              description="Nonaktifkan filter Ramah pelajar untuk melihat seluruh 5 koridor utama"
            />
          ) : (
            <View style={styles.stack}>
              {corridors.map((item) => (
                <CorridorCard
                  key={item.id}
                  corridor={item}
                  isFavorite={favoriteCorridors.includes(item.id)}
                  onToggleFavorite={() => toggleFavoriteCorridor(item.id)}
                  onPress={() => handleOpenCorridor(item)}
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
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  toggleRowActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  toggleText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.accent,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
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
  comingSoonWrap: {
    padding: spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  comingSoonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  comingSoonTitle: {
    ...typography.sectionTitle,
    textAlign: 'center',
  },
  comingSoonStatus: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.accentSoft,
  },
  comingSoonBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  backToLiveBtn: {
    marginTop: spacing.md,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backToLiveText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: colors.accentText,
  },
});
