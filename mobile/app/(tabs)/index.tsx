import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { CorridorCard } from '../../src/components/CorridorCard';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { LoadingState } from '../../src/components/LoadingState';
import { StopCard } from '../../src/components/StopCard';
import { VehicleCard } from '../../src/components/VehicleCard';
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
import { BANDUNG_CENTER, calculateDistanceKm } from '../../src/utils/geo';

export default function HomeScreen() {
  const router = useRouter();
  const { favoriteCorridors, toggleFavoriteCorridor } = useAuth();

  const [locationInfo, setLocationInfo] = useState<DeviceLocationResult | null>(null);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [loc, corridorItems, stopItems, vehicleItems] = await Promise.all([
        getCurrentBandungLocation(),
        getCorridors(),
        getStops(),
        getVehicles(),
      ]);
      setLocationInfo(loc);
      setCorridors(corridorItems);
      setStops(stopItems);
      setVehicles(vehicleItems);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  const refLat = locationInfo?.latitude ?? BANDUNG_CENTER.latitude;
  const refLng = locationInfo?.longitude ?? BANDUNG_CENTER.longitude;

  const nearestStops = useMemo(() => {
    return stops
      .map((stop) => ({
        stop,
        distanceKm: calculateDistanceKm(refLat, refLng, stop.latitude, stop.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [stops, refLat, refLng]);

  const savedCorridors = useMemo(() => {
    return corridors.filter((c) => favoriteCorridors.includes(c.id));
  }, [corridors, favoriteCorridors]);

  const activeVehicles = useMemo(() => {
    return [...vehicles]
      .sort((a, b) => a.eta_next_stop_min - b.eta_next_stop_min)
      .slice(0, 4);
  }, [vehicles]);

  const openCorridor = (corridor: Corridor) => {
    router.push({
      pathname: '/corridor/[id]',
      params: {
        id: corridor.id,
        code: corridor.code,
        name: corridor.name,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Memuat beranda transportasi Bandung" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => loadHome()} />
      </View>
    );
  }

  const outsideBandung = locationInfo?.status === 'granted' && !locationInfo.inBandung;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHome(true)}
          tintColor={colors.accent}
        />
      }
    >
      {outsideBandung ? (
        <View style={styles.warningBanner}>
          <Feather name="alert-triangle" size={16} color={colors.statusRedText} />
          <View style={styles.bannerTextCol}>
            <Text style={styles.warningTitle}>Di luar wilayah Kota Bandung</Text>
            <Text style={styles.warningBody}>{locationInfo?.message}</Text>
          </View>
        </View>
      ) : locationInfo?.message ? (
        <View style={styles.infoBanner}>
          <Feather name="map-pin" size={15} color={colors.accent} />
          <Text style={styles.infoText}>{locationInfo.message}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Halte terdekat</Text>
          <Text style={styles.metaText}>{stops.length} titik Bandung</Text>
        </View>

        {outsideBandung ? (
          <EmptyState
            icon="map-pin"
            title="Layanan khusus Kota Bandung"
            description="Halte dan armada hanya ditampilkan untuk pengguna di wilayah Kota Bandung"
          />
        ) : nearestStops.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="Belum ada data halte"
            description="Tarik ke bawah untuk memuat ulang data halte"
          />
        ) : (
          <View style={styles.stack}>
            {nearestStops.map(({ stop, distanceKm }) => (
              <StopCard key={stop.id} stop={stop} distanceKm={distanceKm} />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Koridor favorit</Text>
          <Pressable onPress={() => router.push('/(tabs)/corridors')}>
            <Text style={styles.linkText}>Kelola rute</Text>
          </Pressable>
        </View>

        {savedCorridors.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Belum ada koridor favorit</Text>
            <Text style={styles.emptyDesc}>
              Tandai rute harian rumah ke kantor atau kampus dari tab Koridor & Peta
            </Text>
          </View>
        ) : (
          <View style={styles.stack}>
            {savedCorridors.map((corridor) => (
              <CorridorCard
                key={corridor.id}
                corridor={corridor}
                isFavorite
                onToggleFavorite={() => toggleFavoriteCorridor(corridor.id)}
                onPress={() => openCorridor(corridor)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pantauan peta & armada aktif</Text>
          <Text style={styles.metaText}>{vehicles.length} unit beroperasi</Text>
        </View>

        {outsideBandung ? (
          <EmptyState
            icon="navigation"
            title="Armada tidak tersedia di lokasi Anda"
            description="Pantauan armada aktif dibatasi pada koridor dalam Kota Bandung"
          />
        ) : activeVehicles.length === 0 ? (
          <EmptyState
            icon="navigation"
            title="Belum ada armada aktif"
            description="Tarik ke bawah untuk memperbarui posisi armada"
          />
        ) : (
          <View style={styles.stack}>
            {activeVehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xxl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.statusRedBg,
    borderWidth: 1,
    borderColor: colors.statusRedBorder,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  warningTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.statusRedText,
  },
  warningBody: {
    ...typography.meta,
    color: colors.statusRedText,
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
    ...typography.meta,
    color: colors.accent,
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  metaText: {
    ...typography.meta,
    ...typography.tabular,
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.accent,
  },
  stack: {
    gap: spacing.md,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.cardTitle,
  },
  emptyDesc: {
    ...typography.body,
    color: colors.textMuted,
  },
});
