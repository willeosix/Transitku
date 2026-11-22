import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';
import { CrowdStatus } from '../types/transit';
import { formatCrowdLabel } from '../utils/format';

interface CrowdStatusBadgeProps {
  status: CrowdStatus;
  showCode?: boolean;
}

const statusPalette: Record<
  CrowdStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  GREEN: {
    bg: colors.statusGreenBg,
    border: colors.statusGreenBorder,
    text: colors.statusGreenText,
    dot: colors.statusGreenDot,
  },
  YELLOW: {
    bg: colors.statusYellowBg,
    border: colors.statusYellowBorder,
    text: colors.statusYellowText,
    dot: colors.statusYellowDot,
  },
  RED: {
    bg: colors.statusRedBg,
    border: colors.statusRedBorder,
    text: colors.statusRedText,
    dot: colors.statusRedDot,
  },
};

export function CrowdStatusBadge({ status, showCode = false }: CrowdStatusBadgeProps) {
  const palette = statusPalette[status] ?? statusPalette.GREEN;
  const label = showCode ? `${status} · ${formatCrowdLabel(status)}` : formatCrowdLabel(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.dot }]} />
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
