import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useSignIn } from '@/hooks/mutations/useSignIn';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useTranslation } from '@/hooks/useTranslation';

type AuthMode = 'signin' | 'signup';

export default function AuthScreen() {
  const { data: currentAccount } = useCurrentAccount();
  const { t } = useTranslation();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [handle, setHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [pdsUrl, setPdsUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const signInMutation = useSignIn();
  const addAccountMutation = useAddAccount();
  const switchAccountMutation = useSwitchAccount();

  const validateHandle = (handle: string) => {
    // Bluesky handles can be @username.bsky.social or just username
    const handleRegex = /^@?[a-zA-Z0-9._-]+$/;
    return handleRegex.test(handle.replace('.bsky.social', ''));
  };

  const handleSignIn = async () => {
    if (!handle || !appPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!validateHandle(handle)) {
      Alert.alert(t('common.error'), t('auth.invalidBlueskyHandle'));
      return;
    }

    try {
      const result = await signInMutation.mutateAsync({
        identifier: handle,
        password: appPassword,
        pdsUrl: pdsUrl || undefined,
      });

      const newAccount = await addAccountMutation.mutateAsync({
        did: result.did,
        handle: result.handle,
        jwtToken: result.accessJwt,
        refreshToken: result.refreshJwt,
      });

      // Set the newly added account as current
      await switchAccountMutation.mutateAsync(newAccount);

      Alert.alert(
        t('common.success'),
        currentAccount ? t('auth.accountAddedSuccessfully') : t('auth.signedInSuccessfully'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace(currentAccount ? '/(tabs)/settings' : '/(tabs)'),
          },
        ],
      );
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.signInFailed'));
    }
  };

  const handleSignUp = async () => {
    if (!handle || !appPassword) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    if (!validateHandle(handle)) {
      Alert.alert(t('common.error'), t('auth.invalidBlueskyHandle'));
      return;
    }

    try {
      const result = await signInMutation.mutateAsync({
        identifier: handle,
        password: appPassword,
        pdsUrl: pdsUrl || undefined,
      });

      // For sign up, use the multi-account system
      const newAccount = await addAccountMutation.mutateAsync({
        did: result.did,
        handle: result.handle,
        jwtToken: result.accessJwt,
        refreshToken: result.refreshJwt,
      });

      // Set the newly added account as current
      await switchAccountMutation.mutateAsync(newAccount);

      Alert.alert(t('common.success'), t('auth.connectedSuccessfully'), [
        {
          text: t('common.ok'),
          onPress: () => router.replace('/(tabs)'),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : t('auth.connectionFailed'));
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    // Clear form when switching modes
    setHandle('');
    setAppPassword('');
  };

  const isSignUp = mode === 'signup';
  const isLoading = signInMutation.isPending;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {currentAccount ? t('common.addAccount') : isSignUp ? t('auth.connectBluesky') : t('auth.signInToBluesky')}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {currentAccount
                ? t('auth.addAnotherAccount')
                : isSignUp
                ? t('auth.connectAccountToGetStarted')
                : t('auth.signInWithHandleAndPassword')}
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.form}>
            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>{t('auth.blueskyHandle')}</ThemedText>
              <TextInput
                style={styles.input}
                value={handle}
                onChangeText={setHandle}
                placeholder={t('auth.blueskyHandlePlaceholder')}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <ThemedText style={styles.helperText}>{t('auth.handleHelperText')}</ThemedText>
            </ThemedView>

            <ThemedView style={styles.inputContainer}>
              <ThemedText style={styles.label}>{t('auth.appPassword')}</ThemedText>
              <TextInput
                style={styles.input}
                value={appPassword}
                onChangeText={setAppPassword}
                placeholder={t('auth.appPasswordPlaceholder')}
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
              />
              <ThemedText style={styles.helperText}>{t('auth.appPasswordHelperText')}</ThemedText>
            </ThemedView>

            <TouchableOpacity style={styles.advancedToggle} onPress={() => setShowAdvanced(!showAdvanced)}>
              <ThemedText style={styles.advancedToggleText}>
                {showAdvanced ? t('common.hide') : t('common.show')} {t('auth.advancedOptions')}
              </ThemedText>
            </TouchableOpacity>

            {showAdvanced && (
              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.label}>{t('auth.customPdsServer')}</ThemedText>
                <TextInput
                  style={styles.input}
                  value={pdsUrl}
                  onChangeText={setPdsUrl}
                  placeholder={t('auth.pdsUrlPlaceholder')}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
                <ThemedText style={styles.helperText}>{t('auth.pdsUrlHelperText')}</ThemedText>
              </ThemedView>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={isSignUp ? handleSignUp : handleSignIn}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading
                  ? currentAccount
                    ? t('auth.addingAccount')
                    : isSignUp
                    ? t('auth.connecting')
                    : t('auth.signingIn')
                  : currentAccount
                  ? t('common.addAccount')
                  : isSignUp
                  ? t('auth.connectAccount')
                  : t('common.signIn')}
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {!currentAccount && (
            <ThemedView style={styles.footer}>
              <ThemedText style={styles.footerText}>
                {isSignUp ? t('auth.alreadyConnected') : t('auth.needDifferentAccount')}
              </ThemedText>
              <TouchableOpacity onPress={toggleMode}>
                <ThemedText style={styles.linkText}>{isSignUp ? t('common.signIn') : t('auth.connectNew')}</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          )}

          <ThemedView style={styles.infoSection}>
            <ThemedText type="subtitle" style={styles.infoTitle}>
              {t('auth.howToGetAppPassword')}:
            </ThemedText>
            <ThemedText style={styles.infoText}>{t('auth.appPasswordInstructions')}</ThemedText>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  helperText: {
    fontSize: 12,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  advancedToggle: {
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
});
