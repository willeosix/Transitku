import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600',
          color: colors.textPrimary,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Koridor',
          headerTitle: 'TransitKu · Koridor',
          tabBarIcon: ({ color }) => (
            <Feather
              name="git-branch"
              size={18}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stops"
        options={{
          title: 'Halte & Wisata',
          headerTitle: 'Halte & Wisata',
          tabBarIcon: ({ color }) => (
            <Feather
              name="map-pin"
              size={18}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Armada & Lapor',
          headerTitle: 'Armada & Lapor',
          tabBarIcon: ({ color }) => (
            <Feather
              name="navigation"
              size={18}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Akun',
          headerTitle: 'Akun Komuter',
          tabBarIcon: ({ color }) => (
            <Feather
              name="user"
              size={18}
              color={typeof color === 'string' ? color : colors.textMuted}
            />
          ),
        }}
      />
    </Tabs>
  );
}
