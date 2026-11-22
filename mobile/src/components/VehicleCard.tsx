import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CrowdStatus, Vehicle } from '../types/transit';
import { CrowdStatusBadge } from './CrowdStatusBadge';

interface VehicleCardProps {
  vehicle: Vehicle;
  onReportPress?: (vehicle: Vehicle) => void;
}

const barColorByStatus: Record<CrowdStatus, string> = {
  GREEN: colors.statusGreenDot,
  YELLOW: colors.statusYellowDot,
  RED: colors.statusRedDot,
};

export function VehicleCard({ vehicle, onReportPress }: VehicleCardProps) {
  const corridorName = vehicle.expand?.corridor?.name ?? 'Koridor tidak terhubung';
  const corridorCode = vehicle.expand?.corridor?.code;
  const clampedLoad = Math.max(0, Math.min(100, Math.round(vehicle.load_factor ?? 0)));
  const fillColor = barColorByStatus[vehicle.crowd_status] ?? colors.accent;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.identityCol}>
          <View style={styles.plateRow}>
            <Text style={styles.plate}>{vehicle.plate_number}</Text>
            <View style={styles.typeChip}>
              <Text style={styles.typeText}>{vehicle.vehicle_type}</Text>
            </View>
          </View>
          <Text style={styles.corridorText} numberOfLines={1}>
            {corridorCode ? `${corridorCode} · ${corridorName}` : corridorName}
          </Text>
        </View>
        <CrowdStatusBadge status={vehicle.crowd_status} showCode />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Estimasi tiba</Text>
          <Text style={styles.metricValue}>{vehicle.eta_next_stop_min} mnt</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Penumpang</Text>
          <Text style={styles.metricValue}>
            {vehicle.passenger_count}/{vehicle.capacity_max}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricBlock}>
          <Text style={styles.metricLabel}>Jeda armada</Text>
          <Text style={styles.metricValue}>{vehicle.headway_min} mnt</Text>
        </View>
      </View>

      <View style={styles.capacitySection}>
        <View style={styles.capacityLabelRow}>
          <Text style={styles.metaText}>Keterisian kabin</Text>
          <Text style={styles.loadValue}>{clampedLoad}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${clampedLoad}%`, backgroundColor: fillColor },
            ]}
          />
        </View>
      </View>

      {onReportPress ? (
        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [styles.reportBtn, pressed && styles.reportBtnPressed]}
            onPress={() => onReportPress(vehicle)}
          >
            <Feather name="edit-3" size={14} color={colors.accent} />
            <Text style={styles.reportBtnText}>Laporkan kepadatan armada ini</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  identityCol: {
    flex: 1,
    gap: spacing.xs,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  plate: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    ...typography.tabular,
  },
  typeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  corridorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.raised,
    borderRadius: radius.control,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  metricBlock: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderStrong,
    marginHorizontal: spacing.sm,
  },
  metricLabel: {
    ...typography.meta,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    ...typography.tabular,
  },
  capacitySection: {
    gap: 6,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    ...typography.meta,
  },
  loadValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    ...typography.tabular,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.raised,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  footerRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  reportBtnPressed: {
    opacity: 0.7,
  },
  reportBtnText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.accent,
  },
});
