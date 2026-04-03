import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform } from 'react-native';
import { useLanguage } from '../../contexts/LanguageContext';
import * as Haptics from 'expo-haptics';
import { useTheme, useStyles } from '../../contexts/ThemeContext';

function FloatingTabBarBackground() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  return (
    <BlurView
      intensity={80}
      tint={isDark ? "dark" : "light"}
      style={[StyleSheet.absoluteFill, styles.blurInner]}
    />
  );
}

export default function TabsLayout() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const { t } = useLanguage();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 70,
          paddingBottom: Platform.OS === 'ios' ? 26 : 12,
          paddingTop: 10,
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 20,
          right: 20,
          borderRadius: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
        },
        tabBarBackground: () => <FloatingTabBarBackground />,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'Inter_800ExtraBold',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarLabel: t.tabs.explore,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarLabel: 'Community', // You can add translation string if needed later
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-recipes"
        options={{
          title: 'My Kitchen',
          tabBarLabel: t.tabs.library,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping List',
          tabBarLabel: t.tabs.shopping,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} color={color} size={size + 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  blurInner: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
});
