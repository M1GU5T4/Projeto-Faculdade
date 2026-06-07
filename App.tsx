import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, useColorScheme,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authService, settingsService } from './services/api';
import { appThemes, ThemeMode, ThemeProvider } from './components/native/shared';

// ─── Telas ────────────────────────────────────────────────────────────────────
import LoginScreen        from './components/native/Login.native';
import DashboardScreen    from './components/native/DashboardScreen.native';
import ClientsScreen      from './components/native/ClientsScreen.native';
import QuotesScreen       from './components/native/QuotesScreen.native';
import InvoicesScreen     from './components/native/InvoicesScreen.native';
import FinanceiroScreen   from './components/native/FinanceiroScreen.native';
import ProjectsScreen     from './components/native/ProjectsScreen.native';
import ExpensesScreen     from './components/native/ExpensesScreen.native';
import StockScreen        from './components/native/StockScreen.native';
import SettingsScreen     from './components/native/SettingsScreen.native';

// ─── Navegação ────────────────────────────────────────────────────────────────
const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TOKEN_KEY = 'token';
const USER_KEY  = 'currentUser';

const TAB_ICONS: Record<string, string> = {
  Dashboard:      '🏠',
  Clientes:       '👥',
  'Orçamentos':   '🧾',
  Financeiro:     '💼',
  Faturas:        '💳',
  Projetos:       '✅',
  Despesas:       '💸',
  Estoque:        '📦',
  'Configurações':'⚙️',
};

// ─── Sessão ───────────────────────────────────────────────────────────────────
function useAppSession() {
  const [loading, setLoading]             = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser]                   = useState<any>(null);

  useEffect(() => {
    (async () => {
      const token   = await AsyncStorage.getItem(TOKEN_KEY);
      const rawUser = await AsyncStorage.getItem(USER_KEY);
      const parsed  = rawUser ? JSON.parse(rawUser) : null;

      const isDemoToken = token === 'demo-token-local' || token === 'demo-session';
      const isJwt       = !!token && token.split('.').length === 3;

      if (!token || (!isDemoToken && !isJwt)) {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      if (isDemoToken) {
        const demoUser = { id: 'demo-user', name: 'Administrador Demo', email: 'admin@admin.com', role: 'ADMIN' };
        setAuthenticated(true);
        setUser(parsed ?? demoUser);
        setLoading(false);
        return;
      }

      setAuthenticated(true);
      setUser(parsed);
      setLoading(false);
    })();
  }, []);

  return { loading, authenticated, setAuthenticated, user, setUser };
}

// ─── App principal (abas) ─────────────────────────────────────────────────────
function MainApp({ onLogout, themeMode, setThemeMode }: {
  onLogout: () => Promise<void> | void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}) {
  const systemScheme = useColorScheme();
  const resolvedMode = themeMode === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const colors = appThemes[resolvedMode];

  return (
    <ThemeProvider value={{ mode: themeMode, resolvedMode, colors }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 16 }}>{TAB_ICONS[route.name] ?? '•'}</Text>
          ),
        })}
      >
        <Tab.Screen name="Dashboard"    component={DashboardScreen} />
        <Tab.Screen name="Clientes"     component={ClientsScreen} />
        <Tab.Screen name="Orçamentos"   component={QuotesScreen} />
        <Tab.Screen name="Financeiro"   component={FinanceiroScreen} />
        <Tab.Screen name="Faturas"      component={InvoicesScreen} />
        <Tab.Screen name="Projetos"     component={ProjectsScreen} />
        <Tab.Screen name="Despesas"     component={ExpensesScreen} />
        <Tab.Screen name="Estoque"      component={StockScreen} />
        <Tab.Screen name="Configurações">
          {() => <SettingsScreen onLogout={onLogout} themeMode={themeMode} onThemeChange={setThemeMode} />}
        </Tab.Screen>
      </Tab.Navigator>
    </ThemeProvider>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const session = useAppSession();
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const resolvedMode = themeMode === 'auto' ? (systemScheme === 'dark' ? 'dark' : 'light') : themeMode;
  const colors = appThemes[resolvedMode];

  useEffect(() => {
    if (!session.authenticated) return;

    settingsService.getSettings()
      .then((settings) => {
        if (settings?.theme === 'light' || settings?.theme === 'dark' || settings?.theme === 'auto') {
          setThemeMode(settings.theme);
        }
      })
      .catch(() => undefined);
  }, [session.authenticated]);

  const navigationTheme = useMemo(() => ({
    ...DefaultTheme,
    dark: resolvedMode === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  }), [colors, resolvedMode]);

  if (session.loading) {
    return (
      <SafeAreaProvider>
        <ThemeProvider value={{ mode: themeMode, resolvedMode, colors }}>
          <View style={[styles.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  const logout = async () => {
    await authService.logout();
    session.setAuthenticated(false);
    session.setUser(null);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        {session.authenticated ? (
          <MainApp onLogout={logout} themeMode={themeMode} setThemeMode={setThemeMode} />
        ) : (
          <ThemeProvider value={{ mode: themeMode, resolvedMode, colors }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {() => (
                  <LoginScreen
                    onLogin={async () => {
                      const token   = await AsyncStorage.getItem(TOKEN_KEY);
                      const rawUser = await AsyncStorage.getItem(USER_KEY);
                      const parsed  = rawUser ? JSON.parse(rawUser) : null;
                      session.setAuthenticated(Boolean(token));
                      session.setUser(parsed);
                    }}
                  />
                )}
              </Stack.Screen>
            </Stack.Navigator>
          </ThemeProvider>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
