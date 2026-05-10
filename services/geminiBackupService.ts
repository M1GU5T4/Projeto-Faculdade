import { API_URL } from './api';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = null;

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
};

export interface GeminiBackupRequest {
  type: 'data_analysis' | 'code_generation' | 'error_resolution' | 'feature_completion' | 'data_backup';
  context?: any;
  requirements: string;
  fallbackData?: any;
}

export interface GeminiBackupResponse {
  success: boolean;
  data?: any;
  code?: string;
  analysis?: string;
  error?: string;
  suggestions?: string[];
}

export interface GeminiStatus {
  available: boolean;
  connected: boolean;
  timestamp: string;
  message: string;
}

class GeminiBackupService {
  // Verificar status do serviço
  async getStatus(): Promise<GeminiStatus> {
    try {
      return await apiRequest('/gemini-backup/status');
    } catch (error) {
      console.error('Erro ao verificar status do Gemini Backup:', error);
      return {
        available: false,
        connected: false,
        timestamp: new Date().toISOString(),
        message: 'Erro ao conectar com o serviço'
      };
    }
  }

  // Fazer uma requisição de backup geral
  async makeBackupRequest(request: GeminiBackupRequest): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/request', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    } catch (error) {
      console.error('Erro na requisição de backup:', error);
      return {
        success: false,
        error: 'Erro ao processar requisição de backup'
      };
    }
  }

  // Análise rápida de dados
  async analyzeData(data: any, question: string): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/analyze', {
        method: 'POST',
        body: JSON.stringify({ data, question })
      });
    } catch (error) {
      console.error('Erro na análise de dados:', error);
      return {
        success: false,
        error: 'Erro ao analisar dados'
      };
    }
  }

  // Gerar código
  async generateCode(requirements: string, context?: any, language?: string): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/generate-code', {
        method: 'POST',
        body: JSON.stringify({ requirements, context, language })
      });
    } catch (error) {
      console.error('Erro na geração de código:', error);
      return {
        success: false,
        error: 'Erro ao gerar código'
      };
    }
  }

  // Resolver erro
  async resolveError(error: any, context?: any, description?: string): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/resolve-error', {
        method: 'POST',
        body: JSON.stringify({ error, context, description })
      });
    } catch (error) {
      console.error('Erro na resolução de problemas:', error);
      return {
        success: false,
        error: 'Erro ao resolver problema'
      };
    }
  }

  // Backup completo
  async performFullBackup(includeAnalysis: boolean = true): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/full-backup', {
        method: 'POST',
        body: JSON.stringify({ includeAnalysis })
      });
    } catch (error) {
      console.error('Erro no backup completo:', error);
      return {
        success: false,
        error: 'Erro ao realizar backup completo'
      };
    }
  }

  // Completar funcionalidade
  async completeFeature(feature: string, requirements: string, currentState?: any): Promise<GeminiBackupResponse> {
    try {
      return await apiRequest('/gemini-backup/complete-feature', {
        method: 'POST',
        body: JSON.stringify({ feature, requirements, currentState })
      });
    } catch (error) {
      console.error('Erro ao completar funcionalidade:', error);
      return {
        success: false,
        error: 'Erro ao completar funcionalidade'
      };
    }
  }

  // Métodos de conveniência para casos específicos

  // Analisar performance do sistema
  async analyzeSystemPerformance(metrics: any): Promise<GeminiBackupResponse> {
    return this.analyzeData(metrics, 'Analise a performance do sistema e forneça recomendações de otimização');
  }

  // Analisar dados financeiros
  async analyzeFinancialData(financialData: any): Promise<GeminiBackupResponse> {
    return this.analyzeData(financialData, 'Analise os dados financeiros e forneça insights sobre receitas, despesas e lucratividade');
  }

  // Gerar relatório de projeto
  async generateProjectReport(projectData: any): Promise<GeminiBackupResponse> {
    return this.analyzeData(projectData, 'Gere um relatório detalhado do projeto incluindo progresso, custos, riscos e recomendações');
  }

  // Sugerir melhorias no código
  async suggestCodeImprovements(code: string, language: string): Promise<GeminiBackupResponse> {
    return this.generateCode(
      `Analise o código fornecido e sugira melhorias em termos de performance, legibilidade, segurança e boas práticas. Código: ${code}`,
      { originalCode: code },
      language
    );
  }

  // Gerar testes automatizados
  async generateTests(code: string, testType: 'unit' | 'integration' | 'e2e' = 'unit'): Promise<GeminiBackupResponse> {
    return this.generateCode(
      `Gere testes ${testType} para o código fornecido. Use Jest/Testing Library para React ou Jest/Supertest para Node.js. Código: ${code}`,
      { codeToTest: code, testType }
    );
  }

  // Diagnosticar problema do sistema
  async diagnoseSystemIssue(symptoms: string, logs?: any, context?: any): Promise<GeminiBackupResponse> {
    return this.resolveError(
      logs,
      context,
      `Sintomas do problema: ${symptoms}. Por favor, diagnostique a causa e forneça soluções.`
    );
  }

  // Criar documentação
  async generateDocumentation(code: string, type: 'api' | 'component' | 'function' = 'function'): Promise<GeminiBackupResponse> {
    return this.generateCode(
      `Gere documentação detalhada para o código fornecido. Tipo: ${type}. Inclua descrição, parâmetros, retorno, exemplos de uso. Código: ${code}`,
      { codeToDocument: code, documentationType: type }
    );
  }
}

export default new GeminiBackupService();