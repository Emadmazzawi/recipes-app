import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
  LayoutAnimation,
  UIManager,
  Modal,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { savePersonalRecipe, getPersonalRecipes } from '../../lib/storage';
import { Recipe, Ingredient } from '../../types';
import { CATEGORIES } from '../../constants/recipes';
import { scanIngredientsFromImage, importRecipeFromUrl, fetchUnsplashImage } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../contexts/LanguageContext';
import { getCategoryLabel } from '../../lib/i18n';
import { useTheme, useStyles } from '../../contexts/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');
const UNITS = ['g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'piece', 'pinch', 'clove', 'slice'];

function generateId() {
  return 'r_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export default function NewRecipeScreen() {
  const { colors: COLORS, isDark } = useTheme();
  const styles = useStyles(getStyles);
  const router = useRouter();
  const { editId, importUrl } = useLocalSearchParams<{ editId?: string; importUrl?: string }>();
  const isEditing = !!editId;
  const { t, isRTL } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('4');
  const [prepTime, setPrepTime] = useState('15');
  const [cookTime, setCookTime] = useState('30');
  const [category, setCategory] = useState('Other');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: generateId(), name: '', amount: 0, unit: 'g' },
  ]);
  const [steps, setSteps] = useState<string[]>(['']);
  const [originalId, setOriginalId] = useState<string | undefined>(undefined);
  const [originalCreatedAt, setOriginalCreatedAt] = useState<string | undefined>(undefined);
  const [unsplashImageUrl, setUnsplashImageUrl] = useState<string | undefined>(undefined);

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [tempUrl, setTempUrl] = useState('');

  const formAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    if (isEditing) {
      loadExistingRecipe();
    } else if (importUrl) {
      setTempUrl(importUrl);
      setTimeout(() => handleImportFromParam(importUrl), 200);
    }
    Animated.stagger(100, formAnims.map(anim =>
      Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true })
    )).start();
  }, []);

  const populateFromData = (data: any) => {
    setTitle(data.title || '');
    setDescription(data.description || '');
    setServings(data.servings?.toString() || '4');
    setPrepTime(data.prepTime?.toString() || '0');
    setCookTime(data.cookTime?.toString() || '0');
    setCategory(data.category || 'Other');
    
    if (data.imageUri && !data.unsplashImageUrl) {
        setImageUri(data.imageUri);
    }
    if (data.unsplashImageUrl) {
        setUnsplashImageUrl(data.unsplashImageUrl);
    }

    if (data.ingredients && Array.isArray(data.ingredients)) {
      setIngredients(data.ingredients.map((ing: any) => ({
        id: generateId(),
        name: ing.name || t.create.unknownIngredient,
        amount: ing.amount || 0,
        unit: (ing.unit || 'piece') as any,
      })));
    }
    if (data.steps && Array.isArray(data.steps)) {
      setSteps(data.steps.filter((s: any) => typeof s === 'string' && s.trim()));
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Alert.alert(t.create.importSuccess, t.create.importSuccessMsg);
  };

  const handleSharedIdOrUrl = async (input: string) => {
    // Check if input is a UUID or contains a UUID (from our share link)
    const uuidMatch = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    
    if (uuidMatch) {
      const sharedId = uuidMatch[0];
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', sharedId)
        .single();
        
      if (!error && data) {
        // Map DB structure to our internal structure
        let parsedIngredients = [];
        let parsedSteps = [];
        try {
          parsedIngredients = typeof data.ingredients === 'string' ? JSON.parse(data.ingredients) : data.ingredients;
        } catch (e) {}
        try {
          parsedSteps = typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps;
        } catch (e) {}

        return {
          title: data.title,
          description: data.description,
          servings: data.servings,
          prepTime: data.prep_time,
          cookTime: data.cook_time,
          category: data.category,
          imageUri: data.image_uri,
          unsplashImageUrl: data.unsplash_image_url,
          ingredients: parsedIngredients,
          steps: parsedSteps,
        };
      }
    }
    
    // Fallback to Gemini web scraping
    return await importRecipeFromUrl(input);
  };

  const handleImportFromParam = async (url: string) => {
    setImporting(true);
    try {
      const data = await handleSharedIdOrUrl(url);
      if (data) populateFromData(data);
    } catch (err: any) {
      console.error("Param import failed", err);
      Alert.alert(t.create.importFailed, err.message || t.create.importFailedMsg);
    } finally {
      setImporting(false);
    }
  };

  const loadExistingRecipe = async () => {
    try {
      const recipes = await getPersonalRecipes();
      const recipe = recipes.find(r => r.id === editId);
      if (!recipe) return;

      setOriginalId(recipe.id);
      setOriginalCreatedAt(recipe.createdAt);
      setTitle(recipe.title);
      setDescription(recipe.description || '');
      setServings(recipe.servings.toString());
      setPrepTime(recipe.prepTime.toString());
      setCookTime(recipe.cookTime.toString());
      setCategory(recipe.category);
      setImageUri(recipe.imageUri);
      setUnsplashImageUrl(recipe.unsplashImageUrl);
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : [{ id: generateId(), name: '', amount: 0, unit: 'g' }]);
      setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
    } catch (err) {
      console.error('Error loading recipe for edit:', err);
    } finally {
      setLoadingEdit(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.create.permissionNeeded, t.create.permissionPhotoLibMsg);
      return;
    }
    Alert.alert(t.create.addPhotoTitle, t.create.addPhotoMsg, [
      {
        text: t.create.camera,
        onPress: async () => {
          const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
          if (camStatus !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0].uri) {
            setImageUri(result.assets[0].uri);
          }
        },
      },
      {
        text: t.create.gallery,
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0].uri) {
            setImageUri(result.assets[0].uri);
          }
        },
      },
      { text: t.create.cancel, style: 'cancel' },
    ]);
  };

  const addIngredient = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIngredients(prev => [...prev, { id: generateId(), name: '', amount: 0, unit: 'g' }]);
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev =>
      prev.map((ing, i) =>
        i === index ? { ...ing, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : ing
      )
    );
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const addStep = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSteps(prev => [...prev, '']);
  };

  const updateStep = (index: number, value: string) => {
    setSteps(prev => prev.map((s, i) => (i === index ? value : s)));
  };

  const removeStep = (index: number) => {
    if (steps.length === 1) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleScanImage = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' && libraryStatus !== 'granted') {
      Alert.alert(t.create.permissionScan, t.create.permissionScanMsg);
      return;
    }

    Alert.alert(t.create.scanTitle, t.create.scanMsg, [
      {
        text: t.create.camera,
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, base64: true, quality: 0.8 });
          if (!result.canceled && result.assets[0].base64) processImage(result.assets[0].base64);
        },
      },
      {
        text: t.create.gallery,
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, base64: true, quality: 0.8 });
          if (!result.canceled && result.assets[0].base64) processImage(result.assets[0].base64);
        },
      },
      { text: t.create.cancel, style: 'cancel' },
    ]);
  };

  const processImage = async (base64: string) => {
    setScanning(true);
    try {
      const parsed = await scanIngredientsFromImage(base64);
      if (parsed && parsed.length > 0) {
        const newIngredients = parsed.map(ing => ({
          id: generateId(),
          name: ing.name || t.create.unknownIngredient,
          amount: ing.amount || 0,
          unit: (ing.unit || 'piece') as any,
        }));
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIngredients(prev => {
          if (prev.length === 1 && prev[0].name.trim() === '' && prev[0].amount === 0) return newIngredients;
          return [...prev, ...newIngredients];
        });
        Alert.alert(t.create.scanSuccess, t.create.scanSuccessMsg.replace('{count}', String(newIngredients.length)));
      } else {
        Alert.alert(t.create.noIngredientsFound, t.create.noIngredientsFoundMsg);
      }
    } catch (err: any) {
      Alert.alert(t.create.scanFailed, err.message || t.create.scanFailedMsg);
    } finally {
      setScanning(false);
    }
  };

  const handleImportUrl = async () => {
    if (!tempUrl.trim()) {
      Alert.alert(t.create.invalidUrl, t.create.invalidUrlMsg);
      return;
    }
    setShowUrlModal(false);
    setImporting(true);
    try {
      const data = await handleSharedIdOrUrl(tempUrl);
      if (data) populateFromData(data);
    } catch (err: any) {
      console.error("Manual import failed", err);
      Alert.alert(t.create.importFailed, err.message || t.create.importFailedMsg);
    } finally {
      setImporting(false);
      setTempUrl('');
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/my-recipes');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t.create.missingTitle, t.create.missingTitleMsg);
      return;
    }
    const validIngredients = ingredients.filter(i => i.name.trim() && i.amount > 0);
    if (validIngredients.length === 0) {
      Alert.alert(t.create.noIngredients, t.create.noIngredientsMsg);
      return;
    }
    setSaving(true);
    
    let finalUnsplashUrl = unsplashImageUrl;
    if (!imageUri && !finalUnsplashUrl) {
      const fetchedUrl = await fetchUnsplashImage(title.trim());
      if (fetchedUrl) {
        finalUnsplashUrl = fetchedUrl;
      }
    }

    const recipe: Recipe = {
      id: originalId || generateId(),
      title: title.trim(),
      description: description.trim(),
      servings: parseInt(servings) || 4,
      prepTime: parseInt(prepTime) || 0,
      cookTime: parseInt(cookTime) || 0,
      category,
      ingredients: validIngredients,
      steps: steps.filter(s => s.trim()),
      isBuiltIn: false,
      createdAt: originalCreatedAt || new Date().toISOString(),
      imageUri,
      unsplashImageUrl: finalUnsplashUrl,
    };
    try {
      await savePersonalRecipe(recipe);
      setSaving(false);
      goBack();
    } catch (err: any) {
      console.error('Error saving recipe:', err);
      Alert.alert(t.common?.error || 'Error', err.message || 'Failed to save recipe');
      setSaving(false);
    }
  };

  const getAnimatedStyle = (idx: number) => ({
    opacity: formAnims[idx],
    transform: [{ translateY: formAnims[idx].interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  });

  if (loadingEdit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Ionicons name="close" size={26} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? t.create.editRecipe : t.create.createRecipe}</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={saving}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.saveBtnGradient}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t.create.save}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scroll} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContent}>

            {/* Photo section */}
              <Animated.View style={[styles.section, getAnimatedStyle(0)]}>
                <TouchableOpacity onPress={pickPhoto} style={styles.photoBtn} activeOpacity={0.8}>
                  {imageUri ? (
                    <View style={styles.photoPreviewWrap}>
                      <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="camera" size={24} color="#fff" />
                        <Text style={styles.photoOverlayText}>{t.create.changePhoto}</Text>
                      </View>
                    </View>
                  ) : (
                    <LinearGradient colors={[COLORS.surfaceDeep, COLORS.bg]} style={styles.photoPlaceholder}>
                      <Ionicons name="camera-outline" size={36} color={COLORS.textFaint} />
                      <Text style={styles.photoPlaceholderText}>{t.create.addPhoto}</Text>
                      <Text style={styles.photoPlaceholderSub}>{t.create.addPhotoSub}</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Basic info */}
              <Animated.View style={[styles.section, getAnimatedStyle(0)]}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                    <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.create.generalInfo}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => setShowUrlModal(true)}
                    disabled={importing || scanning}
                  >
                    <LinearGradient
                      colors={[COLORS.primaryTint, 'transparent']}
                      style={styles.scanBtnGradient}
                    >
                      {importing ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="link" size={14} color={COLORS.primary} />
                          <Text style={styles.scanBtnText}>{t.create.importUrl}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.recipeTitle}</Text>
                  <TextInput
                    style={[styles.input, isRTL && styles.textRTL]}
                    placeholder={t.create.recipeTitlePlaceholder}
                    placeholderTextColor={COLORS.textFaint}
                    value={title}
                    onChangeText={setTitle}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.shortDescription}</Text>
                  <TextInput
                    style={[styles.input, styles.multiline, isRTL && styles.textRTL]}
                    placeholder={t.create.shortDescriptionPlaceholder}
                    placeholderTextColor={COLORS.textFaint}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    textAlign={isRTL ? 'right' : 'left'}
                  />
                </View>

                <View style={[styles.row, isRTL && styles.rowRTL]}>
                  <View style={styles.flex1}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.servings}</Text>
                    <View style={[styles.inputWithIcon, isRTL && styles.rowRTL]}>
                      <Ionicons name="people-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputNested, isRTL && styles.textRTL]}
                        keyboardType="numeric"
                        value={servings}
                        onChangeText={setServings}
                        placeholder="4"
                        placeholderTextColor={COLORS.textFaint}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                  </View>
                  <View style={[styles.flex1, isRTL ? styles.fieldGapRTL : styles.fieldGap]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.prepMin}</Text>
                    <View style={[styles.inputWithIcon, isRTL && styles.rowRTL]}>
                      <Ionicons name="time-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputNested, isRTL && styles.textRTL]}
                        keyboardType="numeric"
                        value={prepTime}
                        onChangeText={setPrepTime}
                        placeholder="15"
                        placeholderTextColor={COLORS.textFaint}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                  </View>
                  <View style={[styles.flex1, isRTL ? styles.fieldGapRTL : styles.fieldGap]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.cookMin}</Text>
                    <View style={[styles.inputWithIcon, isRTL && styles.rowRTL]}>
                      <Ionicons name="flame-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputNested, isRTL && styles.textRTL]}
                        keyboardType="numeric"
                        value={cookTime}
                        onChangeText={setCookTime}
                        placeholder="30"
                        placeholderTextColor={COLORS.textFaint}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                    </View>
                  </View>
                </View>

                <Text style={[styles.label, isRTL && styles.textRTL]}>{t.create.category}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.catChip, category === cat && styles.catChipActive]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                        {getCategoryLabel(t, cat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>

              {/* Ingredients */}
              <Animated.View style={[styles.section, getAnimatedStyle(1)]}>
                <View style={[styles.sectionHeaderRow, isRTL && styles.rowRTL]}>
                  <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                    <Ionicons name="list" size={20} color={COLORS.primary} />
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.create.ingredients}</Text>
                  </View>
                  <TouchableOpacity style={styles.scanBtn} onPress={handleScanImage} disabled={scanning || importing}>
                    <LinearGradient
                      colors={[COLORS.primaryTint, 'transparent']}
                      style={styles.scanBtnGradient}
                    >
                      {scanning ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={14} color={COLORS.primary} />
                          <Text style={styles.scanBtnText}>{t.create.aiScan}</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {ingredients.map((ing, index) => (
                  <View key={ing.id} style={styles.ingredientCard}>
                    <TextInput
                      style={[styles.input, styles.ingName, isRTL && styles.textRTL]}
                      placeholder={t.create.ingredientName}
                      placeholderTextColor={COLORS.textFaint}
                      value={ing.name}
                      onChangeText={v => updateIngredient(index, 'name', v)}
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                    <View style={[styles.ingMetaRow, isRTL && styles.rowRTL]}>
                      <TextInput
                        style={[styles.input, styles.ingAmount, isRTL && styles.textRTL]}
                        placeholder={t.create.amount}
                        placeholderTextColor={COLORS.textFaint}
                        keyboardType="numeric"
                        value={ing.amount > 0 ? ing.amount.toString() : ''}
                        onChangeText={v => updateIngredient(index, 'amount', v)}
                        textAlign={isRTL ? 'right' : 'left'}
                      />
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitScroll}>
                        {UNITS.map(u => (
                          <TouchableOpacity
                            key={u}
                            style={[styles.unitChip, ing.unit === u && styles.unitChipActive]}
                            onPress={() => updateIngredient(index, 'unit', u)}
                          >
                            <Text style={[styles.unitChipText, ing.unit === u && styles.unitChipTextActive]}>
                              {u}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <TouchableOpacity onPress={() => removeIngredient(index)} style={styles.removeBtn}>
                        <Ionicons name="trash" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TouchableOpacity style={[styles.addBtn, isRTL && styles.rowRTL]} onPress={addIngredient}>
                  <View style={styles.addIconCircle}>
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.addBtnText, isRTL && styles.textRTL]}>{t.create.addIngredient}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Steps */}
              <Animated.View style={[styles.section, getAnimatedStyle(2)]}>
                <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
                  <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                  <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t.create.preparationSteps}</Text>
                </View>

                {steps.map((step, index) => (
                  <View key={index} style={styles.stepCard}>
                    <View style={[styles.stepHeader, isRTL && styles.rowRTL]}>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>{index + 1}</Text>
                      </View>
                      <TouchableOpacity onPress={() => removeStep(index)} style={styles.removeBtn}>
                        <Ionicons name="trash" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={[styles.input, styles.stepInput, isRTL && styles.textRTL]}
                      placeholder={t.create.stepPlaceholder}
                      placeholderTextColor={COLORS.textFaint}
                      value={step}
                      onChangeText={v => updateStep(index, v)}
                      multiline
                      textAlign={isRTL ? 'right' : 'left'}
                    />
                  </View>
                ))}

                <TouchableOpacity style={[styles.addBtn, isRTL && styles.rowRTL]} onPress={addStep}>
                  <View style={styles.addIconCircle}>
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </View>
                  <Text style={[styles.addBtnText, isRTL && styles.textRTL]}>{t.create.addStep}</Text>
                </TouchableOpacity>
              </Animated.View>

            </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* URL Import Modal */}
      <Modal visible={showUrlModal} transparent animationType="fade" onRequestClose={() => setShowUrlModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowUrlModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t.create.importFromUrl}</Text>
                <Text style={[styles.modalSubtitle, isRTL && styles.textRTL]}>{t.create.importFromUrlSub}</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalInputMulti, isRTL && styles.textRTL]}
                  placeholder={t.create.urlPlaceholder}
                  placeholderTextColor={COLORS.textFaint}
                  value={tempUrl}
                  onChangeText={setTempUrl}
                  autoFocus
                  autoCapitalize="none"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <View style={[styles.modalButtons, isRTL && styles.rowRTL]}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={() => { setShowUrlModal(false); setTempUrl(''); }}
                  >
                    <Text style={styles.modalBtnTextCancel}>{t.common.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnConfirm]} onPress={handleImportUrl}>
                    <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.modalBtnGradient}>
                      <Text style={styles.modalBtnTextConfirm}>{t.create.import}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  saveBtn: { borderRadius: 12, overflow: 'hidden' },
  saveBtnGradient: { paddingHorizontal: 20, paddingVertical: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  scroll: { flex: 1 },
  formContent: { padding: 20 },

  photoBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 4 },
  photoPreviewWrap: { position: 'relative', height: 180 },
  photoPreview: { width: '100%', height: 180 },
  photoOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoOverlayText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  photoPlaceholder: {
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  photoPlaceholderText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  photoPlaceholderSub: { color: COLORS.textFaint, fontSize: 12 },

  textRTL: { textAlign: 'right', writingDirection: 'rtl' },
  rowRTL: { flexDirection: 'row-reverse' },
  fieldGap: { marginLeft: 12 },
  fieldGapRTL: { marginRight: 12 },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '800' },

  scanBtn: { borderRadius: 10, overflow: 'hidden' },
  scanBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scanBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  inputWrapper: { marginBottom: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surfaceDeep,
    borderRadius: 12,
    color: COLORS.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  multiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginBottom: 16 },
  flex1: { flex: 1 },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceDeep, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10 },
  inputIcon: { marginRight: 6 },
  inputNested: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 4 },

  categoryScroll: { marginTop: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceDeep,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700' },
  catChipTextActive: { color: '#fff' },

  ingredientCard: { marginBottom: 12 },
  ingName: { marginBottom: 8 },
  ingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ingAmount: { width: 70 },
  unitScroll: { flex: 1 },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceDeep,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  unitChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },
  unitChipTextActive: { color: '#fff' },
  removeBtn: { padding: 8 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginTop: 4 },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryTintDark,
  },
  addBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },

  stepCard: { backgroundColor: COLORS.surfaceDeep, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumText: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  stepInput: { backgroundColor: 'transparent', borderWidth: 0, minHeight: 60, textAlignVertical: 'top', paddingHorizontal: 0, paddingVertical: 0 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  modalSubtitle: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 20, lineHeight: 20 },
  modalInput: { backgroundColor: COLORS.surfaceDeep, borderRadius: 12, color: COLORS.textPrimary, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  modalInputMulti: { minHeight: 120 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalBtnCancel: { backgroundColor: COLORS.surfaceDeep, justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },
  modalBtnConfirm: {},
  modalBtnGradient: { paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  modalBtnTextCancel: { color: COLORS.textMuted, fontSize: 15, fontWeight: '700' },
  modalBtnTextConfirm: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
