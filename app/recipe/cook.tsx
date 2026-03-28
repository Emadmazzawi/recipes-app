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
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { BUILT_IN_RECIPES } from '../../constants/recipes';
import { getPersonalRecipes } from '../../lib/storage';
import { Recipe } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { COLORS } from '../../constants/theme';

export default function CookModeScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const router = useRouter();
  const { t, language, isRTL } = useLanguage();
  
  // Keep the screen awake while cooking!
  useKeepAwake();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Timers mapped by step index
  type TimerState = { seconds: number; total: number; active: boolean };
  const [timers, setTimers] = useState<Record<number, TimerState>>({});
  
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerInput, setTimerInput] = useState('5');

  const stepAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRecipe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        let changed = false;
        const next = { ...prev };
        
        Object.keys(next).forEach(key => {
          const stepIndex = parseInt(key);
          const t = next[stepIndex];
          
          if (t.active && t.seconds > 0) {
            changed = true;
            next[stepIndex] = { ...t, seconds: t.seconds - 1 };
            
            if (next[stepIndex].seconds === 0) {
              next[stepIndex].active = false;
              Vibration.vibrate([0, 400, 200, 400, 200, 400]);
              Alert.alert(
                "Time's Up!", 
                `Timer for step ${stepIndex + 1} is done!`
              );
            }
          }
        });
        
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const getLocalizedSteps = (): string[] => {
    if (!recipe) return [];
    if (language === 'he' && recipe.instructions_he && recipe.instructions_he.length > 0) {
      return recipe.instructions_he;
    }
    if (language === 'ar' && recipe.instructions_ar && recipe.instructions_ar.length > 0) {
      return recipe.instructions_ar;
    }
    return recipe.steps;
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
    const steps = getLocalizedSteps();
    if (!recipe || currentStep >= steps.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentStep(prev => prev + 1);
    animateTransition();
  };

  const goPrev = () => {
    if (currentStep <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(prev => prev - 1);
    animateTransition();
  };

  const startTimer = () => {
    const mins = parseInt(timerInput) || 1;
    const secs = mins * 60;
    startSmartTimer(secs);
    setShowTimerModal(false);
  };

  const startSmartTimer = (secs: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimers(prev => ({
      ...prev,
      [currentStep]: { seconds: secs, total: secs, active: true }
    }));
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimers(prev => {
      const t = prev[currentStep];
      if (!t) return prev;
      return { ...prev, [currentStep]: { ...t, active: !t.active } };
    });
  };

  const resetCurrentTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimers(prev => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
  };

  const renderStepTextWithTimers = (text: string) => {
    // Regex to match "X min/minute/minutes/hr/hour/hours/sec/second/seconds"
    const timeRegex = /(\d+)\s*(min|minute|minutes|hr|hour|hours|sec|second|seconds)s?\b/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = timeRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const timeString = match[0];
      const amount = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      let seconds = 0;
      if (unit.startsWith('hr') || unit.startsWith('hour')) {
        seconds = amount * 3600;
      } else if (unit.startsWith('min')) {
        seconds = amount * 60;
      } else if (unit.startsWith('sec')) {
        seconds = amount;
      }

      parts.push(
        <Text 
          key={`time-${match.index}`} 
          style={styles.tappableTime} 
          onPress={() => startSmartTimer(seconds)}
        >
          {timeString} <Ionicons name="timer" size={18} color={COLORS.primary} />
        </Text>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const t = timers[currentStep];
    if (!t || t.total === 0) return '#f5a623';
    const ratio = t.seconds / t.total;
    if (ratio > 0.5) return '#22c55e';
    if (ratio > 0.2) return '#f5a623';
    return '#ef4444';
  };

  const getLocalizedTitle = (): string => {
    if (!recipe) return '';
    if (language === 'he' && recipe.title_he) return recipe.title_he;
    if (language === 'ar' && recipe.title_ar) return recipe.title_ar;
    return recipe.title;
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t.cook.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const localizedSteps = getLocalizedSteps();

  if (!localizedSteps || localizedSteps.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="document-outline" size={64} color={COLORS.textFaint} />
          <Text style={styles.noStepsTitle}>{t.cook.noStepsTitle}</Text>
          <Text style={styles.noStepsText}>{t.cook.noStepsText}</Text>
          <TouchableOpacity onPress={goBack} style={styles.backHomeBtn}>
            <Text style={styles.backHomeBtnText}>{t.cook.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalSteps = localizedSteps.length;
  const progress = (currentStep + 1) / totalSteps;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.bg}>
        <SafeAreaView style={styles.safeArea}>

          {/* Header */}
          <View style={[styles.header, isRTL && styles.headerRTL]}>
            <TouchableOpacity onPress={goBack} style={styles.exitBtn}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.recipeTitle, isRTL && styles.textRTL]} numberOfLines={1}>{getLocalizedTitle()}</Text>
            <TouchableOpacity onPress={() => setShowTimerModal(true)} style={styles.timerBtn}>
              <Ionicons name="timer-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressOuter}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={[styles.stepCounter, isRTL && styles.textRTL]}>
            {t.cook.step} {currentStep + 1} <Text style={styles.stepCounterOf}>{t.cook.of} {totalSteps}</Text>
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
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{currentStep + 1}</Text>
            </View>
            <Text style={[styles.stepText, isRTL && styles.textRTL]}>
              {renderStepTextWithTimers(localizedSteps[currentStep])}
            </Text>
          </Animated.View>

          {/* Timer display */}
          {timers[currentStep] && (timers[currentStep].active || timers[currentStep].seconds > 0) && (
            <View style={styles.timerDisplay}>
              <Text style={[styles.timerValue, { color: getTimerColor() }]}>
                {formatTime(timers[currentStep].seconds)}
              </Text>
              <View style={styles.timerControls}>
                <TouchableOpacity
                  onPress={toggleTimer}
                  style={styles.timerControlBtn}
                >
                  <Ionicons name={timers[currentStep].active ? 'pause' : 'play'} size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={resetCurrentTimer}
                  style={[styles.timerControlBtn, styles.timerResetBtn]}
                >
                  <Ionicons name="refresh" size={22} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Navigation */}
          <View style={[styles.navRow, isRTL && styles.navRowRTL]}>
            {/* Prev button — visually on left in LTR, right in RTL */}
            <TouchableOpacity
              style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
              onPress={goPrev}
              disabled={isFirst}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={isFirst ? COLORS.textFaint : COLORS.textPrimary} />
              <Text style={[styles.navBtnText, isFirst && styles.navBtnTextDisabled]}>{t.cook.prev}</Text>
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

            {/* Next/Done button — visually on right in LTR, left in RTL */}
            {isLast ? (
              <TouchableOpacity style={styles.doneBtn} onPress={goBack}>
                <LinearGradient colors={[COLORS.success, '#15803d']} style={styles.doneBtnGrad}>
                  <Ionicons name="checkmark" size={22} color="#fff" />
                  <Text style={styles.doneBtnText}>{t.cook.done}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.navBtnNext} onPress={goNext}>
                <Text style={styles.navBtnNextText}>{t.cook.next}</Text>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

        </SafeAreaView>
      </View>

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
              <Ionicons name="timer" size={32} color={COLORS.primary} />
            </View>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.cook.setTimer}</Text>
            <Text style={[styles.modalSub, isRTL && styles.textRTL]}>{t.cook.timerQuestion}</Text>
            <TextInput
              style={styles.modalInput}
              value={timerInput}
              onChangeText={setTimerInput}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
              textAlign="center"
            />
            <View style={[styles.modalBtns, isRTL && styles.modalBtnsRTL]}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowTimerModal(false)}
              >
                <Text style={styles.modalCancelText}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalStart} onPress={startTimer}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.modalStartGrad}>
                  <Text style={styles.modalStartText}>{t.cook.startTimer}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  bg: { flex: 1, backgroundColor: COLORS.bg },
  safeArea: { flex: 1, paddingHorizontal: 24, paddingBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { color: COLORS.textMuted, fontSize: 16 },
  noStepsTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  noStepsText: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 30 },
  backHomeBtn: { backgroundColor: COLORS.surfaceDeep, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  backHomeBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  headerRTL: { flexDirection: 'row-reverse' },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  recipeTitle: { flex: 1, color: COLORS.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  timerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryTintDark,
  },

  progressOuter: {
    height: 6,
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  stepCounter: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepCounterOf: { color: COLORS.textMuted, fontWeight: '600' },

  stepCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  stepBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 2,
    borderColor: COLORS.primaryTintDark,
  },
  stepBadgeText: { color: COLORS.primary, fontSize: 28, fontWeight: '900' },
  stepText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    lineHeight: 34,
    textAlign: 'center',
    fontWeight: '600',
  },
  tappableTime: {
    color: COLORS.primary,
    fontWeight: '800',
    backgroundColor: COLORS.primaryTint,
  },

  timerDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  timerValue: { fontSize: 42, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerControls: { flexDirection: 'row', gap: 12 },
  timerControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerResetBtn: { backgroundColor: COLORS.surfaceDeep },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    gap: 16,
  },
  navRowRTL: { flexDirection: 'row-reverse' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  navBtnDisabled: { opacity: 0.5 },
  navBtnText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  navBtnTextDisabled: { color: COLORS.textFaint },

  dotRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceDeep },
  dotActive: { backgroundColor: COLORS.primary, width: 24, borderRadius: 4 },

  navBtnNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navBtnNextText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  doneBtn: { borderRadius: 16, overflow: 'hidden', elevation: 4, shadowColor: COLORS.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  doneBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 8, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: 28,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  modalSub: { color: COLORS.textSecondary, fontSize: 15, marginBottom: 24, textAlign: 'center' },
  modalInput: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    color: COLORS.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '100%',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnsRTL: { flexDirection: 'row-reverse' },
  modalCancel: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  modalCancelText: { color: COLORS.textSecondary, fontSize: 16, fontWeight: '700' },
  modalStart: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  modalStartGrad: { paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  modalStartText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
