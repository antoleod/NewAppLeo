import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import { TimerWidget } from '@/components/home';
import { typeMeta } from '@/lib/entryComposer';
import type { SleepDraft } from '@/lib/sleepDraft';
import {
  getSmartSleepSuggestions,
  formatSleepDuration,
  type SleepPeriod,
  type SleepSuggestion,
} from '@/lib/sleep-suggestions';
import { haptics } from '@/utils/haptics';

export type SleepQuality = 'calm' | 'restless' | 'interrupted';

type Props = {
  editing: boolean;
  activeSleepDraft: SleepDraft | null;
  sleepInputMode: 'timer' | 'manual' | null;
  setSleepInputMode: (m: 'timer' | 'manual' | null) => void;
  sleepTimerRunning: boolean;
  setSleepTimerRunning: (next: boolean) => void;
  durationMin: string;
  setDurationMin: (v: string) => void;
  sleepStopToken: number;
  saving: boolean;
  largeTouchMode?: boolean;
  onEndDraftNow: (draft: SleepDraft) => void;
  onResumeDraft: (draft: SleepDraft) => void;
  onDiscardDraft: () => void;
  /** Start of the sleep window — used to display "20:45 → 06:30 · 9h45". */
  occurredAt?: Date;
  /** Sleep quality, if the parent wants to capture it (edit + manual modes). */
  sleepQuality?: SleepQuality | null;
  setSleepQuality?: (q: SleepQuality | null) => void;
};

const LOCALE_MAP: Record<string, string> = {
  fr: 'fr-FR', es: 'es-ES', nl: 'nl-NL', en: 'en-US',
};

