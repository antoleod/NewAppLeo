import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Heading, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { useAuth } from '@/context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { entries } = useAppData();
  const { profile } = useAuth();
  
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;

  // Calculamos las estadísticas de alimentación específicamente para "Hoy"
  const todayStats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const todayEntries = entries.filter(e => new Date(e.timestamp).getTime() >= startOfDay);
    
    const bottles = todayEntries.filter(e => e.type === 'feeding');
    const solids = todayEntries.filter(e => e.type === 'solids');
    
    return {
      totalVolume: bottles.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0),
      bottleCount: bottles.length,
      mealCount: solids.filter(e => e.foodType === 'meal').length,
      dessertCount: solids.filter(e => e.foodType === 'dessert').length,
    };
  }, [entries]);

  const latestEntry = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  }, [entries]);

  const handleQuickAction = (type: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/entry/${type}`);
  };

  return (
    <Page contentStyle={[styles.container, { maxWidth: isDesktop ? 900 : '100%' }]}>
      <View style={styles.header}>
        <Heading 
          eyebrow={`¡Hola de nuevo, ${profile?.caregiverName || 'Papá/Mamá'}!`}
          title={`El día de ${profile?.babyName || 'Leo'}`}
          subtitle="Resumen rápido de las actividades de hoy."
        />
      </View>

      {/* Fila de Tarjetas de Resumen */}
      <View style={[styles.summaryRow, { gap: 12 * uiScale }]}>
        <Card style={styles.summaryCard} gap={8}>
          <View style={[styles.iconCircle, { backgroundColor: '#4D96FF20' }]}>
            <Ionicons name="water" size={20 * uiScale} color="#4D96FF" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text, fontSize: 22 * uiScale }]}>
            {todayStats.totalVolume}<Text style={{ fontSize: 14 * uiScale, fontWeight: '600' }}>ml</Text>
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.muted, fontSize: 11 * uiScale }]}>
            {todayStats.bottleCount} TOMAS
          </Text>
        </Card>

        <Card style={styles.summaryCard} gap={8}>
          <View style={[styles.iconCircle, { backgroundColor: '#34C75920' }]}>
            <Ionicons name="restaurant" size={20 * uiScale} color="#34C759" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text, fontSize: 22 * uiScale }]}>
            {todayStats.mealCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.muted, fontSize: 11 * uiScale }]}>
            COMIDAS
          </Text>
        </Card>

        <Card style={styles.summaryCard} gap={8}>
          <View style={[styles.iconCircle, { backgroundColor: '#AF52DE20' }]}>
            <Ionicons name="ice-cream" size={20 * uiScale} color="#AF52DE" />
          </View>
          <Text style={[styles.summaryValue, { color: colors.text, fontSize: 22 * uiScale }]}>
            {todayStats.dessertCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.muted, fontSize: 11 * uiScale }]}>
            POSTRES
          </Text>
        </Card>
      </View>

      {/* Sección de Última Actividad */}
      <View style={{ gap: 12 * uiScale }}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * uiScale }]}>Última actividad</Text>
        {latestEntry ? (
          <Card style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <View style={[styles.iconCircle, { backgroundColor: latestEntry.type === 'feeding' ? '#4D96FF20' : latestEntry.type === 'solids' ? '#FF950020' : '#AF52DE20' }]}>
                <Ionicons 
                  name={latestEntry.type === 'feeding' ? 'water' : latestEntry.type === 'solids' ? 'restaurant' : 'moon'} 
                  size={20 * uiScale} 
                  color={latestEntry.type === 'feeding' ? '#4D96FF' : latestEntry.type === 'solids' ? '#FF9500' : '#AF52DE'} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.latestTitle, { color: colors.text, fontSize: 16 * uiScale }]}>
                  {latestEntry.type === 'feeding' ? 'Biberón' : latestEntry.type === 'solids' ? 'Comida Sólida' : 'Sueño'}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 13 * uiScale }}>
                  {new Date(latestEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.latestValue, { color: colors.text, fontSize: 15 * uiScale }]}>
                {latestEntry.amount ? `${latestEntry.amount}ml` : latestEntry.duration ? `${latestEntry.duration}m` : 'Registrado'}
              </Text>
            </View>
          </Card>
        ) : (
          <Text style={{ color: colors.muted, fontSize: 14 * uiScale, fontStyle: 'italic', marginLeft: 4 }}>
            No hay actividades registradas aún.
          </Text>
        )}
      </View>

      {/* Botones de Acción Rápida */}
      <View style={{ gap: 12 * uiScale }}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 * uiScale }]}>Registrar actividad</Text>
        <View style={[styles.actionGrid, { gap: 12 * uiScale }]}>
          <Pressable 
            onPress={() => handleQuickAction('feeding')}
            style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="add-circle" size={24 * uiScale} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text, fontSize: 15 * uiScale }]}>Biberón</Text>
          </Pressable>

          <Pressable 
            onPress={() => handleQuickAction('solids')}
            style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.surface, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="restaurant" size={24 * uiScale} color="#FF9500" />
            <Text style={[styles.actionText, { color: colors.text, fontSize: 15 * uiScale }]}>Sólidos</Text>
          </Pressable>
        </View>
      </View>

      {/* Tarjeta de Progreso de Objetivos */}
      <Card style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <Text style={[styles.goalTitle, { color: colors.text, fontSize: 16 * uiScale }]}>Progreso de Tomas</Text>
          <Text style={{ color: colors.primary, fontWeight: '900' }}>
            {todayStats.bottleCount} / {profile?.goalFeedingsPerDay || 8}
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.backgroundAlt }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: colors.primary, 
                width: `${Math.min((todayStats.bottleCount / (Number(profile?.goalFeedingsPerDay) || 8)) * 100, 100)}%` 
              }
            ]} 
          />
        </View>
      </Card>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 24, alignSelf: 'center', width: '100%' },
  header: { marginBottom: 4 },
  summaryRow: { flexDirection: 'row' },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontWeight: '900' },
  summaryLabel: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontWeight: '800' },
  actionGrid: { flexDirection: 'row' },
  actionButton: { 
    flex: 1, padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  actionText: { fontWeight: '700' },
  goalCard: { padding: 16 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  goalTitle: { fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  latestCard: { padding: 12 },
  latestHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  latestTitle: { fontWeight: '700' },
  latestValue: { fontWeight: '800' },
});