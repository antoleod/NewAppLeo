import React, { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, FlatList } from 'react-native';
import { Button, Card, Heading, Input, Page } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { useAppData } from '@/context/AppDataContext';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { entries } = useAppData(); // Asumiendo que AppData provee los logs
  const isDesktop = width >= 1280;
  const uiScale = isDesktop ? 0.8 : 1.0;
  
  const [filter, setFilter] = useState<'all' | 'feeding' | 'sleep'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = entries.filter(e => {
    const matchesFilter = filter === 'all' || e.type === filter;
    const searchableText = `${e.type} ${e.notes || ''} ${e.amount || ''} ${e.location || ''}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const renderEntry = ({ item }: { item: any }) => (
    <Card style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={[styles.iconBox, { backgroundColor: colors.backgroundAlt }]}>
          <Ionicons 
            name={item.type === 'feeding' ? 'water' : 'moon'} 
            size={18 * uiScale} 
            color={colors.primary} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.entryTitle, { color: colors.text, fontSize: 16 * uiScale }]}>
            {item.type === 'feeding' ? 'Feeding' : 'Sleep Session'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 * uiScale }}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Text style={[styles.amount, { color: colors.text, fontSize: 15 * uiScale }]}>
          {item.amount ? `${item.amount}ml` : `${item.duration}m`}
        </Text>
      </View>
    </Card>
  );

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
          onPress={() => setFilter('all')} 
        />
        <Button 
          label="Feeding" 
          variant={filter === 'feeding' ? 'primary' : 'ghost'} 
          onPress={() => setFilter('feeding')} 
        />
        <Button 
          label="Sleep" 
          variant={filter === 'sleep' ? 'primary' : 'ghost'} 
          onPress={() => setFilter('sleep')} 
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
});