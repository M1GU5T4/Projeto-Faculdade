import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LogOut } from 'lucide-react-native';
import { settingsService } from '../../services/api';
import { Card, ScreenShell, sharedStyles } from './shared';

export default function SettingsScreen({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    settingsService.getSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  return (
    <ScreenShell
      title="Configurações"
      action={
        <Pressable onPress={onLogout} style={sharedStyles.iconButton}>
          <LogOut size={18} color="#334155" />
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={sharedStyles.contentPad}>
        <Card>
          <Text style={sharedStyles.cardTitle}>Sessão</Text>
          <Text style={sharedStyles.cardText}>
            Configurações carregadas: {settings ? 'sim' : 'não'}
          </Text>
          <Text style={sharedStyles.helper}>
            Esta área pode receber ajustes do Gemini, notificações e preferências do app.
          </Text>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}
