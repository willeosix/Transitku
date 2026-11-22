export const colors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  raised: '#F4F4F5',
  border: 'rgba(23, 23, 23, 0.08)',
  borderStrong: 'rgba(23, 23, 23, 0.16)',
  textPrimary: '#171717',
  textSecondary: '#525252',
  textMuted: '#737373',
  accent: '#1D4ED8',
  accentText: '#FFFFFF',
  accentSoft: '#EFF6FF',
  accentBorder: '#BFDBFE',
  statusGreenBg: '#F0FDF4',
  statusGreenBorder: '#BBF7D0',
  statusGreenText: '#166534',
  statusGreenDot: '#16A34A',
  statusYellowBg: '#FFFBEB',
  statusYellowBorder: '#FDE68A',
  statusYellowText: '#92400E',
  statusYellowDot: '#D97706',
  statusRedBg: '#FEF2F2',
  statusRedBorder: '#FECACA',
  statusRedText: '#991B1B',
  statusRedDot: '#DC2626',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  tag: 6,
  control: 8,
  card: 12,
  panel: 16,
} as const;

export const typography = {
  pageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500' as const,
    color: colors.textPrimary,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
  meta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  metric: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums' as const],
  },
  tabular: {
    fontVariant: ['tabular-nums' as const],
  },
};
