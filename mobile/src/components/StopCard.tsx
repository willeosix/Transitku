import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Stop } from '../types/transit';
import { formatCoordinates, formatZoneLabel } from '../utils/format';
import { formatDistance } from '../utils/geo';

interface StopCardProps {
  stop: Stop;
  showSequence?: boolean;
  isLast?: boolean;
  distanceKm?: number;
}

export function StopCard({
  stop,
  showSequence = false,
  isLast = false,
  distanceKm,
}: StopCardProps) {
  return (
    <View style={styles.wrapper}>
      {showSequence ? (
        <View style={styles.timelineCol}>
          <View style={styles.sequenceCircle}>
            <Text style={styles.sequenceText}>{stop.sequence}</Text>
          </View>
          {!isLast ? <View style={styles.timelineLine} /> : null}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={2}>
            {stop.name}
          </Text>
          <View style={styles.badgesRow}>
            {typeof distanceKm === 'number' ? (
              <View style={styles.distanceTag}>
                <Text style={styles.distanceText}>{formatDistance(distanceKm)}</Text>
              </View>
            ) : null}
            <View style={styles.zoneTag}>
              <Text style={styles.zoneText}>{formatZoneLabel(stop.zone_tag)}</Text>
            </View>
          </View>
        </View>

        {stop.facilities ? (
          <View style={styles.detailRow}>
            <View style={styles.iconSlot}>
              <Feather name="layers" size={14} color={colors.textMuted} />
            </View>
            <Text style={styles.facilityText}>{stop.facilities}</Text>
          </View>
        ) : null}

        {stop.nearby_landmark ? (
          <View style={styles.detailRow}>
            <View style={styles.iconSlot}>
              <Feather name="map-pin" size={14} color={colors.textMuted} />
            </View>
            <Text style={styles.landmarkText}>{stop.nearby_landmark}</Text>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <View style={styles.iconSlot}>
            <Feather name="crosshair" size={14} color={colors.textMuted} />
          </View>
          <Text style={styles.coordText}>
            {formatCoordinates(stop.latitude, stop.longitude)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  timelineCol: {
    width: 28,
    alignItems: 'center',
  },
  sequenceCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  sequenceText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.accent,
    ...typography.tabular,
  },
  timelineLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.borderStrong,
    marginVertical: spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    ...typography.cardTitle,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  distanceTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  distanceText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: colors.accent,
    ...typography.tabular,
  },
  zoneTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoneText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconSlot: {
    width: 18,
    paddingTop: 2,
    alignItems: 'center',
  },
  facilityText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  landmarkText: {
    ...typography.body,
    flex: 1,
  },
  coordText: {
    ...typography.meta,
    ...typography.tabular,
    flex: 1,
  },
});
