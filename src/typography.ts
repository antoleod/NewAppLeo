export const typography = {
  heroName: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  detail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
  },
  pill: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  timeValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 20,
  },
} as const;
