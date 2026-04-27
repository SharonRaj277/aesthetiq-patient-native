import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Google OAuth ────────────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: '252876100252-etjpqjo4p5dddg7sb23a06qlc9edqukc.apps.googleusercontent.com',
    webClientId: '252876100252-3ffp7edgrg5336p8rtccbk4o5dlhmh7t.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = (response.authentication as any)?.id_token;
      if (idToken) {
        handleGoogleCredential(idToken);
      } else {
        setError('Google sign-in failed: missing id_token.');
        setIsLoading(false);
      }
    } else if (response?.type === 'error') {
      setError('Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  }, [response]);

  const handleGoogleCredential = async (idToken: string) => {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const cred       = await signInWithCredential(auth, credential);
      const { user }   = cred;

      // Create Firestore doc on first Google sign-in
      const ref  = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          fullName:     user.displayName ?? user.email?.split('@')[0] ?? 'User',
          email:        user.email ?? '',
          profileImage: user.photoURL ?? null,
          createdAt:    new Date().toISOString(),
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.log('Google login error:', err);
      setIsLoading(false);
      setError(err?.message ?? 'Google sign-in failed.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(-30)).current;
  const cardTranslate = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslate, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 700,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const switchTab = (tab: 'login' | 'register') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    setError('');
    setAgreedToTerms(false);
    setPin('');
    setConfirmPin('');
  };

  const handleAuth = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');

    // ── Validation
    if (!email.trim() || !pin) { setError('Please fill in all fields.'); return; }
    if (pin.length !== 6)      { setError('PIN must be exactly 6 digits.'); return; }
    if (activeTab === 'register') {
      if (pin !== confirmPin)  { setError('PINs do not match.'); return; }
      if (!agreedToTerms)      { setError('Please agree to the Terms of Service.'); return; }
    }

    if (!auth) {
      setError('Auth service unavailable. Check Firebase config.');
      return;
    }

    setIsLoading(true);
    try {
      if (activeTab === 'login') {
        // ── Sign in
        await signInWithEmailAndPassword(auth, email.trim(), pin);

      } else {
        // ── Register
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), pin);

        // Seed Firestore user document with defaults
        if (db) {
          const emailPrefix = email.split('@')[0];
          const fullName    = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          await setDoc(doc(db, 'users', cred.user.uid), {
            fullName,
            email:        email.trim(),
            profileImage: null,
            createdAt:    new Date().toISOString(),
          });
        }
      }

      // UserContext's onAuthStateChanged fires automatically → header updates
      router.replace('/(tabs)');

    } catch (err: any) {
      setIsLoading(false);
      // Map Firebase error codes to readable messages
      const code: string = err?.code ?? '';
      if      (code === 'auth/user-not-found')       setError('No account found with this email.');
      else if (code === 'auth/wrong-password')        setError('Incorrect PIN. Please try again.');
      else if (code === 'auth/invalid-credential')    setError('Invalid email or PIN.');
      else if (code === 'auth/email-already-in-use')  setError('An account with this email already exists.');
      else if (code === 'auth/invalid-email')         setError('Please enter a valid email address.');
      else if (code === 'auth/too-many-requests')     setError('Too many attempts. Please try again later.');
      else if (code === 'auth/network-request-failed') setError('Network error. Check your connection.');
      else setError(err?.message ?? 'Something went wrong. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleForgotPin = async () => {
    if (!email.trim()) {
      Alert.alert('Enter Email', 'Please enter your email address first.');
      return;
    }
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Reset Email Sent', `A PIN reset link has been sent to ${email.trim()}.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not send reset email.');
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError('');
    setIsLoading(true);
    await promptAsync();
    // isLoading cleared in response useEffect
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#F5F2FC', '#EDE8F8', '#E5DFF4']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo section */}
            <Animated.View
              style={[
                styles.logoSection,
                {
                  opacity: logoAnim,
                  transform: [{ translateY: logoTranslate }],
                },
              ]}
            >
              <Image
                source={require('../assets/images/aesthetiq_logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Image
                source={require('../assets/images/text logo.png')}
                style={styles.textLogo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Card */}
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardAnim,
                  transform: [{ translateY: cardTranslate }],
                },
              ]}
            >
              {/* Tab switcher */}
              <View style={styles.tabRow}>
                {(['login', 'register'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => switchTab(t)}
                    style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                    android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                  >
                    <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                      {t === 'login' ? 'LOGIN' : 'REGISTER'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Email */}
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#ABABC0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* 6-Digit PIN */}
              <View style={styles.inputWrap}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="6-Digit PIN"
                  placeholderTextColor="#ABABC0"
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  maxLength={6}
                  value={pin}
                  onChangeText={setPin}
                />
                <Pressable
                  onPress={() => setShowPin(!showPin)}
                  hitSlop={8}
                  android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
                >
                  <Ionicons
                    name={showPin ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#ABABC0"
                    style={{ marginRight: 4 }}
                  />
                </Pressable>
              </View>

              {/* Confirm PIN (Register only) */}
              {activeTab === 'register' && (
                <View style={styles.inputWrap}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Confirm 6-Digit PIN"
                    placeholderTextColor="#ABABC0"
                    keyboardType="number-pad"
                    secureTextEntry={!showConfirmPin}
                    maxLength={6}
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPin(!showConfirmPin)}
                    hitSlop={8}
                    android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: true }}
                  >
                    <Ionicons
                      name={showConfirmPin ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#ABABC0"
                      style={{ marginRight: 4 }}
                    />
                  </Pressable>
                </View>
              )}

              {/* Forgot PIN (Login only) */}
              {activeTab === 'login' && (
                <Pressable
                  onPress={handleForgotPin}
                  style={styles.forgotBtn}
                  android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                >
                  <Text style={styles.forgotText}>Forgot PIN?</Text>
                </Pressable>
              )}

              {/* Terms (Register only) */}
              {activeTab === 'register' && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAgreedToTerms(!agreedToTerms);
                  }}
                  style={styles.termsRow}
                  android_ripple={{ color: 'rgba(124,58,237,0.1)', borderless: true }}
                >
                  <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
                    {agreedToTerms && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  <Text style={styles.termsText}>
                    By registering, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                    {'.'}
                  </Text>
                </Pressable>
              )}

              {/* Submit button */}
              <Pressable
                onPress={handleAuth}
                disabled={isLoading}
                android_ripple={{ color: 'rgba(255,255,255,0.25)' }}
                style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
              >
                <LinearGradient
                  colors={isLoading ? ['#B5A8E0', '#C4B5F0'] : ['#7C3AED', '#9B6DFA']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  <Text style={styles.submitText}>
                    {isLoading ? 'Please wait...' : activeTab === 'login' ? 'LOGIN' : 'REGISTER'}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google button */}
              <Pressable
                onPress={handleGoogleSignIn}
                style={styles.googleBtn}
                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
              >
                <AntDesign name="google" size={20} color="#EA4335" />
                <Text style={styles.googleText}>Continue with Google</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F2FC',
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 90,
    height: 112,
    marginBottom: 10,
  },
  textLogo: {
    width: 200,
    height: 44,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1.5,
    borderBottomColor: '#EDE8F8',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1.5,
  },
  tabBtnActive: {
    borderBottomColor: '#7C3AED',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B0A8CC',
    letterSpacing: 0.8,
  },
  tabBtnTextActive: {
    color: '#1E1B4B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FD',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E1B4B',
    fontWeight: '400',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C6FCD',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1C8EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
    backgroundColor: '#fff',
  },
  checkboxActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  termsLink: {
    color: '#7C6FCD',
    fontWeight: '600',
  },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EDE8F8',
  },
  dividerText: {
    fontSize: 12,
    color: '#B0A8CC',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EDE8F8',
    backgroundColor: '#FFFFFF',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E1B4B',
  },
});
