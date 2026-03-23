import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Platform, View } from 'react-native';

function FloatingTabBarBackground() {
  return (
    <BlurView
      intensity={90}
      tint="dark"
      style={[StyleSheet.absoluteFill, styles.blurInner]}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
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
        tabBarActiveTintColor: '#f5a623',
        tabBarInactiveTintColor: '#475569',
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_600SemiBold',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarLabel: 'Explore',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-recipes"
        options={{
          title: 'My Kitchen',
          tabBarLabel: 'Library',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} color={color} size={size + 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: 'Shopping List',
          tabBarLabel: 'Shopping',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} color={color} size={size + 2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  blurInner: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
});
