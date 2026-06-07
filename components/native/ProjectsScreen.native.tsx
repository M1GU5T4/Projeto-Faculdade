import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import { clientService, projectService } from '../../services/api';
import { Client, Project, ProjectExpense } from '../../types';
import { Badge, Card, formatCurrency, formatDate, formatStatus, ListScreen, SearchField, SecondaryButton, sharedStyles, StatCard, safeErrorMessage } from './shared';

type ProjectReport = Project & {
  statistics?: {
    totalExpenses?: number;
    taskProgress?: number;
    budget?: number;
  };
};

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectReport, setProjectReport] = useState<ProjectReport | null>(null);
  const [projectExpenses, setProjectExpenses] = useState<ProjectExpense[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  const closeSummary = () => {
    setSummaryVisible(false);
    setSelectedProject(null);
    setProjectReport(null);
    setProjectExpenses([]);
  };

  const openSummary = async (project: Project) => {
    setSummaryVisible(true);
    setSelectedProject(project);
    setProjectReport(null);
    setProjectExpenses([]);
    setSummaryLoading(true);
    try {
      const report = await projectService.getReport(project.id);
      setProjectReport(report);
      setProjectExpenses(report.projectExpenses ?? []);
    } catch (e) {
      Alert.alert('Erro', safeErrorMessage(e));
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando projetos...</Text>
      </View>
    );
  }

  const reportStats = projectReport?.statistics ?? projectReport ?? {};
  const selectedBudget = reportStats.budget ?? selectedProject?.budget ?? 0;
  const selectedExpensesTotal = reportStats.totalExpenses ?? projectExpenses.reduce((s, e) => s + e.amount, 0);
  const selectedTaskProgress = reportStats.taskProgress ?? selectedProject?.taskProgress ?? selectedProject?.progress ?? 0;
  const selectedBalance = selectedBudget - selectedExpensesTotal;

  return (
    <>
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
            <View style={sharedStyles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={sharedStyles.cardTitle}>{item.name}</Text>
                <Text style={sharedStyles.cardText}>{clientNameById.get(item.clientId) ?? 'Cliente não encontrado'}</Text>
              </View>
              {item.isOverdue ? <Badge label="Atrasado" /> : null}
            </View>
            {item.description ? <Text style={sharedStyles.helper}>{item.description}</Text> : null}
            <View style={sharedStyles.smallGrid}>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Status</Text><Text style={sharedStyles.smallPillValue}>{formatStatus(item.status)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Progresso</Text><Text style={sharedStyles.smallPillValue}>{item.taskProgress ?? item.progress}%</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Orçamento</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.budget ?? 0)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Despesas</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.totalExpenses ?? 0)}</Text></View>
              {typeof item.daysRemaining === 'number' ? <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Dias restantes</Text><Text style={sharedStyles.smallPillValue}>{String(item.daysRemaining)}</Text></View> : null}
            </View>
            <View style={sharedStyles.actionRow}>
              <SecondaryButton label="Resumo" onPress={() => void openSummary(item)} />
            </View>
          </Card>
        )}
      />

      <Modal visible={summaryVisible} transparent animationType="slide" onRequestClose={closeSummary}>
        <View style={sharedStyles.modalBackdrop}>
          <View style={sharedStyles.modalCard}>
            <View style={sharedStyles.modalHeader}>
              <Text style={sharedStyles.modalTitle}>Resumo do projeto</Text>
              <SecondaryButton label="Fechar" onPress={closeSummary} />
            </View>
            <ScrollView contentContainerStyle={sharedStyles.modalBody}>
              {!selectedProject ? null : (
                <>
                  <Card>
                    <Text style={sharedStyles.cardTitle}>{selectedProject.name}</Text>
                    <Text style={sharedStyles.cardText}>{clientNameById.get(selectedProject.clientId) ?? 'Cliente não encontrado'}</Text>
                    <View style={sharedStyles.grid2}>
                      <StatCard label="Orçamento" value={formatCurrency(selectedBudget)} iconLabel="R$" />
                      <StatCard label="Despesas" value={formatCurrency(selectedExpensesTotal)} iconLabel="-" />
                      <StatCard label="Saldo estimado" value={formatCurrency(selectedBalance)} iconLabel="=" />
                      <StatCard label="Tarefas" value={`${selectedTaskProgress}%`} iconLabel="%" />
                    </View>
                    {summaryLoading ? <Text style={sharedStyles.helper}>Carregando estatísticas...</Text> : null}
                  </Card>

                  <Card>
                    <Text style={sharedStyles.cardTitle}>Últimas despesas do projeto</Text>
                    {!summaryLoading && projectExpenses.length === 0 ? <Text style={sharedStyles.helper}>Nenhuma despesa lançada para este projeto.</Text> : null}
                    {projectExpenses.slice(0, 5).map((expense) => (
                      <View key={expense.id} style={sharedStyles.financeRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={sharedStyles.cardTitle}>{expense.description}</Text>
                          <Text style={sharedStyles.cardText}>{formatStatus(expense.category)}</Text>
                          <Text style={sharedStyles.helper}>{formatDate(expense.date)}</Text>
                        </View>
                        <Text style={sharedStyles.cardText}>{formatCurrency(expense.amount)}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
