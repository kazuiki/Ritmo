// @ts-nocheck
import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyPolicy() {
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  const toggleSection = (id: number) => {
    setExpandedSections((prev) => (prev.includes(id) ? [] : [id]));
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.termsModalOverlay}>
      {/* Background Image */}
      <Image source={require('../assets/background.png')} style={styles.backgroundImage} resizeMode="cover" />

      <View style={styles.termsModalContainer}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.termsBackButton}
          onPress={() => router.back()}
        >
          <Text style={styles.termsBackButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.termsScrollView}
          contentContainerStyle={styles.termsScrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.termsTitle}>Privacy Policy</Text>
          <Text style={styles.termsSubtitle}>Last Updated: November 2025</Text>

          <Text style={styles.termsText}>
            Ritmo we designed to support children, parents, and caregivers in managing daily routines through visual schedules and guided activities. We value your trust and are committed to protecting your privacy. This Privacy Policy explains what information we collect, how it is used, and the choices you have regarding your data.
          </Text>

          {/* Section 1 - Information We Collect */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(1)}
          >
            <Text style={styles.privacyAccordionTitle}>1. Information We Collect</Text>
            <Ionicons 
              name={expandedSections.includes(1) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(1) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.privacySubsectionTitle}>1.1 Personal Information</Text>
              <Text style={styles.termsText}>
                Ritmo does not require users to create an account. However, the app may collect basic information provided by parents or caregivers, including:
              </Text>
              <Text style={styles.termsBullet}>• Child's nickname or first name</Text>
              <Text style={styles.termsBullet}>• Routine preferences (e.g., scheduled tasks)</Text>
              <Text style={styles.termsText}>
                No sensitive personal data (e.g., exact location, medical history, contact details) is required.
              </Text>

              <Text style={styles.privacySubsectionTitle}>1.2 Usage Data</Text>
              <Text style={styles.termsText}>To improve the app, we may collect anonymous usage information such as:</Text>
              <Text style={styles.termsBullet}>• Features used</Text>
              <Text style={styles.termsBullet}>• Task completion frequency</Text>
              <Text style={styles.termsBullet}>• App performance and error reports</Text>
              <Text style={styles.termsText}>This data does not identify the child or user.</Text>

              <Text style={styles.privacySubsectionTitle}>1.3 Media Files (Optional)</Text>
              <Text style={styles.termsText}>
                If parents upload custom images or videos for routines, these remain stored locally on the device unless cloud backup is enabled by the user.
              </Text>

              <Text style={styles.privacySubsectionTitle}>1.4 Device Information</Text>
              <Text style={styles.termsText}>The app may collect basic device data such as:</Text>
              <Text style={styles.termsBullet}>• Device model</Text>
              <Text style={styles.termsBullet}>• Operating system version</Text>
              <Text style={styles.termsBullet}>• App version</Text>
              <Text style={styles.termsText}>This helps us ensure compatibility and fix technical issues.</Text>
            </View>
          )}

          {/* Section 2 - How We Use Your Information */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(2)}
          >
            <Text style={styles.privacyAccordionTitle}>2. How We Use Your Information</Text>
            <Ionicons 
              name={expandedSections.includes(2) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(2) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>We use the collected information to:</Text>
              <Text style={styles.termsBullet}>• Customize tasks and routines for the child</Text>
              <Text style={styles.termsBullet}>• Improve the app's functionality and performance</Text>
              <Text style={styles.termsBullet}>• Provide a personalized experience for learning and independence</Text>
              <Text style={styles.termsBullet}>• Ensure stability and security of the app</Text>
              <Text style={styles.termsText}>We do not sell, rent, or share your information with advertisers.</Text>
            </View>
          )}

          {/* Section 3 - Data Storage and Security */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(3)}
          >
            <Text style={styles.privacyAccordionTitle}>3. Data Storage and Security</Text>
            <Ionicons 
              name={expandedSections.includes(3) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(3) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsBullet}>• All routine-related data is stored locally on the user's device unless cloud services are enabled.</Text>
              <Text style={styles.termsBullet}>• We use standard security practices to protect information from unauthorized access.</Text>
              <Text style={styles.termsBullet}>• Parents maintain full control over the child's information.</Text>
            </View>
          )}

          {/* Section 4 - Data Sharing */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(4)}
          >
            <Text style={styles.privacyAccordionTitle}>4. Data Sharing</Text>
            <Ionicons 
              name={expandedSections.includes(4) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(4) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>We do not share your personal information with third parties except:</Text>
              <Text style={styles.termsBullet}>• When required by law</Text>
              <Text style={styles.termsBullet}>• When necessary to maintain the app (e.g., error or crash reporting tools)</Text>
              <Text style={styles.termsText}>These tools collect anonymous diagnostic data only.</Text>
            </View>
          )}

          {/* Section 5 - Children's Privacy */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(5)}
          >
            <Text style={styles.privacyAccordionTitle}>5. Children's Privacy</Text>
            <Ionicons 
              name={expandedSections.includes(5) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(5) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>
                Ritmo is designed specifically for children, but all account setup and data entry are intended to be done by a parent or guardian.
              </Text>
              <Text style={styles.termsText}>We comply with child protection best practices:</Text>
              <Text style={styles.termsBullet}>• No advertising</Text>
              <Text style={styles.termsBullet}>• No social media links</Text>
              <Text style={styles.termsBullet}>• No collection of sensitive identifying information</Text>
              <Text style={styles.termsText}>Parents may delete the child's data at any time.</Text>
            </View>
          )}

          {/* Section 6 - Your Rights and Choices */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(6)}
          >
            <Text style={styles.privacyAccordionTitle}>6. Your Rights and Choices</Text>
            <Ionicons 
              name={expandedSections.includes(6) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(6) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>Parents and guardians may:</Text>
              <Text style={styles.termsBullet}>• Edit or delete any information in the app</Text>
              <Text style={styles.termsBullet}>• Disable data collection features</Text>
              <Text style={styles.termsBullet}>• Request clarification about how information is handled</Text>
              <Text style={styles.termsText}>
                If you want to delete all stored data, you may uninstall the app or request additional support.
              </Text>
            </View>
          )}

          {/* Section 7 - Changes to This Privacy Policy */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(7)}
          >
            <Text style={styles.privacyAccordionTitle}>7. Changes to This Privacy Policy</Text>
            <Ionicons 
              name={expandedSections.includes(7) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(7) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>
                We may update this Privacy Policy from time to time. Any changes will be posted within the app. Continued use of the app means you accept the updated policy.
              </Text>
            </View>
          )}

          {/* Section 8 - Contact Us */}
          <TouchableOpacity 
            style={styles.privacyAccordionHeader}
            onPress={() => toggleSection(8)}
          >
            <Text style={styles.privacyAccordionTitle}>8. Contact Us</Text>
            <Ionicons 
              name={expandedSections.includes(8) ? 'remove' : 'add'} 
              size={24} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
          {expandedSections.includes(8) && (
            <View style={styles.privacyAccordionContent}>
              <Text style={styles.termsText}>
                If you have questions or concerns about this Privacy Policy, you may contact us at:
              </Text>
              <Text style={styles.termsBullet}>• Email:</Text>
              <Text style={styles.termsBullet}>• Developer:</Text>
            </View>
          )}

          {/* Next button below Section 8 */}
          <TouchableOpacity 
            style={styles.termsNextButton}
            onPress={() => router.push('/terms&conditions')}
          >
            <Text style={styles.termsNextButtonText}>Next</Text>
          </TouchableOpacity>

          {/* Bottom spacing */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  termsModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    padding: 0,
  },
  termsModalContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  termsBackButton: {
    paddingTop: 36,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  termsBackButtonText: {
    fontSize: 20,
    color: '#244D4A',
    textDecorationLine: 'underline',
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
  },
  // Separate styles for the Next button so it doesn't reuse Back styles
  termsNextButton: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignSelf: 'flex-end',
  },
  termsNextButtonText: {
    fontSize: 20,
    color: '#244D4A',
    textDecorationLine: 'underline',
    fontWeight: '700',
    fontFamily: 'Fredoka_700Bold',
  },
  termsScrollView: {
    flex: 1,
  },
  termsScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  termsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#244D4A',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: 'Fredoka_700Bold',
  },
  termsSubtitle: {
    fontSize: 14,
    color: '#4A4A4A',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Fredoka_500Medium',
  },
  termsText: {
    fontSize: 14,
    color: '#244D4A',
    lineHeight: 20,
    marginBottom: 8,
    fontFamily: 'Fredoka_500Medium',
  },
  termsBullet: {
    fontSize: 14,
    color: '#244D4A',
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: 'Fredoka_500Medium',
  },
  privacyAccordionHeader: {
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#2F7D73',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  privacyAccordionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Fredoka_700Bold',
  },
  privacyAccordionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#B8E6D9',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  privacySubsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#244D4A',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Fredoka_700Bold',
  },
});
