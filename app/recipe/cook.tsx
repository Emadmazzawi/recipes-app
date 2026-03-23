import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  Vibration,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BUILT_IN_RECIPES } from '../../constants/recipes';
import { getPersonalRecipes } from '../../lib/storage';
import { Recipe } from '../../types';

export default function CookModeScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerTotal, setTimerTotal] = useState(0);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerInput, setTimerInput] = useState('5');

  const stepAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRecipe();
  }, []);

  useEffect(() => {
    if (!timerActive) return;
    if (timerSeconds <= 0) {
      setTimerActive(false);
      Vibration.vibrate([0, 400, 200, 400, 200, 400]);
      Alert.alert('⏰ Time is up!', 'Ready to move to the next step?');
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const loadRecipe = async () => {
    let found: Recipe | undefined;
    if (type === 'builtin') {
      found = BUILT_IN_RECIPES.find(r => r.id === id);
    } else {
      const personal = await getPersonalRecipes();
      found = personal.find(r => r.id === id);
    }
    if (found) setRecipe(found);
  };

  const animateTransition = () => {
    stepAnim.setValue(0);
    Animated.spring(stepAnim, {
      toValue: 1,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const goNext = () => {
    if (!recipe || currentStep >= recipe.steps.length - 1) return;
    setCurrentStep(prev => prev + 1);
    setTimerActive(false);
    setTimerSeconds(0);
    setTimerTotal(0);
    animateTransition();
  };

  const goPrev = () => {
    if (currentStep <= 0) return;
    setCurrentStep(prev => prev - 1);
    setTimerActive(false);
    setTimerSeconds(0);
    setTimerTotal(0);
    animateTransition();
  };

  const startTimer = () => {
    const mins = parseInt(timerInput) || 1;
    const secs = mins * 60;
    setTimerSeconds(secs);
    setTimerTotal(secs);
    setTimerActive(true);
    setShowTimerModal(false);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timerTotal === 0) return '#f5a623';
    const ratio = timerSeconds / timerTotal;
    if (ratio > 0.5) return '#22c55e';
    if (ratio > 0.2) return '#f5a623';
    return '#ef4444';
  };

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe.steps || recipe.steps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="document-outline" size={64} color="#334155" />
          <Text style={styles.noStepsTitle}>No Steps Available</Text>
          <Text style={styles.noStepsText}>This recipe doesn't have any preparation steps.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backHomeBtn}>
            <Text style={styles.backHomeBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalSteps = recipe.steps.length;
  const progress = (currentStep + 1) / totalSteps;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#0a0a0f']} style={styles.bg}>
        <SafeAreaView style={styles.safeArea}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={styles.recipeTitle} numberOfLines={1}>{recipe.title}</Text>
            <TouchableOpacity onPress={() => setShowTimerModal(true)} style={styles.timerBtn}>
              <Ionicons name="timer-outline" size={22} color="#f5a623" />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressOuter}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} <Text style={styles.stepCounterOf}>of {totalSteps}</Text>
          </Text>

          {/* Step content */}
          <Animated.View
            style={[
              styles.stepCard,
              {
                opacity: stepAnim,
                transform: [
                  {
                    translateY: stepAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient colors={['#f5a623', '#d97706']} style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{currentStep + 1}</Text>
            </LinearGradient>
            <Text style={styles.stepText}>{recipe.steps[currentStep]}</Text>
          </Animated.View>

          {/* Timer display */}
          {(timerActive || timerSeconds > 0) && (
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerValue, { color: getTimerColor() }]}>
                {formatTime(timerSeconds)}
              </Text>
              <View style={styles.timerControls}>
                <TouchableOpacity
                  onPress={() => setTimerActive(!timerActive)}
                  style={styles.timerControlBtn}
                >
                  <Ionicons name={timerActive ? 'pause' : 'play'} size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setTimerActive(false); setTimerSeconds(0); setTimerTotal(0); }}
                  style={[styles.timerControlBtn, styles.timerResetBtn]}
                >
                  <Ionicons name="refresh" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={isFirst}
            >
              <Ionicons name="arrow-back" size={22} color={isFirst ? '#334155' : '#fff'} />
              <Text style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.dotRow}>
              {Array.from({ length: Math.min(totalSteps, 7) }).map((_, i) => {
                const dotIndex = totalSteps <= 7 ? i : Math.round((i / 6) * (totalSteps - 1));
                const isActive = totalSteps <= 7 ? i === currentStep : dotIndex === currentStep;
                return (
                  <View
                    key={i}
                    style={[styles.dot, isActive && styles.dotActive]}
                  />
                );
              })}
            </View>

            {isLast ? (
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.doneBtnGrad}>
                  <Ionicons name="checkmark" size={22} color="#fff" />
                  <Text style={styles.doneBtnText}>Done!</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.navBtnNext} onPress={goNext}>
                <Text style={styles.navBtnNextText}>Next</Text>
                <Ionicons name="arrow-forward" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

        </SafeAreaView>
      </LinearGradient>

      {/* Timer Input Modal */}
      <Modal
        visible={showTimerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="timer" size={32} color="#f5a623" />
            </View>
            <Text style={styles.modalTitle}>Set Timer</Text>
            <Text style={styles.modalSub}>How many minutes for this step?</Text>
            <TextInput
              style={styles.modalInput}
              value={timerInput}
              onChangeText={setTimerInput}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              textAlign="center"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowTimerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalStart} onPress={startTimer}>
                <LinearGradient colors={['#f5a623', '#ea580c']} style={styles.modalStartGrad}>
                  <Text style={styles.modalStartText}>Start Timer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  bg: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: '#94a3b8', fontSize: 16 },
  noStepsTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  noStepsText: { color: '#64748b', textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 30 },
  backHomeBtn: { backgroundColor: '#16213e', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  backHomeBtnText: { color: '#f5a623', fontSize: 15, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipeTitle: { flex: 1, color: '#94a3b8', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  timerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245,166,35,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressOuter: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: 4,
    backgroundColor: '#f5a623',
    borderRadius: 2,
  },
  stepCounter: {
    color: '#f5a623',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepCounterOf: { color: '#475569', fontWeight: '500' },

  stepCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  stepBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  stepBadgeText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  stepText: {
    color: '#e2e8f0',
    fontSize: 20,
    lineHeight: 32,
    textAlign: 'center',
    fontWeight: '500',
  },

  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  timerValue: { fontSize: 36, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerControls: { flexDirection: 'row', gap: 10 },
  timerControlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerResetBtn: { backgroundColor: 'rgba(255,255,255,0.04)' },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    gap: 16,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16213e',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  navBtnTextDisabled: { color: '#334155' },

  dotRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1e293b' },
  dotActive: { backgroundColor: '#f5a623', width: 18, borderRadius: 3 },

  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5a623',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
  },
  navBtnNextText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  doneBtn: { borderRadius: 16, overflow: 'hidden' },
  doneBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,166,35,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  modalSub: { color: '#64748b', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    color: '#fff',
    fontSize: 40,
    fontWeight: '800',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  modalStart: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  modalStartGrad: { paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  modalStartText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
