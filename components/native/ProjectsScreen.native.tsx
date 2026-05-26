import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { clientService, projectService } from '../../services/api';
import { Client, Project } from '../../types';
import { Card, formatCurrency, formatStatus, ListScreen, SearchField, SecondaryButton, sharedStyles } from './shared';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([projectService.getAll().catch(() => []), clientService.getAll().catch(() => [])]);
      setProjects(p); setClients(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.description ?? '', clientNameById.get(p.clientId) ?? ''].some((f) => f.toLowerCase().includes(q))
    );
  }, [clientNameById, projects, query]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando projetos...</Text>
      </View>
    );
  }

  return (
    <ListScreen
      title="Projetos"
      data={filteredProjects}
      emptyText="Nenhum projeto encontrado."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={sharedStyles.listHeaderBlock}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar projeto por nome, cliente ou descrição" />
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={sharedStyles.cardTitle}>{item.name}</Text>
          <Text style={sharedStyles.cardText}>{clientNameById.get(item.clientId) ?? 'Cliente não encontrado'}</Text>
          {item.description ? <Text style={sharedStyles.helper}>{item.description}</Text> : null}
          <View style={sharedStyles.smallGrid}>
            <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Status</Text><Text style={sharedStyles.smallPillValue}>{formatStatus(item.status)}</Text></View>
            <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Progresso</Text><Text style={sharedStyles.smallPillValue}>{item.progress}%</Text></View>
            <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Orçamento</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.budget ?? 0)}</Text></View>
          </View>
        </Card>
      )}
    />
  );
}
