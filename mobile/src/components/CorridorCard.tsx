import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Corridor } from '../types/transit';
import { formatRupiah } from '../utils/format';

interface CorridorCardProps {
  corridor: Corridor;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function CorridorCard({
  corridor,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: CorridorCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.codePlate}>
          <Text style={styles.codeText}>{corridor.code}</Text>
        </View>
        {corridor.mode ? (
          <View style={styles.modeTag}>
            <Text style={styles.modeTagText}>{corridor.mode}</Text>
          </View>
        ) : null}
        {corridor.student_friendly ? (
          <View style={styles.studentTag}>
            <Text style={styles.studentTagText}>Ramah pelajar</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <Text style={styles.fareText}>{formatRupiah(corridor.fare)}</Text>
        {onToggleFavorite ? (
          <Pressable
            style={[styles.favBtn, isFavorite && styles.favBtnActive]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            hitSlop={8}
          >
            <Feather
              name="bookmark"
              size={15}
              color={isFavorite ? colors.accent : colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.name}>{corridor.name}</Text>

      <View style={styles.routeBlock}>
        <View style={styles.railColumn}>
          <View style={styles.originDot} />
          <View style={styles.railLine} />
          <View style={styles.destinationNode} />
        </View>
        <View style={styles.endpointsColumn}>
          <Text style={styles.endpointText} numberOfLines={1}>
            {corridor.origin || 'Asal tidak tersedia'}
          </Text>
          <Text style={styles.endpointText} numberOfLines={1}>
            {corridor.destination || 'Tujuan tidak tersedia'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.metaRow}>
          <Feather name="clock" size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{corridor.operating_hours || 'Jadwal belum diatur'}</Text>
        </View>
        <View style={styles.linkRow}>
          <Text style={styles.linkText}>Detail rute</Text>
          <Feather name="chevron-right" size={16} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
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
  cardPressed: {
    backgroundColor: colors.raised,
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
  modeTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeTagText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textSecondary,
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
  favBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.tag,
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtnActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder,
  },
  name: {
    ...typography.cardTitle,
    fontSize: 16,
    lineHeight: 22,
  },
  routeBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  railColumn: {
    width: 12,
    alignItems: 'center',
    paddingVertical: 5,
  },
  originDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  railLine: {
    width: 1.5,
    flex: 1,
    minHeight: 16,
    backgroundColor: colors.borderStrong,
    marginVertical: 2,
  },
  destinationNode: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  endpointsColumn: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  endpointText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...typography.meta,
    ...typography.tabular,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: colors.accent,
  },
});
