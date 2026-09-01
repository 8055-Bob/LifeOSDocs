import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { moodOptions } from './mood-options.js';
import { primaryTabs } from './primary-navigation.js';

const styles = {
  card: { borderRadius: 22, borderWidth: 1, borderColor: '#DCD1F3', backgroundColor: '#FFFFFF' },
  header: { gap: 4 },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: '#6652A4', fontSize: 16, fontWeight: '700' },
  title: { color: '#30294B', fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  moodChoice: { flex: 1, alignItems: 'center', gap: 6, minHeight: 60, paddingVertical: 6, borderRadius: 12 },
  moodSelected: { backgroundColor: '#EEE9FF' },
  moodEmoji: { fontSize: 22, lineHeight: 28 },
  moodLabel: { color: '#716A82', fontSize: 10, textAlign: 'center', fontWeight: '700' },
  moodLabelSelected: { color: '#6652A4' },
  bottomNavigation: { position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 70, marginHorizontal: 12, marginBottom: 14, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1, borderColor: '#E1DBEC', backgroundColor: '#FFFFFF' },
  activeTabIndicator: { position: 'absolute', bottom: 6, height: 3, borderRadius: 999, backgroundColor: '#7562B8' },
  bottomItem: { alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 56 },
  bottomLabel: { color: '#716A82', fontSize: 12, fontWeight: '700' },
  bottomLabelActive: { color: '#6652A4' },
};

export function AppCard({ children, style, ...props }) {
  return React.createElement(View, { ...props, style: [styles.card, style] }, children);
}

export function ScreenHeader({ title, onBack, backLabel = '‹ Назад' }) {
  return React.createElement(View, { style: styles.header },
    React.createElement(Pressable, { onPress: onBack, style: styles.back }, React.createElement(Text, { style: styles.backText }, backLabel)),
    React.createElement(Text, { style: styles.title }, title),
  );
}

export function MoodPicker({ mood, onChange }) {
  return React.createElement(View, { style: styles.moodRow }, moodOptions.map((option) => React.createElement(
    Pressable,
    { key: option.value, onPress: () => onChange(option.value), style: [styles.moodChoice, mood === option.value && styles.moodSelected] },
    React.createElement(Text, { style: styles.moodEmoji }, option.emoji),
    React.createElement(Text, { style: [styles.moodLabel, mood === option.value && styles.moodLabelSelected] }, option.label),
  )));
}

export function BottomNavigation({ activeTab, onTabChange }) {
  const { width } = useWindowDimensions();
  const itemWidth = (width - 24) / primaryTabs.length;
  const activeIndex = Math.max(0, primaryTabs.findIndex((tab) => tab.id === activeTab));
  const indicatorX = useRef(new Animated.Value(activeIndex * itemWidth)).current;
  useEffect(() => {
    Animated.spring(indicatorX, { toValue: activeIndex * itemWidth, useNativeDriver: true, stiffness: 260, damping: 24, mass: 0.65 }).start();
  }, [activeIndex, itemWidth, indicatorX]);
  return React.createElement(View, { style: styles.bottomNavigation },
    React.createElement(Animated.View, { pointerEvents: 'none', style: [styles.activeTabIndicator, { width: itemWidth, transform: [{ translateX: indicatorX }] }] }),
    primaryTabs.map((tab) => React.createElement(Pressable, { key: tab.id, onPress: () => onTabChange(tab.id), style: styles.bottomItem }, React.createElement(Text, { style: [styles.bottomLabel, activeTab === tab.id && styles.bottomLabelActive] }, tab.label))),
  );
}