export const SleepSection = React.memo(function SleepSection({
  editing, activeSleepDraft,
  sleepInputMode, setSleepInputMode,
  sleepTimerRunning, setSleepTimerRunning,
  durationMin, setDurationMin,
  sleepStopToken, saving, largeTouchMode,
  onEndDraftNow, onResumeDraft, onDiscardDraft,
  occurredAt, sleepQuality, setSleepQuality,
}: Props) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { language } = useLocale();
  const { entries } = useAppData();
  const { profile } = useAuth();
  const meta = typeMeta.sleep;

  const suggestion = useMemo<SleepSuggestion>(
    () => getSmartSleepSuggestions({
      entries,
      babyBirthDate: profile?.babyBirthDate ?? null,
    }),
    [entries, profile?.babyBirthDate],
  );

  const periodLabel: Record<SleepPeriod, string> = {
    morningNap:   t('sleep.periodMorningNap'),
    afternoonNap: t('sleep.periodAfternoonNap'),
    eveningNap:   t('sleep.periodEveningNap'),
    night:        t('sleep.periodNight'),
  };
  const sourceLabel: Record<SleepSuggestion['source'], string> = {
    periodHistory: t('sleep.suggestionPeriod'),
    anyHistory:    t('sleep.suggestionGeneral'),
    age:           t('sleep.suggestionAge'),
    fallback:      '',
  };

  const renderEditExtras = () => {
    if (!editing) return null;
    const minutes = Number(durationMin) || 0;
    const startDate = occurredAt ?? new Date();
    const endDate = new Date(startDate.getTime() + minutes * 60000);
    const fmt = (d: Date) => d.toLocaleTimeString(LOCALE_MAP[language] ?? 'en-US', { hour: '2-digit', minute: '2-digit' });
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const durLabel = hours > 0 ? `${hours}h${String(mins).padStart(2, '0')}` : `${mins} min`;

    const qualityOptions: { value: SleepQuality; emoji: string; tKey: string }[] = [
      { value: 'calm',        emoji: '😴', tKey: 'sleep.qualityCalm' },
      { value: 'restless',    emoji: '😣', tKey: 'sleep.qualityRestless' },
      { value: 'interrupted', emoji: '🌙', tKey: 'sleep.qualityInterrupted' },
    ];

    return (
      <View style={{ gap: 12, marginTop: 12 }}>
        {/* Time range + period badge */}
        {minutes > 0 ? (
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingHorizontal: 12, paddingVertical: 10,
            borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            backgroundColor: theme.bgCardAlt,
          }}>
            <Text style={{ fontSize: 16 }}>🛏️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                {fmt(startDate)} → {fmt(endDate)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>
                {durLabel} · {t(`sleep.period${suggestion.period.charAt(0).toUpperCase()}${suggestion.period.slice(1)}` as any)}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Sleep quality (only when caller wires the setter) */}
        {setSleepQuality ? (
          <View>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
              {t('sleep.qualityLabel')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {qualityOptions.map(({ value, emoji, tKey }) => {
                const selected = sleepQuality === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => { haptics.selection(); setSleepQuality(selected ? null : value); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={t(tKey)}
                    style={({ pressed }) => ({
                      flex: 1, minHeight: 52, paddingVertical: 6,
                      borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? meta.tone : colors.border,
                      backgroundColor: selected ? meta.toneSoft : pressed ? `${colors.card}88` : 'transparent',
                    })}
                  >
                    <Text style={{ fontSize: 18 }}>{emoji}</Text>
                    <Text style={{ fontSize: 10, fontWeight: selected ? '800' : '600', color: selected ? meta.tone : colors.muted }}>
                      {t(tKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const renderSuggestionChips = () => (
    <View style={{ marginTop: 12, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          {periodLabel[suggestion.period]}
        </Text>
        {sourceLabel[suggestion.source] ? (
          <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '500' }} numberOfLines={1}>
            · {sourceLabel[suggestion.source]}
          </Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {suggestion.chips.map((chip) => {
          const active = Number(durationMin) === chip.minutes;
          const showKind =
            chip.kind !== 'usual' &&
            (suggestion.source === 'periodHistory' || suggestion.source === 'anyHistory');
          const kindText =
            chip.kind === 'shorter' ? t('sleep.chipShorter')
            : chip.kind === 'longer' ? t('sleep.chipLonger')
            : chip.kind === 'last' ? t('sleep.chipLast')
            : t('sleep.chipUsual');
          return (
            <Pressable
              key={`${chip.kind}-${chip.minutes}`}
              onPress={() => {
                haptics.selection();
                setDurationMin(active ? '' : String(chip.minutes));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${kindText} ${formatSleepDuration(chip.minutes)}`}
              style={({ pressed }) => ({
                flex: 1, minHeight: 50, paddingVertical: 6,
                borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                borderWidth: active ? 2 : 1,
                borderColor: active ? meta.tone : colors.border,
                backgroundColor: active ? meta.toneSoft : pressed ? `${colors.card}88` : colors.card,
              })}
            >
              {showKind ? (
                <Text style={{
                  fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4,
                  color: active ? meta.tone : colors.muted, marginBottom: 1,
                }}>
                  {kindText}
                </Text>
              ) : null}
              <Text style={{
                fontSize: 13, fontWeight: '800',
                color: active ? meta.tone : colors.text,
              }}>
                {formatSleepDuration(chip.minutes)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  // ─── Draft banner ────────────────────────────────────────────────
  const draftBanner = !editing && activeSleepDraft && sleepInputMode === null && !sleepTimerRunning ? (() => {
    const elapsedMs = Date.now() - activeSleepDraft.startedAt;
    const h = Math.floor(elapsedMs / 3600000);
    const m = Math.floor((elapsedMs % 3600000) / 60000);
    const elapsedLabel = h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
    const startTime = new Date(activeSleepDraft.startedAt).toLocaleTimeString(
      LOCALE_MAP[language] ?? 'en-US',
      { hour: '2-digit', minute: '2-digit' },
    );
    const isStale = elapsedMs > 18 * 3600000;
    return (
      <View style={[styles.sectionCard, { borderWidth: 1.5, borderColor: '#58A6FF', backgroundColor: 'rgba(88,166,255,0.07)' }]}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#58A6FF', marginBottom: 4 }}>
          {t('entry.sleepDraftFound')}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 13, marginBottom: isStale ? 8 : 14 }}>
          {`${startTime} · ${elapsedLabel}`}
        </Text>
        {isStale ? (
          <Text style={{ color: theme.yellow, fontSize: 12, fontWeight: '600', marginBottom: 14, lineHeight: 16 }}>
            {`⚠ ${t('entry.sleepDraftStale')}`}
          </Text>
        ) : null}
        <Pressable
          onPress={() => onEndDraftNow(activeSleepDraft)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: saving }}
          accessibilityLabel={t('entry.sleepDraftEndNow')}
          style={({ pressed }) => ({
            paddingVertical: 15, borderRadius: 12, alignItems: 'center',
            backgroundColor: pressed ? 'rgba(88,166,255,0.75)' : '#58A6FF',
            opacity: saving ? 0.6 : 1,
            marginBottom: 10,
          })}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
            {saving ? '…' : `${t('entry.sleepDraftEndNow')} (${elapsedLabel})`}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable
            onPress={() => onResumeDraft(activeSleepDraft)}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t('entry.sleepDraftResume')}
            style={({ pressed }) => ({
              flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
              backgroundColor: pressed ? `${colors.border}60` : 'transparent',
            })}
          >
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
              {t('entry.sleepDraftResume')}
            </Text>
          </Pressable>
          <Pressable
            onPress={onDiscardDraft}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t('entry.sleepDraftDiscard')}
            style={({ pressed }) => ({
              flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
              backgroundColor: pressed ? `${colors.border}60` : 'transparent',
            })}
          >
            <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 13 }}>
              {t('entry.sleepDraftDiscard')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  })() : null;

  // ─── Mode picker (new entry, no input mode set) ─────────────────
  const startTimerLabel = t('sleep.startTimer');
  const startTimerHint = t('sleep.startTimerHint');
  const manualLabel = t('sleep.logPast');
  const manualHint = t('sleep.logPastHint');

  const modePicker = !editing && sleepInputMode === null ? (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>{t('entry.sleep')}</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          onPress={() => setSleepInputMode('timer')}
          accessibilityRole="button"
          accessibilityLabel={startTimerLabel}
          style={({ pressed }) => ({
            flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', gap: 6,
            borderWidth: 1.5, borderColor: meta.tone,
            backgroundColor: pressed ? meta.toneSoft : 'transparent',
          })}
        >
          <Text style={{ fontSize: 24 }}>▶️</Text>
          <Text style={{ color: meta.tone, fontWeight: '700', fontSize: 13 }}>{startTimerLabel}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{startTimerHint}</Text>
        </Pressable>
        <Pressable
          onPress={() => setSleepInputMode('manual')}
          accessibilityRole="button"
          accessibilityLabel={manualLabel}
          style={({ pressed }) => ({
            flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', gap: 6,
            borderWidth: 1, borderColor: colors.border,
            backgroundColor: pressed ? `${colors.card}88` : 'transparent',
          })}
        >
          <Text style={{ fontSize: 24 }}>📝</Text>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{manualLabel}</Text>
          <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{manualHint}</Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  // ─── Manual mode body ───────────────────────────────────────────
  const manualBody = !editing && sleepInputMode === 'manual' ? (
    <View style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('entry.duration')}</Text>
      <TimerWidget
        label={t('entry.durationMin')}
        valueMinutes={Number(durationMin) || 0}
        onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
        largeTouchMode={largeTouchMode}
        hideActionButton
      />
      {durationMin && Number(durationMin) > 0 ? (
        <View style={[styles.infoStrip, { marginTop: 12 }]}>
          <Text style={[styles.infoStripText, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}>
            {Math.floor(Number(durationMin) / 60)}h {Number(durationMin) % 60}m
          </Text>
        </View>
      ) : null}
      {renderSuggestionChips()}
    </View>
  ) : null;

  // ─── Editing body ───────────────────────────────────────────────
  const editingBody = editing ? (
    <View style={styles.sectionCard}>
      <TimerWidget
        label={t('entry.durationMin')}
        valueMinutes={Number(durationMin) || 0}
        onChangeMinutes={(minutes) => setDurationMin(String(minutes))}
        largeTouchMode={largeTouchMode}
        autoStart={!editing}
        hideActionButton
        stopRequestToken={sleepStopToken}
        onRunningChange={setSleepTimerRunning}
      />
      {renderEditExtras()}
      {renderSuggestionChips()}
    </View>
  ) : null;

  return (
    <>
      {draftBanner}
      {modePicker}
      {manualBody}
      {editingBody}
    </>
  );
});

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, padding: 14, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  infoStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  infoStripText: {
    fontSize: 10, fontWeight: '800', borderRadius: 999, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
  },
});
