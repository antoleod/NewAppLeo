import { useEffect, useState } from 'react';
import { AppState, Image, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, EmptyState, Heading, Input, Page, Segment } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useLocale } from '@/context/LocaleContext';
import { getActiveBaby, getBabies, saveBaby, setActiveBabyId, removeBaby } from '@/lib/storage';
import { getLocalPairingSession } from '@/services/pairingService';
import { flushQueuedOperations, loadQueuedOperations } from '@/lib/sync';
import { useToast } from '@/components/Toast';
import { haptics } from '@/lib/haptics';

const languageOptions = [
  { label: 'FR', value: 'fr' },
  { label: 'ES', value: 'es' },
  { label: 'EN', value: 'en' },
  { label: 'NL', value: 'nl' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { setLanguage: setContextLanguage } = useLocale();
  const { profile, guestMode, saveProfile, signOut } = useAuth();
  const toast = useToast();

  const [caregiverName, setCaregiverName] = useState(profile?.caregiverName ?? '');
  const [babyName, setBabyName] = useState(profile?.babyName ?? 'Leo');
  const [babyBirthDate, setBabyBirthDate] = useState(profile?.babyBirthDate ?? '');
  const [birthWeightKg, setBirthWeightKg] = useState(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : '');
  const [babyNotes, setBabyNotes] = useState(profile?.babyNotes ?? '');
  const [babyPhotoUri, setBabyPhotoUri] = useState(profile?.babyPhotoUri ?? '');
  const [babies, setBabies] = useState<Array<{ id: string; name: string; birthDate: string }>>([]);
  const [activeBabyId, setBabyActiveId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [queuedSyncCount, setQueuedSyncCount] = useState(0);
  const [showChildren, setShowChildren] = useState(false);
  const [showSession, setShowSession] = useState(false);

  useEffect(() => {
    setCaregiverName(profile?.caregiverName ?? '');
    setBabyName(profile?.babyName ?? 'Leo');
    setBabyBirthDate(profile?.babyBirthDate ?? '');
    setBirthWeightKg(profile?.birthWeightKg ? String(profile.birthWeightKg) : '');
    setCurrentWeightKg(profile?.currentWeightKg ? String(profile.currentWeightKg) : '');
    setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
    setBabyNotes(profile?.babyNotes ?? '');
    setBabyPhotoUri(profile?.babyPhotoUri ?? '');
  }, [profile]);

  useEffect(() => {
    const refresh = async () => {
      setBabies(await getBabies());
      setBabyActiveId((await getActiveBaby())?.id ?? null);
      setPairingCode((await getLocalPairingSession())?.code ?? null);
      setQueuedSyncCount((await loadQueuedOperations()).length);
    };
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => state === 'active' && void refresh());
    return () => subscription.remove();
  }, []);

  async function handleSave() {
    await saveProfile({ caregiverName: caregiverName.trim(), babyName: babyName.trim(), babyBirthDate: babyBirthDate.trim(), birthWeightKg: Number(birthWeightKg) || undefined, currentWeightKg: Number(currentWeightKg) || undefined, heightCm: Number(heightCm) || undefined, babyNotes: babyNotes.trim() || undefined, babyPhotoUri: babyPhotoUri || undefined });
    haptics.success();
    toast.success(t('profile.profileUpdated'));
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      haptics.warning();
      toast.warning(t('profile.allowPhotoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled && result.assets[0]?.uri) setBabyPhotoUri(result.assets[0].uri);
  }

  async function handleAddBaby() {
    if (!babyName.trim() || !babyBirthDate.trim()) return;
    const baby = await saveBaby({ id: globalThis.crypto?.randomUUID?.() ?? `baby_${Date.now()}`, name: babyName.trim(), birthDate: babyBirthDate.trim(), sex: profile?.babySex ?? 'unspecified', birthWeightKg: Number(birthWeightKg) || undefined, currentWeightKg: Number(currentWeightKg) || undefined, heightCm: Number(heightCm) || undefined, notes: babyNotes.trim() || undefined, photoUri: babyPhotoUri || undefined, language: (profile?.language ?? 'fr') as any, createdAt: new Date().toISOString() });
    setBabies(await getBabies());
    setBabyActiveId(baby.id);
  }

  async function handleSyncNow() {
    try {
      if (!profile) throw new Error('You must be signed in.');
      const result = await flushQueuedOperations(profile.uid);
      setQueuedSyncCount(0);
      haptics.success();
      toast.success(t('profile.syncFlushed').replace('{count}', String(result.flushed)));
    } catch (error: any) {
      haptics.error();
      toast.error(error?.message ?? t('profile.syncError'));
    }
  }

  return (
    <Page>
      <Heading eyebrow={t('tabs.profile')} title={t('profile.section')} subtitle={t('profile.subtitle')} />

      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Pressable onPress={handlePickPhoto} style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center' }}>
            {babyPhotoUri ? <Image source={{ uri: babyPhotoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('profile.photo')}</Text>}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted }}>{t('profile.modeLabel')}{guestMode ? t('profile.modeGuest') : t('profile.modeCloud')}</Text>
            <Text style={{ color: colors.muted }}>{t('profile.languageLabel')}{(profile?.language ?? 'fr').toUpperCase()}</Text>
          </View>
        </View>
        <Input label={t('profile.caregiverLabel')} value={caregiverName} onChangeText={setCaregiverName} />
        <Input label={t('profile.babyNameLabel')} value={babyName} onChangeText={setBabyName} />
        <Input label={t('profile.birthDateLabel')} value={babyBirthDate} onChangeText={setBabyBirthDate} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Input label={t('profile.birthWeightLabel')} value={birthWeightKg} onChangeText={setBirthWeightKg} keyboardType="decimal-pad" inputMode="decimal" /></View>
          <View style={{ flex: 1 }}><Input label={t('profile.currentWeightLabel')} value={currentWeightKg} onChangeText={setCurrentWeightKg} keyboardType="decimal-pad" inputMode="decimal" /></View>
        </View>
        <Input label={t('profile.heightLabel')} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" inputMode="decimal" />
        <Input label={t('profile.notesLabel')} value={babyNotes} onChangeText={setBabyNotes} multiline />
        <Segment value={profile?.language ?? 'fr'} onChange={(value) => void setContextLanguage(value as any)} options={languageOptions} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button label={t('common.save')} onPress={handleSave} /></View>
          <View style={{ flex: 1 }}><Button label="Theme & Import" onPress={() => router.push('/(app)/(tabs)/settings-theme' as any)} variant="secondary" /></View>
        </View>
      </Card>

      <Card>
        <Pressable onPress={() => setShowChildren((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('profile.childrenTitle')}</Text>
          <Text style={{ color: colors.muted }}>{showChildren ? 'Hide' : 'Show'}</Text>
        </Pressable>
        {showChildren ? (
          babies.length ? babies.map((baby) => (
            <View key={baby.id} style={{ borderRadius: 14, borderWidth: 1, borderColor: activeBabyId === baby.id ? colors.primary : colors.border, padding: 12, marginTop: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{baby.name} {activeBabyId === baby.id ? `(${t('profile.activeLabel')})` : ''}</Text>
              <Text style={{ color: colors.muted }}>{baby.birthDate}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1 }}><Button label="Set active" onPress={async () => { await setActiveBabyId(baby.id); setBabyActiveId(baby.id); }} variant={activeBabyId === baby.id ? 'secondary' : 'ghost'} /></View>
                <View style={{ flex: 1 }}><Button label="Remove" onPress={() => removeBaby(baby.id).then(async () => { setBabies(await getBabies()); setBabyActiveId((await getActiveBaby())?.id ?? null); })} variant="ghost" /></View>
              </View>
            </View>
          )) : <EmptyState icon="person-add-outline" title="No profiles yet" body="Create your first child profile." action={<Button label="Add" onPress={handleAddBaby} />} />
        ) : null}
        {showChildren && babies.length ? <Button label="Add profile" onPress={handleAddBaby} variant="ghost" /> : null}
      </Card>

      <Card>
        <Pressable onPress={() => setShowSession((v) => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Session</Text>
          <Text style={{ color: colors.muted }}>{showSession ? 'Hide' : 'Show'}</Text>
        </Pressable>
        {showSession ? (
          <>
            <Text style={{ color: colors.muted }}>Email: {profile?.authEmail}</Text>
            <Text style={{ color: colors.muted }}>Pairing: {pairingCode ?? 'none'}</Text>
            <Text style={{ color: colors.muted }}>Queue: {queuedSyncCount}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Button label="Sync" onPress={handleSyncNow} variant="ghost" /></View>
              <View style={{ flex: 1 }}><Button label="Pair" onPress={() => router.push('/pair')} variant="ghost" /></View>
            </View>
            <Button label="Log out" onPress={signOut} variant="danger" />
          </>
        ) : null}
      </Card>
    </Page>
  );
}
