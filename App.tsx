import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { authService } from './services/api';

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

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f5f7fb',
    card:       '#ffffff',
    text:       '#0f172a',
    border:     '#e2e8f0',
    primary:    '#2563eb',
  },
};

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
function MainApp({ onLogout }: { onLogout: () => Promise<void> | void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { borderTopColor: '#e2e8f0' },
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
        {() => <SettingsScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const session = useAppSession();

  if (session.loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
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
      <NavigationContainer theme={theme}>
        {session.authenticated ? (
          <MainApp onLogout={logout} />
        ) : (
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
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' },
});
