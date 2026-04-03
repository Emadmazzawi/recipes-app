import React from 'react';
import { ScrollView, Text, StyleSheet, View, Platform, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.date}>Effective Date: {effectiveDate}</Text>

        <Text style={styles.paragraph}>
          Welcome to Smart Recipes. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (the "Service").
        </Text>

        <Text style={styles.heading}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>
          When you use Smart Recipes, we collect the following information:
        </Text>
        <View style={styles.bulletList}>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Personal Data:</Text> We collect your email address and a password when you voluntarily create an account to use our Service.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>User Content:</Text> We collect recipes, images, and text that you choose to save or upload to your account.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.bulletText}>
              <Text style={styles.bold}>Usage Data:</Text> We may automatically collect basic, anonymized analytics about how you interact with the App to help us improve functionality and user experience.
            </Text>
          </View>
        </View>

        <Text style={styles.heading}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect primarily to:
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletText}>• Create, manage, and secure your account.</Text>
          <Text style={styles.bulletText}>• Provide, operate, and maintain the features of the Service.</Text>
          <Text style={styles.bulletText}>• Provide user support and respond to your requests.</Text>
        </View>

        <Text style={styles.heading}>3. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We use <Text style={styles.bold}>Supabase</Text> as our backend service provider for authentication and database management. The email address and data you provide is securely transmitted to and stored by Supabase. We do not sell your personal information to third parties.
        </Text>
        <Text style={styles.paragraph}>
          For more information on how Supabase handles your data, please review their Privacy Policy at <Text style={styles.link} onPress={() => Linking.openURL('https://supabase.com/privacy')}>https://supabase.com/privacy</Text>.
        </Text>

        <Text style={styles.heading}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement commercially reasonable security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure.
        </Text>

        <Text style={styles.heading}>5. Your Data Rights & Deletion</Text>
        <Text style={styles.paragraph}>
          You have the right to access, update, or delete the personal information we hold about you. You can request the permanent deletion of your account and all associated data at any time directly within the App's Settings screen.
        </Text>

        <Text style={styles.heading}>6. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our Service does not knowingly collect personal information from children under the age of 13. If we become aware that we have collected personal data from a child under 13, we will take steps to delete that information promptly.
        </Text>

        <Text style={styles.heading}>7. Changes to This Privacy Policy</Text>
        <Text style={styles.paragraph}>
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Effective Date" at the top.
        </Text>

        <Text style={styles.heading}>8. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at support@smartrecipes.app (or your preferred contact method).
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
  bold: { fontWeight: 'bold', color: '#1f2937' },
  link: { color: '#3b82f6', textDecorationLine: 'underline' },
  bulletList: { paddingLeft: 8, marginBottom: 16 },
  bulletItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletPoint: { fontSize: 15, color: '#4b5563', marginRight: 8, lineHeight: 24 },
  bulletText: { fontSize: 15, color: '#4b5563', lineHeight: 24, flex: 1, marginBottom: 4 },
  footer: { height: 40 }
});