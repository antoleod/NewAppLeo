export const typography = {
  heroName: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 36,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 23,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  statValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 29,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 18,
    lineHeight: 25,
  },
  detail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  pill: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 17,
  },
  timeValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 26,
  },
} as const;
