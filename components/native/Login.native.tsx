import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LogIn, Eye, EyeOff, UserPlus } from 'lucide-react-native';
import { authService } from '../../services/api';

const DEMO_EMAIL = 'admin@admin.com';
const DEMO_PASSWORD = 'admin';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (isRegisterMode) {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem');
        }
        if (password.length < 6) {
          throw new Error('A senha deve ter pelo menos 6 caracteres');
        }
        if (name.length < 2) {
          throw new Error('O nome deve ter pelo menos 2 caracteres');
        }
        await authService.register(name, email, password);
      } else {
        await authService.login(email, password);
      }
      onLogin();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Erro ao ${isRegisterMode ? 'registrar' : 'fazer login'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode((prev) => !prev);
    setError('');
    if (!isRegisterMode) {
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
    } else {
      setEmail(DEMO_EMAIL);
      setPassword(DEMO_PASSWORD);
      setName('');
      setConfirmPassword('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* Header / Logo */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                {isRegisterMode
                  ? <UserPlus size={32} color="#fff" />
                  : <LogIn size={32} color="#fff" />
                }
              </View>
              <Text style={styles.title}>Sistema de Gestão</Text>
              <Text style={styles.subtitle}>
                {isRegisterMode
                  ? 'Crie sua conta para acessar o sistema'
                  : 'Faça login para acessar o sistema'}
              </Text>
            </View>

            {/* Mensagem de erro */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Campo Nome (somente no modo registro) */}
            {isRegisterMode && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            )}

            {/* Campo Email */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Campo Senha */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isRegisterMode ? 'Mínimo 6 caracteres' : 'Sua senha'}
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  activeOpacity={0.7}
                >
                  {showPassword
                    ? <EyeOff size={20} color="#9ca3af" />
                    : <Eye size={20} color="#9ca3af" />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* Campo Confirmar Senha (somente no modo registro) */}
            {isRegisterMode && (
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Confirmar Senha</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirme sua senha"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    activeOpacity={0.7}
                  >
                    {showConfirmPassword
                      ? <EyeOff size={20} color="#9ca3af" />
                      : <Eye size={20} color="#9ca3af" />
                    }
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Botão principal */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.submitButtonText}>
                    {isRegisterMode ? 'Registrando...' : 'Entrando...'}
                  </Text>
                </>
              ) : (
                <>
                  {isRegisterMode
                    ? <UserPlus size={20} color="#fff" />
                    : <LogIn size={20} color="#fff" />
                  }
                  <Text style={styles.submitButtonText}>
                    {isRegisterMode ? 'Criar Conta' : 'Entrar'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Alternar modo login/registro */}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleMode}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleButtonText}>
                {isRegisterMode
                  ? 'Já tem uma conta? Faça login'
                  : 'Não tem uma conta? Registre-se'}
              </Text>
            </TouchableOpacity>

            {/* Credenciais de demonstração */}
            {!isRegisterMode && (
              <View style={styles.demoBox}>
                <Text style={styles.demoText}>
                  <Text style={styles.demoBold}>Credenciais de demonstração:{'\n'}</Text>
                  Email: admin@admin.com{'\n'}
                  Senha: admin
                </Text>
              </View>
            )}

            {/* Rodapé */}
            <Text style={styles.footer}>Sistema de Gestão Empresarial v2.1.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2ff', // indigo-100
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },

  // Card principal
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb', // blue-600
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 6,
  },

  // Erro
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
  },

  // Campos
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },

  // Botão submit
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Toggle login/registro
  toggleButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },

  // Demo box
  demoBox: {
    marginTop: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 14,
  },
  demoText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  demoBold: {
    fontWeight: '700',
    color: '#374151',
  },

  // Rodapé
  footer: {
    marginTop: 24,
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default Login;
