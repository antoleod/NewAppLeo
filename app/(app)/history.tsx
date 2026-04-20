import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, FlatList, Pressable } from 'react-native';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { entries } = useAppData(); // Asumiendo que AppData provee los logs
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
  
  const [filter, setFilter] = useState<'all' | 'feeding' | 'sleep' | 'solids'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = entries.filter(e => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'feeding' && e.type === 'feeding') ||
      (filter === 'solids' && e.type === 'solids') ||
      (filter === 'sleep' && e.type === 'sleep');

    const searchableText = `${e.type} ${e.notes || ''} ${e.amount || ''} ${e.location || ''} ${e.foodType || ''}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const renderEntry = ({ item }: { item: any }) => {
    const isFeeding = item.type === 'feeding';
    const isSleep = item.type === 'sleep';
    const isSolids = item.type === 'solids';

    return (
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={[styles.iconBox, { backgroundColor: isSolids ? '#FF950020' : colors.backgroundAlt }]}>
            <Ionicons 
              name={isFeeding ? 'water' : isSleep ? 'moon' : 'restaurant'} 
              size={18 * uiScale} 
              color={isSolids ? '#FF9500' : colors.primary} 
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.entryTitle, { color: colors.text, fontSize: 16 * uiScale }]}>
                {isFeeding ? 'Feeding' : isSleep ? 'Sleep Session' : 'Solid Food'}
              </Text>
              {isSolids && item.foodType && (
                <View style={[styles.badge, { backgroundColor: item.foodType === 'dessert' ? '#AF52DE20' : '#34C75920' }]}>
                  <Text style={[styles.badgeText, { color: item.foodType === 'dessert' ? '#AF52DE' : '#34C759', fontSize: 10 * uiScale }]}>
                    {item.foodType.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 * uiScale }}>
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <Text style={[styles.amount, { color: colors.text, fontSize: 15 * uiScale }]}>
            {isFeeding ? `${item.amount}ml` : isSleep ? `${item.duration}m` : 'Prepared'}
          </Text>
        </View>
        {item.notes && (
          <View style={[styles.notesContainer, { borderLeftColor: isSolids ? '#FF9500' : colors.border }]}>
            <Text style={[styles.notesText, { color: colors.text, fontSize: 14 * uiScale }]}>
              {item.notes}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <Page contentStyle={[styles.container, { maxWidth: isDesktop ? 800 : '100%' }]}>
      <Heading 
        eyebrow="Logs" 
        title="Activity History" 
        subtitle="Review and manage your baby's daily routine." 
      />

      <View style={{ marginBottom: 8 * uiScale }}>
        <Input 
          placeholder="Search entries (notes, type, amount...)" 
          value={searchQuery} 
          onChangeText={setSearchQuery}
          iconName="search"
          onClear={() => setSearchQuery('')}
        />
      </View>
      
      <View style={[styles.filterRow, { gap: 8 * uiScale }]}>
        <Button 
          label="All" 
          variant={filter === 'all' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('all'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} 
        />
        <Button 
          label="Bottle" 
          variant={filter === 'feeding' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('feeding'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} 
        />
        <Button 
          label="Solids" 
          variant={filter === 'solids' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('solids'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} 
        />
        <Button 
          label="Sleep" 
          variant={filter === 'sleep' ? 'primary' : 'ghost'} 
          onPress={() => { setFilter('sleep'); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} 
        />
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={{ gap: 10 * uiScale, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
    gap: 16,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  entryCard: {
    padding: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryTitle: {
    fontWeight: '700',
  },
  amount: {
    fontWeight: '800',
  }
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notesContainer: {
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 3,
  },
  notesText: {
    opacity: 0.8,
    lineHeight: 20,
  }
});