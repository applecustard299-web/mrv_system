import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Registry } from './pages/Registry';
import { ProjectDetail } from './pages/ProjectDetail';
import { RegisterProject } from './pages/RegisterProject';
import { ProjectMapPage } from './pages/ProjectMapPage';
import { MonitoringPage } from './pages/MonitoringPage';
import { ReportsPage } from './pages/ReportsPage';
import { VerificationPortal } from './pages/VerificationPortal';
import { CarbonEstimatorPage } from './pages/CarbonEstimatorPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { LoginPage } from './pages/LoginPage';

const MainLayout: React.FC = () => {
  const { user, role, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showLoginPage, setShowLoginPage] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-700"></div>
      </div>
    );
  }

  if (showLoginPage) {
    return <LoginPage onLoginSuccess={() => setShowLoginPage(false)} />;
  }

  const handleNavigate = (tab: NavItemKey, projectId?: number) => {
    setCurrentTab(tab);
    if (projectId !== undefined) {
      setSelectedProjectId(projectId);
    } else {
      setSelectedProjectId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar onResetData={() => setSelectedProjectId(null)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSelectedProjectId(null);
          }}
        />

        <main className="flex-1 p-6 md:p-8 max-w-5xl overflow-y-auto">
          {/* Dashboard Tab */}
          {currentTab === 'dashboard' && (
            <Dashboard onNavigate={handleNavigate} />
          )}

          {/* Registry Tab (Table or Detail) */}
          {currentTab === 'registry' && (
            selectedProjectId ? (
              <ProjectDetail
                projectId={selectedProjectId}
                onBack={() => setSelectedProjectId(null)}
                onNavigateToMonitoring={() => setCurrentTab('monitoring')}
                onNavigateToReports={() => setCurrentTab('reports')}
              />
            ) : (
              <Registry onViewProject={(id) => setSelectedProjectId(id)} />
            )
          )}

          {/* Project Map Tab */}
          {currentTab === 'map' && (
            <ProjectMapPage
              onSelectProject={(id) => {
                setSelectedProjectId(id);
                setCurrentTab('registry');
              }}
            />
          )}

          {/* Register Project Tab */}
          {currentTab === 'register' && (
            <RegisterProject
              onSuccess={(id) => {
                setSelectedProjectId(id);
                setCurrentTab('registry');
              }}
              onCancel={() => setCurrentTab('dashboard')}
            />
          )}

          {/* Monitoring Tab */}
          {currentTab === 'monitoring' && <MonitoringPage />}

          {/* Reports Tab */}
          {currentTab === 'reports' && <ReportsPage />}

          {/* Verification Portal Tab */}
          {currentTab === 'verification' && <VerificationPortal />}

          {/* Carbon Estimator Tab */}
          {currentTab === 'carbon' && <CarbonEstimatorPage />}

          {/* Audit Log Tab */}
          {currentTab === 'audit' && <AuditLogPage />}

          {/* User Management & Settings Tab */}
          {(currentTab === 'users' || currentTab === 'settings') && (
            <UserManagementPage onDataReset={() => setSelectedProjectId(null)} />
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
