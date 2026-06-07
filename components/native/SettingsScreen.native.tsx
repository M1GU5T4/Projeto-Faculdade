import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LogOut, RefreshCw, Save } from 'lucide-react-native';
import { API_URL, authService, settingsService } from '../../services/api';
import { Card, Chip, PrimaryButton, ScreenShell, SecondaryButton, sharedStyles, ThemeMode, useAppTheme } from './shared';

type UserProfile = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type NotificationSettings = {
  newQuotes: boolean;
  overdueInvoices: boolean;
  weeklyReports: boolean;
};

type UserSettings = {
  theme?: ThemeMode;
  notifications?: Partial<NotificationSettings> | string;
};

type SettingsScreenProps = {
  onLogout: () => Promise<void> | void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
};

const defaultNotifications: NotificationSettings = {
  newQuotes: true,
  overdueInvoices: true,
  weeklyReports: false,
};

const themeLabels: Record<ThemeMode, string> = {
  light: 'Claro',
  dark: 'Escuro',
  auto: 'Automático',
};

const notificationLabels: Array<{ key: keyof NotificationSettings; title: string; description: string }> = [
  { key: 'newQuotes', title: 'Novos orçamentos', description: 'Avisar quando houver movimentação em orçamentos.' },
  { key: 'overdueInvoices', title: 'Faturas vencidas', description: 'Destacar cobranças que precisam de atenção.' },
  { key: 'weeklyReports', title: 'Relatórios semanais', description: 'Receber resumo semanal de desempenho.' },
];

function parseNotifications(value: UserSettings['notifications']): NotificationSettings {
  if (!value) return defaultNotifications;

  if (typeof value === 'string') {
    try {
      return { ...defaultNotifications, ...JSON.parse(value) };
    } catch {
      return defaultNotifications;
    }
  }

  return { ...defaultNotifications, ...value };
}

function initialsFromName(name?: string, email?: string) {
  const source = name || email || 'Usuário';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function formatRole(role?: string) {
  if (!role) return 'Usuário';
  return role.toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function SettingsScreen({ onLogout, themeMode, onThemeChange }: SettingsScreenProps) {
  const { colors } = useAppTheme();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(themeMode);
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const [currentUser, settings] = await Promise.all([
        authService.getCurrentUser(),
        settingsService.getSettings().catch(() => null),
      ]);

      const userSettings = (settings || {}) as UserSettings;
      const loadedTheme = userSettings.theme || 'light';
      setUser(currentUser);
      setTheme(loadedTheme);
      onThemeChange(loadedTheme);
      setNotifications(parseNotifications(userSettings.notifications));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar configurações.');
    } finally {
      setLoading(false);
    }
  }, [onThemeChange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setTheme(themeMode);
  }, [themeMode]);

  const userInitials = useMemo(() => initialsFromName(user?.name, user?.email), [user?.name, user?.email]);

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await settingsService.updateSettings({ theme, notifications });
      onThemeChange(theme);
      setMessage('Preferências salvas com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as preferências.');
    } finally {
      setSaving(false);
    }
  };

  const updateTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    onThemeChange(nextTheme);
  };

  const updateNotification = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications((current) => ({ ...current, [key]: value }));
  };

  return (
    <ScreenShell
      title="Configurações"
      action={
        <Pressable onPress={onLogout} style={[sharedStyles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LogOut size={18} color={colors.textSecondary} />
        </Pressable>
      }
    >
      {loading ? (
        <View style={[sharedStyles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Carregando configurações...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={sharedStyles.contentPad}>
          {!!error && (
            <Card style={{ backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </Card>
          )}

          {!!message && (
            <Card style={{ backgroundColor: colors.successSoft, borderColor: colors.successBorder }}>
              <Text style={[styles.successText, { color: colors.success }]}>{message}</Text>
            </Card>
          )}

          <Card>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.primaryText }]}>{userInitials}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>{user?.name || 'Usuário conectado'}</Text>
                <Text style={[sharedStyles.cardText, { color: colors.textSecondary }]}>{user?.email || 'Email não informado'}</Text>
                <View style={sharedStyles.badgeRow}>
                  <View style={[sharedStyles.badge, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                    <Text style={[sharedStyles.badgeText, { color: colors.primary }]}>{formatRole(user?.role)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.infoList, { borderTopColor: colors.borderMuted }]}>
              <InfoRow label="ID do usuário" value={user?.id || 'Não informado'} />
              <InfoRow label="Sessão" value="Ativa" />
            </View>
          </Card>

          <Card>
            <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Preferências do app</Text>
            <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Ajuste aparência e notificações da sua sessão.</Text>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Tema</Text>
            <View style={styles.chipWrap}>
              {(Object.keys(themeLabels) as ThemeMode[]).map((option) => (
                <Chip
                  key={option}
                  label={themeLabels[option]}
                  selected={theme === option}
                  onPress={() => updateTheme(option)}
                />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.text }]}>Notificações</Text>
            {notificationLabels.map((item) => (
              <View key={item.key} style={[styles.preferenceRow, { borderBottomColor: colors.borderMuted }]}>
                <View style={styles.preferenceText}>
                  <Text style={[styles.preferenceTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>{item.description}</Text>
                </View>
                <Switch
                  value={notifications[item.key]}
                  onValueChange={(value) => updateNotification(item.key, value)}
                  trackColor={{ false: colors.border, true: colors.primarySoft }}
                  thumbColor={notifications[item.key] ? colors.primary : colors.surfaceMuted}
                />
              </View>
            ))}

            <View style={sharedStyles.actionRow}>
              <PrimaryButton label={saving ? 'Salvando...' : 'Salvar preferências'} onPress={saveSettings} disabled={saving} />
              <SecondaryButton label="Recarregar" onPress={loadData} disabled={saving} />
            </View>
          </Card>

          <Card>
            <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Sessão e sistema</Text>
            <View style={[styles.infoList, { borderTopColor: colors.borderMuted }]}>
              <InfoRow label="API conectada" value={API_URL} />
              <InfoRow label="Configurações" value="Disponíveis" />
              <InfoRow label="Autenticação" value="Token local ativo" />
            </View>
            <View style={sharedStyles.actionRow}>
              <SecondaryButton label="Atualizar dados" onPress={loadData} disabled={saving} />
              <Pressable onPress={saveSettings} disabled={saving} style={[styles.iconAction, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                <Save size={16} color={colors.primary} />
                <Text style={[styles.iconActionText, { color: colors.primary }]}>Salvar</Text>
              </Pressable>
              <Pressable onPress={loadData} disabled={saving} style={[styles.iconAction, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
                <RefreshCw size={16} color={colors.primary} />
                <Text style={[styles.iconActionText, { color: colors.primary }]}>Sincronizar</Text>
              </Pressable>
            </View>
            <View style={styles.logoutBlock}>
              <PrimaryButton label="Sair da conta" onPress={onLogout} />
            </View>
          </Card>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.borderMuted }]}>
      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 20 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800' },
  infoList: { marginTop: 12, borderTopWidth: 1 },
  infoRow: { paddingVertical: 10, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { marginTop: 3, fontWeight: '600' },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preferenceRow: { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  preferenceText: { flex: 1 },
  preferenceTitle: { fontWeight: '700' },
  errorText: { fontWeight: '600' },
  successText: { fontWeight: '600' },
  iconAction: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  iconActionText: { fontWeight: '700' },
  logoutBlock: { marginTop: 14 },
});
