import React from 'react';
import { ScrollView, Text, StyleSheet, View, Platform, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {Platform.OS !== 'web' && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>Effective Date: {effectiveDate}</Text>

        <Text style={styles.paragraph}>
          Welcome to Smart Recipes. By using our mobile application and website (the "Service"), you agree to the following terms and conditions. Please read them carefully.
        </Text>

        <Text style={styles.heading}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using Smart Recipes, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use the Service.
        </Text>

        <Text style={styles.heading}>2. Use of Service</Text>
        <Text style={styles.paragraph}>
          You must use the Service in compliance with all applicable laws. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
        </Text>

        <Text style={styles.heading}>3. User Generated Content (UGC)</Text>
        <Text style={styles.paragraph}>
          Smart Recipes allows you to share recipes and images with other users. You retain ownership of your content, but you grant us a non-exclusive, worldwide, royalty-free license to display and distribute it within the Service.
        </Text>
        <Text style={styles.important}>
          Objectionable Content Policy: You may not post any content that is illegal, offensive, harassing, discriminatory, or violates the rights of others. We reserve the right to remove any content that violates these terms at our sole discretion.
        </Text>

        <Text style={styles.heading}>4. Reporting and Blocking</Text>
        <Text style={styles.paragraph}>
          In accordance with our commitment to a safe community:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletText}>• Users can report any recipe or user that violates our content policies.</Text>
          <Text style={styles.bulletText}>• Users can block other users to hide their content immediately.</Text>
          <Text style={styles.bulletText}>• Reported content will be reviewed within 24 hours and appropriate action will be taken.</Text>
        </View>

        <Text style={styles.heading}>5. Disclaimer of Liability</Text>
        <Text style={styles.paragraph}>
          Smart Recipes provides recipe information for educational and entertainment purposes. We do not guarantee the accuracy, safety, or nutritional value of any recipe. Cooking involves inherent risks, and you assume full responsibility for your cooking results, including fire safety and dietary requirements.
        </Text>

        <Text style={styles.heading}>6. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your access to the Service at any time, without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.
        </Text>

        <Text style={styles.heading}>7. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms from time to time. Your continued use of the Service after changes are posted constitutes your acceptance of the new Terms.
        </Text>

        <Text style={styles.heading}>8. Contact</Text>
        <Text style={styles.paragraph}>
          If you have any questions about these Terms, please contact support@smartrecipes.app.
        </Text>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff'
  },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  content: { padding: 24, paddingBottom: 60, maxWidth: 800, alignSelf: 'center', width: '100%' },
  date: { fontSize: 14, color: '#6b7280', marginBottom: 24, fontStyle: 'italic' },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 32, marginBottom: 12 },
  paragraph: { fontSize: 15, color: '#4b5563', lineHeight: 24, marginBottom: 16 },
  important: { 
    fontSize: 15, 
    color: '#ef4444', 
    lineHeight: 24, 
    marginBottom: 16, 
    fontWeight: 'bold', 
    padding: 12, 
    backgroundColor: '#fef2f2', 
    borderRadius: 8 
  },
  bulletList: { paddingLeft: 8, marginBottom: 16 },
  bulletText: { fontSize: 15, color: '#4b5563', lineHeight: 24, flex: 1, marginBottom: 8 },
  footer: { height: 40 }
});
