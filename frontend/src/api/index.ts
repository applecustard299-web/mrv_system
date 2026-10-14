import {
  User, UserRole, Project, CarbonFactor, CarbonCalculation,
  MonitoringEvent, MonitoringReport, VerificationReview,
  RegistryRecord, AuditLogItem, DashboardMetrics, DocumentFile
} from '../types';

const API_BASE = '/api';

export const getHeaders = (role?: UserRole, email?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const activeRole = role || localStorage.getItem('blue_carbon_role') || 'Administrator';
  const activeEmail = email || localStorage.getItem('blue_carbon_email') || 'admin@bluecarbon.org';
  headers['X-User-Role'] = activeRole;
  headers['X-User-Email'] = activeEmail;
  return headers;
};

export const api = {
  // Auth
  async getDemoUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    return res.json();
  },
  async switchRole(role: UserRole): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    return res.json();
  },
  async getCurrentUser(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    return res.json();
  },

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/dashboard/metrics`, { headers: getHeaders() });
    return res.json();
  },

  // Projects
  async getProjects(params?: { ecosystem?: string; region?: string; status?: string; search?: string }): Promise<Project[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/projects?${query}`, { headers: getHeaders() });
    return res.json();
  },
  async getProject(idOrCode: string | number): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${idOrCode}`, { headers: getHeaders() });
    return res.json();
  },
  async registerProject(data: any): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to register project');
    }
    return res.json();
  },
  async updateProjectStatus(id: number, status: string, notes?: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    return res.json();
  },

  // Map
  async getMapGeoJSON(ecosystem?: string, status?: string): Promise<any> {
    const query = new URLSearchParams({ ecosystem: ecosystem || 'All', status: status || 'All' }).toString();
    const res = await fetch(`${API_BASE}/map/geojson?${query}`);
    return res.json();
  },

  // Carbon
  async getCarbonFactors(): Promise<CarbonFactor[]> {
    const res = await fetch(`${API_BASE}/carbon/factors`, { headers: getHeaders() });
    return res.json();
  },
  async updateCarbonFactor(factorId: number, data: Partial<CarbonFactor>): Promise<CarbonFactor> {
    const res = await fetch(`${API_BASE}/carbon/factors/${factorId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async calculateCarbon(data: {
    project_id: number;
    ecosystem_type: string;
    area_ha: number;
    period_years: number;
    custom_factor_value?: number;
    baseline_discount_pct?: number;
    uncertainty_pct?: number;
    assumptions_notes?: string;
  }): Promise<CarbonCalculation> {
    const res = await fetch(`${API_BASE}/carbon/calculate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getCarbonHistory(projectId: number): Promise<CarbonCalculation[]> {
    const res = await fetch(`${API_BASE}/carbon/history/${projectId}`, { headers: getHeaders() });
    return res.json();
  },

  // Monitoring
  async getMonitoringEvents(projectId?: number): Promise<MonitoringEvent[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    const res = await fetch(`${API_BASE}/monitoring/events${query}`, { headers: getHeaders() });
    return res.json();
  },
  async createMonitoringEvent(data: any): Promise<MonitoringEvent> {
    const res = await fetch(`${API_BASE}/monitoring/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async uploadEvidence(formData: FormData): Promise<DocumentFile> {
    const role = localStorage.getItem('blue_carbon_role') || 'Administrator';
    const email = localStorage.getItem('blue_carbon_email') || 'admin@bluecarbon.org';
    const res = await fetch(`${API_BASE}/monitoring/upload-evidence`, {
      method: 'POST',
      headers: {
        'X-User-Role': role,
        'X-User-Email': email
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },
  async getDocuments(projectId?: number): Promise<DocumentFile[]> {
    const query = projectId ? `?project_id=${projectId}` : '';
    const res = await fetch(`${API_BASE}/monitoring/documents${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Reports
  async getReports(projectId?: number, status?: string): Promise<MonitoringReport[]> {
    const query = new URLSearchParams({
      ...(projectId ? { project_id: projectId.toString() } : {}),
      ...(status ? { status } : {})
    }).toString();
    const res = await fetch(`${API_BASE}/reports?${query}`, { headers: getHeaders() });
    return res.json();
  },
  async createReport(data: any): Promise<MonitoringReport> {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  getReportPdfUrl(reportId: number): string {
    return `${API_BASE}/reports/${reportId}/download-pdf`;
  },

  // Verification
  async getVerificationQueue(): Promise<MonitoringReport[]> {
    const res = await fetch(`${API_BASE}/verification/queue`, { headers: getHeaders() });
    return res.json();
  },
  async submitVerificationDecision(reportId: number, data: {
    findings_summary: string;
    correction_notes?: string;
    decision: string;
    verification_statement?: string;
  }): Promise<VerificationReview> {
    const res = await fetch(`${API_BASE}/verification/reports/${reportId}/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getVerificationHistory(): Promise<VerificationReview[]> {
    const res = await fetch(`${API_BASE}/verification/history`, { headers: getHeaders() });
    return res.json();
  },

  // Registry
  async getRegistry(params?: { ecosystem?: string; region?: string; status?: string; verification?: string; search?: string }): Promise<RegistryRecord[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/registry?${query}`, { headers: getHeaders() });
    return res.json();
  },
  async getPublicProjectDetails(projectCode: string): Promise<any> {
    const res = await fetch(`${API_BASE}/registry/project-public/${projectCode}`);
    return res.json();
  },

  // Audit
  async getAuditLogs(params?: { action?: string; entity_type?: string; search?: string }): Promise<AuditLogItem[]> {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE}/audit?${query}`, { headers: getHeaders() });
    return res.json();
  },

  // Admin & Users
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
    return res.json();
  },
  async resetDemoData(): Promise<any> {
    const res = await fetch(`${API_BASE}/users/reset-demo-data`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return res.json();
  }
};
