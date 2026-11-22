import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CrowdReport } from '../types/transit';
import {
  formatCoordinates,
  formatReportTime,
  formatReportTypeLabel,
} from '../utils/format';
import { CrowdStatusBadge } from './CrowdStatusBadge';

interface CrowdReportCardProps {
  report: CrowdReport;
}

export function CrowdReportCard({ report }: CrowdReportCardProps) {
  const vehicleLabel = report.expand?.vehicle?.plate_number ?? report.vehicle;
  const stopLabel = report.expand?.stop?.name;
  const trustScore = typeof report.trust_score === 'number' ? Math.round(report.trust_score) : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.reporterCol}>
          <View style={styles.reporterRow}>
            <Text style={styles.reporterName}>
              {report.reporter_name || 'Komuter anonim'}
            </Text>
            {report.is_verified ? (
              <Feather name="check-circle" size={14} color={colors.accent} />
            ) : null}
          </View>
          <Text style={styles.metaText}>{formatReportTime(report.created)}</Text>
        </View>
        <CrowdStatusBadge status={report.reported_status} />
      </View>

      <View style={styles.typeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{formatReportTypeLabel(report.report_type)}</Text>
        </View>
        {trustScore !== null ? (
          <View style={styles.trustBadge}>
            <Feather name="shield" size={12} color={colors.accent} />
            <Text style={styles.trustText}>Skor kepercayaan {trustScore}%</Text>
          </View>
        ) : null}
      </View>

      {report.note ? <Text style={styles.note}>{report.note}</Text> : null}

      <View style={styles.tagsRow}>
        {vehicleLabel ? (
          <View style={styles.tag}>
            <Feather name="truck" size={12} color={colors.textMuted} />
            <Text style={styles.tagText}>{vehicleLabel}</Text>
          </View>
        ) : null}
        {stopLabel ? (
          <View style={styles.tag}>
            <Feather name="map-pin" size={12} color={colors.textMuted} />
            <Text style={styles.tagText} numberOfLines={1}>
              {stopLabel}
            </Text>
          </View>
        ) : null}
        {typeof report.latitude === 'number' && typeof report.longitude === 'number' ? (
          <View style={styles.tag}>
            <Feather name="crosshair" size={12} color={colors.textMuted} />
            <Text style={styles.tagText}>
              {formatCoordinates(report.latitude, report.longitude)}
            </Text>
          </View>
        ) : null}
      </View>
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
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  reporterCol: {
    flex: 1,
    gap: 2,
  },
  reporterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reporterName: {
    ...typography.cardTitle,
  },
  metaText: {
    ...typography.meta,
    ...typography.tabular,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBadgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  trustText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.accent,
    ...typography.tabular,
  },
  note: {
    ...typography.body,
    color: colors.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    maxWidth: '100%',
  },
  tagText: {
    ...typography.meta,
    color: colors.textSecondary,
    flexShrink: 1,
    ...typography.tabular,
  },
});
