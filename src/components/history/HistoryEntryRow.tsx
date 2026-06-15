import React, { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { haptics } from '@/utils/haptics';
import { EntryRecord } from '@/types';
import { GetEntryIcon } from './EntryTypeIcons';

type RowTokens = {
  text: string; muted: string; soft: string; border: string; bg: string; tint: string; red: string; blue: string;
};

type HistoryEntryRowProps = {
  entry: EntryRecord;
  expanded: boolean;
  detail: string;
  typeLabel: string;
  timeLabel: string;
  tint: string;
  tokens: RowTokens;
  hasNotes: boolean;
  noNoteLabel: string;
  editLabel: string;
  deleteLabel: string;
  onToggle: (id: string) => void;
  onEdit: (entry: EntryRecord) => void;
  onDelete: (entry: EntryRecord) => void;
  scrollViewRef?: React.RefObject<any>;
};

export const HistoryEntryRow = React.memo(function HistoryEntryRow({
  entry, expanded, detail, typeLabel, timeLabel, tint, tokens,
  hasNotes, noNoteLabel, editLabel, deleteLabel,
  onToggle, onEdit, onDelete, scrollViewRef,
}: HistoryEntryRowProps) {
  const swipeRef = useRef<SwipeableMethods | null>(null);

  const renderLeftAction = () => (
    <Pressable
      onPress={() => { haptics.medium(); swipeRef.current?.close(); onDelete(entry); }}
      style={{ width: 88, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: tokens.red, borderRadius: 12, marginRight: 6 }}
    >
      <Ionicons name="trash-outline" size={18} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{deleteLabel}</Text>
    </Pressable>
  );

  const renderRightAction = () => (
    <Pressable
      onPress={() => { haptics.light(); swipeRef.current?.close(); onEdit(entry); }}
      style={{ width: 88, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: tokens.blue, borderRadius: 12, marginLeft: 6 }}
    >
      <Ionicons name="pencil-outline" size={18} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{editLabel}</Text>
    </Pressable>
  );

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      renderLeftActions={renderLeftAction}
      renderRightActions={renderRightAction}
      leftThreshold={40}
      rightThreshold={40}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      simultaneousHandlers={scrollViewRef}
    >
      <Pressable
        onPress={() => onToggle(entry.id)}
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel} · ${timeLabel}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({
          paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1,
          borderColor: expanded ? tint : tokens.border,
          backgroundColor: pressed ? tokens.border : tokens.bg,
          gap: expanded ? 10 : 0,
        })}
      >
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tint + '1F', borderWidth: 1, borderColor: tint + '38' }}>
            {GetEntryIcon(entry.type, 18, tint)}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '700', letterSpacing: 0.2 }} numberOfLines={1}>{typeLabel}</Text>
              {hasNotes ? <Ionicons name="document-text-outline" size={11} color={tokens.muted} /> : null}
            </View>
            <Text style={{ color: tokens.muted, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>{detail}</Text>
          </View>
          <Text style={{ color: tokens.text, fontSize: 13, fontWeight: '700' }}>{timeLabel}</Text>
        </View>
        {expanded && hasNotes ? (
          <View style={{ borderTopWidth: 1, borderTopColor: tokens.border, paddingTop: 10 }}>
            <Text style={{ color: tokens.muted, fontSize: 13, lineHeight: 18 }}>{entry.notes || noNoteLabel}</Text>
          </View>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
});
