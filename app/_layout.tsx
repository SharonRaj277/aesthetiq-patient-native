import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { UserProvider } from '../contexts/UserContext';
import { HealthProfileProvider } from '../context/HealthProfileContext';

// Native splash stays visible until app/index.tsx hides it after its
// own animation completes — prevents a blank frame between native and
// custom splash screens.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // ⚠️  Do NOT call SplashScreen.hideAsync() here.
  //     app/index.tsx owns the splash lifecycle.

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <UserProvider>
        <HealthProfileProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="profile-setup" />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="harmony-report" />
          <Stack.Screen name="ai-report" />
          <Stack.Screen name="scan-history" />
          <Stack.Screen name="health-conditions" />
          <Stack.Screen name="treatment-info" />
          <Stack.Screen name="routine" />
          <Stack.Screen name="treatment-plan" />
          <Stack.Screen name="doctor-treatment-plan" />
          <Stack.Screen name="treatment-quote" />
          <Stack.Screen name="treatment-plan-display" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="scan/type-selection" />
          <Stack.Screen name="scan/face-guide" />
          <Stack.Screen name="scan/dental-guide" />
          <Stack.Screen name="scan/skin-guide" />
          <Stack.Screen name="scan/camera" />
          <Stack.Screen name="scan/processing" />
          <Stack.Screen name="care/consult-doctor" />
          <Stack.Screen name="care/doctor-profile" />
          <Stack.Screen name="care/booking-confirmed" />
          <Stack.Screen name="care/all-appointments" />
          <Stack.Screen name="care/appointment-detail" />
          <Stack.Screen name="care/post-call-summary" />
          <Stack.Screen name="care/rating" />
          <Stack.Screen name="scan/skin-precheck" />
          <Stack.Screen name="scan/skin-environment" />
          <Stack.Screen name="scan/skin-multilight-guide" />
          <Stack.Screen name="scan/skin-light-capture" options={{ animation: 'fade' }} />
          <Stack.Screen name="scan/dental-precheck" />
          <Stack.Screen name="scan/dental-pain-locator" />
          <Stack.Screen name="scan/dental-symptom-questionnaire" />
          <Stack.Screen name="scan/emergency-dental" />
          <Stack.Screen name="scan/health-quick-check" />
          <Stack.Screen name="notifications-centre" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="privacy-security" />
          <Stack.Screen name="help-faq" />
          <Stack.Screen name="contact-us" />
          <Stack.Screen name="about" />
          <Stack.Screen name="terms" />
          <Stack.Screen name="privacy-policy" />
          <Stack.Screen name="suitability-check" />
          <Stack.Screen name="urgency-interstitial" />
          <Stack.Screen name="suspicious-lesion" />
          <Stack.Screen name="treatment-disclaimer" />
          <Stack.Screen name="landmark-overlay" />
          <Stack.Screen name="sos/emergency-select"    options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="sos/emergency-call"      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="sos/emergency-confirmed" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        </Stack>
        </HealthProfileProvider>
        </UserProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
