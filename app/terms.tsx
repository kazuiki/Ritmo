// @ts-nocheck
import { Fredoka_400Regular, Fredoka_500Medium, Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ResponsiveBackButton } from '../src/components/ResponsiveBackButton';
import { ResponsiveSafeArea } from '../src/components/ResponsiveSafeArea';
import { useResponsiveDimensions } from '../src/utils/responsive';

export default function TermsAndConditions() {
  const { scaleFont, scaleSpacing, scaleWidth, scaleHeight } = useResponsiveDimensions();
  const insets = useSafeAreaInsets();
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [fontsLoaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const handleAcceptTerms = async () => {
    try {
      await AsyncStorage.setItem('@termsAccepted', 'true');
      setAcceptModalVisible(true);
    } catch (e) {
      // Silent fail or show error modal if needed
    }
  };

  const handleDeclineTerms = async () => {
    try {
      await AsyncStorage.setItem('@termsAccepted', 'false');
      setDeclineModalVisible(true);
    } catch (e) {
      // Silent fail or show error modal if needed
    }
  };

  if (!fontsLoaded) return null;

  return (
    <ResponsiveSafeArea edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.termsModalOverlay}>
        {/* Background Image */}
        <Image source={require('../assets/background.png')} style={styles.backgroundImage} resizeMode="cover" />

        <View style={styles.termsModalContainer}>
          {/* Back Button */}
          <ResponsiveBackButton />

        {/* Scrollable Content */}
        <ScrollView
          style={styles.termsScrollView}
          contentContainerStyle={[
            styles.termsScrollContent,
            { paddingBottom: scaleSpacing(24) + insets.bottom }
          ]}
          showsVerticalScrollIndicator={true}
        >
          <Text style={styles.termsTitle}>Terms & Conditions</Text>
          <Text style={styles.termsSubtitle}>Last updated on November 2025</Text>

          <Text style={styles.termsText}>
            Welcome to Ritmo. These Terms and Conditions ("Terms") govern your access to and use of the Ritmo mobile application ("App"), operated for the purpose of supporting children with Autism Spectrum Disorder (ASD) in completing daily routines with independence, structure, and consistency.
          </Text>

          <Text style={styles.termsText}>
            By downloading, installing, or using Ritmo, you agree to be bound by these Terms. If you do not agree, please stop using the App immediately.
          </Text>

          <Text style={styles.termsSectionTitle}>1. Purpose of the App</Text>
          <Text style={styles.termsText}>Ritmo is designed to:</Text>
          <Text style={styles.termsBullet}>• Provide visual, auditory, and structured routine guides for children with Level 2 Autism.</Text>
          <Text style={styles.termsBullet}>• Support parents, teachers, and guardians in managing, customizing, and monitoring daily routines.</Text>
          <Text style={styles.termsBullet}>• Promote independence, reduce anxiety, and create predictable daily structures for children.</Text>
          <Text style={styles.termsText}>Ritmo is an assistive tool, not a medical, therapeutic, or diagnostic service.</Text>

          <Text style={styles.termsSectionTitle}>2. User Eligibility</Text>
          <Text style={styles.termsText}>Ritmo is intended for:</Text>
          <Text style={styles.termsBullet}>• Parents/Guardian who manage the child's routines and monitor progress.</Text>
          <Text style={styles.termsBullet}>• Children who follow the visual and auditory guides provided in the App.</Text>
          <Text style={styles.termsText}>Parents/Guardian are responsible for:</Text>
          <Text style={styles.termsBullet}>• Creating and managing the child's account and routine settings.</Text>
          <Text style={styles.termsBullet}>• Ensuring the accuracy and appropriateness of tasks added to the system.</Text>
          <Text style={styles.termsBullet}>• Supervising the child while using the App when necessary.</Text>

          <Text style={styles.termsSectionTitle}>3. Account Registration</Text>
          <Text style={styles.termsText}>When creating an account:</Text>
          <Text style={styles.termsBullet}>• You agree to provide accurate and complete information.</Text>
          <Text style={styles.termsBullet}>• You are responsible for keeping your login details secure.</Text>
          <Text style={styles.termsBullet}>• You must notify Ritmo immediately if you suspect unauthorized access.</Text>
          <Text style={styles.termsText}>Ritmo may suspend or terminate accounts that violate these Terms.</Text>

          <Text style={styles.termsSectionTitle}>4. App Features and Use</Text>
          <Text style={styles.termsText}>By using the App, you acknowledge and agree to the following features:</Text>

          <Text style={styles.termsSubsectionTitle}>4.1 Routine Creation & Management</Text>
          <Text style={styles.termsBullet}>• Parents/Guardian can create personalized routines, tasks, and schedules based on the child's needs.</Text>
          <Text style={styles.termsBullet}>• You are fully responsible for ensuring tasks are safe, age-appropriate, and supportive.</Text>

          <Text style={styles.termsSubsectionTitle}>4.2 Visual and Auditory Guides</Text>
          <Text style={styles.termsBullet}>• Ritmo provides icons, images, simple instructions, audio cues, and optional instructional videos. These guides are for educational and supportive purposes only.</Text>

          <Text style={styles.termsSubsectionTitle}>4.3 Progress Tracking</Text>
          <Text style={styles.termsBullet}>• The App may record task completion, routine history, and user activity for monitoring progress.</Text>
          <Text style={styles.termsBullet}>• This data is accessible only to the authorized Parents/Guardian.</Text>

          <Text style={styles.termsSubsectionTitle}>4.4 Positive Reinforcement System</Text>
          <Text style={styles.termsBullet}>• The App uses stars, badges, points, and other motivating elements to support routine completion.</Text>
          <Text style={styles.termsBullet}>• These rewards are digital and have no real-world monetary value.</Text>

          <Text style={styles.termsSubsectionTitle}>4.5 Accessibility Design</Text>
          <Text style={styles.termsText}>Ritmo is designed with autism-friendly features including:</Text>
          <Text style={styles.termsBullet}>• Low-stimulus colors</Text>
          <Text style={styles.termsBullet}>• Clear icons</Text>
          <Text style={styles.termsBullet}>• Minimal text</Text>
          <Text style={styles.termsBullet}>• Smooth, simple navigation</Text>
          <Text style={styles.termsText}>However, Ritmo does not guarantee that all features will be suitable for every child.</Text>

          <Text style={styles.termsSectionTitle}>5. Acceptable Use of the App</Text>
          <Text style={styles.termsText}>By using Ritmo, you agree that you will NOT:</Text>
          <Text style={styles.termsBullet}>• Misuse, reverse-engineer, or modify any App function.</Text>
          <Text style={styles.termsBullet}>• Use the App for purposes other than assisting routine management.</Text>
          <Text style={styles.termsBullet}>• Upload unlawful, harmful, or inappropriate content.</Text>
          <Text style={styles.termsBullet}>• Attempt to access data you are not authorized to view.</Text>
          <Text style={styles.termsText}>Violations may result in account suspension or permanent removal.</Text>

          <Text style={styles.termsSectionTitle}>6. Data Privacy and Security</Text>
          <Text style={styles.termsText}>Ritmo values privacy, especially since it supports children. By using the App, you agree to the following:</Text>

          <Text style={styles.termsSubsectionTitle}>6.1 Information We Collect</Text>
          <Text style={styles.termsText}>Ritmo may collect:</Text>
          <Text style={styles.termsBullet}>• Parents/Guardian account information (name, email)</Text>
          <Text style={styles.termsBullet}>• Child routine data (tasks, progress, schedules)</Text>
          <Text style={styles.termsBullet}>• App usage analytics (for improvement purposes)</Text>
          <Text style={styles.termsText}>Ritmo does not sell or share personal information with third parties for marketing.</Text>

          <Text style={styles.termsSubsectionTitle}>6.2 How Data Is Used</Text>
          <Text style={styles.termsText}>Data is used to:</Text>
          <Text style={styles.termsBullet}>• Provide personalized routines and progress tracking</Text>
          <Text style={styles.termsBullet}>• Improve App performance and accessibility</Text>
          <Text style={styles.termsBullet}>• Ensure account security</Text>

          <Text style={styles.termsSubsectionTitle}>6.3 Storage and Security</Text>
          <Text style={styles.termsText}>Ritmo uses secure systems to store routine and user information. However, no app can guarantee 100% security. Parents/Guardian must protect their own login information.</Text>

          <Text style={styles.termsSectionTitle}>7. No Medical or Therapeutic Claims</Text>
          <Text style={styles.termsText}>Ritmo:</Text>
          <Text style={styles.termsBullet}>• It is not a substitute for professional therapy, diagnosis, or medical intervention.</Text>
          <Text style={styles.termsBullet}>• Does not guarantee improvements in behavior, skills, or development.</Text>
          <Text style={styles.termsBullet}>• Should be used as a support tool alongside caregiver guidance and professional advice.</Text>
          <Text style={styles.termsText}>Consult professionals for clinical or behavioral concerns.</Text>

          <Text style={styles.termsSectionTitle}>8. App Updates and Changes</Text>
          <Text style={styles.termsText}>Ritmo may update features, fix bugs, or change functionality at any time. Some updates may be required to continue using the App. Ritmo is not responsible for interruptions caused by updates or maintenance.</Text>

          <Text style={styles.termsSectionTitle}>9. Limitation of Liability</Text>
          <Text style={styles.termsText}>To the fullest extent allowed by law, Ritmo is not liable for:</Text>
          <Text style={styles.termsBullet}>• Improper use of the App</Text>
          <Text style={styles.termsBullet}>• Errors caused by user-submitted tasks or routines</Text>
          <Text style={styles.termsBullet}>• Damages resulting from device malfunction or internet issues</Text>
          <Text style={styles.termsBullet}>• Behavioral outcomes that may arise from routine changes</Text>
          <Text style={styles.termsText}>Parents/Guardian remain fully responsible for supervising the child and ensuring safety during real-life tasks.</Text>

          <Text style={styles.termsSectionTitle}>10. Termination of Use</Text>
          <Text style={styles.termsText}>Ritmo reserves the right to:</Text>
          <Text style={styles.termsBullet}>• Suspend or delete accounts that violate these Terms</Text>
          <Text style={styles.termsBullet}>• Discontinue certain features or the entire App</Text>
          <Text style={styles.termsBullet}>• Restrict access if misuse is suspected</Text>
          <Text style={styles.termsText}>Users may stop using the App at any time by uninstalling it.</Text>

          <Text style={styles.termsSectionTitle}>11. Intellectual Property</Text>
          <Text style={styles.termsText}>All content in Ritmo including icons, visuals, text, videos, and system design is owned by the App developers. Users may not copy, reproduce, modify, or distribute content without permission.</Text>

          <Text style={styles.termsSectionTitle}>12. Contact Information</Text>
          <Text style={styles.termsText}>For questions, support, or feedback, you can reach us at:</Text>
          <View style={styles.termsContactItem}>
            <Text style={styles.termsBullet}>• Email: </Text>
            <TouchableOpacity disabled={true} activeOpacity={1}>
              <Text style={[styles.termsLink, styles.termsLinkDisabled]}>Ritmokids1123@gmail.com</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.termsContactItem}>
            <Text style={styles.termsBullet}>• Website: </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://www.ritmokids.online/')}>
              <Text style={styles.termsLink}>https://www.ritmokids.online/</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Buttons - At the end of scrollable content */}
          <View style={styles.termsButtonContainer}>
            <TouchableOpacity style={styles.termsDeclineButton} onPress={handleDeclineTerms}>
              <Text style={styles.termsDeclineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.termsAcceptButton} onPress={handleAcceptTerms}>
              <Text style={styles.termsAcceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Accept Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={acceptModalVisible}
        onRequestClose={() => {
          setAcceptModalVisible(false);
          if (router.canGoBack()) {
            router.back();
            setTimeout(() => {
              if (router.canGoBack()) {
                router.back();
              }
            }, 0);
          }
        }}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainerAccept}>
            <View style={styles.alertIconCircle}>
              <Image
                source={require('../assets/images/Mail.png')}
                style={styles.alertIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.alertModalTitle}>Thank You!</Text>
            <Text style={styles.alertModalMessage}>
              You accepted the Terms & Conditions
            </Text>
            <TouchableOpacity
              style={styles.alertOkButton}
              onPress={() => {
                setAcceptModalVisible(false);
                
      router.push("/instruction");
              }}
            >
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Decline Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={declineModalVisible}
        onRequestClose={() => {
          setDeclineModalVisible(false);
          if (router.canGoBack()) {
            router.back();
            setTimeout(() => {
              if (router.canGoBack()) {
                router.back();
              }
            }, 0);
          }
        }}
      >
        <View style={styles.alertModalOverlay}>
          <View style={styles.alertModalContainerDecline}>
            <View style={styles.alertIconCircleDecline}>
              <Image
                source={require('../assets/images/sad_face_nobg.png')}
                style={styles.alertIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.alertModalTitle}>Notice</Text>
            <Text style={styles.alertModalMessage}>
              You declined the Terms & Conditions
            </Text>
            <TouchableOpacity
              style={styles.alertOkButtonDecline}
              onPress={() => {
                setDeclineModalVisible(false);
                if (router.canGoBack()) {
                  router.back();
                  setTimeout(() => {
                    if (router.canGoBack()) {
                      router.back();
                    }
                  }, 0);
                }
              }}
            >
              <Text style={styles.alertOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </ResponsiveSafeArea>
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
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#244D4A',
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'Fredoka_700Bold',
  },
  termsSubsectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#244D4A',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Fredoka_700Bold',
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
  termsContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  termsLink: {
    fontSize: 14,
    color: '#0066CC',
    textDecorationLine: 'underline',
    fontFamily: 'Fredoka_500Medium',
  },
  termsLinkDisabled: {
    color: '#0066CC',
  },
  termsButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  termsDeclineButton: {
    flex: 1,
    backgroundColor: '#FF6B7A',
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
  },
  termsDeclineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Fredoka_700Bold',
  },
  termsAcceptButton: {
    flex: 1,
    backgroundColor: '#2F7D73',
    borderRadius: 40,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 48,
  },
  termsAcceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Fredoka_700Bold',
  },
  // Alert Modal Styles
  alertModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalContainerAccept: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    width: '82%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  alertModalContainerDecline: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    width: '82%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFB3BA',
  },
  alertIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconCircleDecline: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  alertModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    fontFamily: 'Fredoka_700Bold',
  },
  alertModalMessage: {
    fontSize: 14,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
    flexWrap: 'wrap',
    fontFamily: 'Fredoka_500Medium',
  },
  alertOkButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  alertOkButtonDecline: {
    backgroundColor: '#FF6B7A',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  alertOkButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Fredoka_600SemiBold',
  },
});