import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  style?: ViewStyle;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ style, width, height, borderRadius }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          opacity,
          width: width as any,
          height: height as any,
          borderRadius: borderRadius || 4,
        },
        style,
      ]}
    />
  );
};

export const RecipeCardSkeleton = () => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Skeleton width={80} height={18} borderRadius={6} />
      <Skeleton width={60} height={14} borderRadius={4} />
    </View>
    <Skeleton width="90%" height={22} style={{ marginBottom: 8 }} />
    <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
    <Skeleton width="70%" height={14} style={{ marginBottom: 16 }} />
    <View style={styles.cardFooter}>
      <Skeleton width={80} height={14} />
      <Skeleton width={80} height={14} />
      <Skeleton width={20} height={20} borderRadius={10} />
    </View>
  </View>
);

export const NutritionSkeleton = () => (
  <View style={styles.nutritionSection}>
    <Skeleton width={180} height={24} style={{ marginBottom: 16 }} />
    <View style={styles.nutritionGrid}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.nutritionBox}>
          <Skeleton width={30} height={20} style={{ marginBottom: 4 }} />
          <Skeleton width={40} height={10} />
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#2d2d4e',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  nutritionBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
});
