export const typography = {
  heroName: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  sectionLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    lineHeight: 14,
  },
  statValue: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    lineHeight: 14,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0,
  },
  detail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  pill: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  timeValue: {
    fontFamily: 'Fraunces_700Bold',
    fontSize: 24,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
} as const;
