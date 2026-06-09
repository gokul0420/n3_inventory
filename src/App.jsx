import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import Layout from './components/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ExecutiveDashboard from './pages/ExecutiveDashboard.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import StockMasterList from './pages/StockMasterList.jsx';
import StockUpload from './pages/StockUpload.jsx';
import DistributionList from './pages/DistributionList.jsx';
import CreateDistribution from './pages/CreateDistribution.jsx';
import BulkDistributionUpload from './pages/BulkDistributionUpload.jsx';
import ApprovalDashboard from './pages/ApprovalDashboard.jsx';
import ApprovalDetail from './pages/ApprovalDetail.jsx';
import LowStockAlerts from './pages/LowStockAlerts.jsx';
import ReportsList from './pages/ReportsList.jsx';
import ReportView from './pages/ReportView.jsx';
import AuditTrail from './pages/AuditTrail.jsx';
import UserManagement from './pages/UserManagement.jsx';
import WorkflowConfig from './pages/WorkflowConfig.jsx';
import SystemSettings from './pages/SystemSettings.jsx';
import EmpDistribution from './pages/EmpDistribution.jsx';
import EmpApprovalDashboard from './pages/EmpApprovalDashboard.jsx';
import EmployeeDashboard from './pages/EmployeeDashboard.jsx';
import EmployeeAllocations from './pages/EmployeeAllocations.jsx';
import TemplateCenter from './pages/TemplateCenter.jsx';
import ReorderRequests from './pages/ReorderRequests.jsx';
import ReorderApprovals from './pages/ReorderApprovals.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to={`/${user.role}`} />;
  return children;
}

function DashboardRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <Navigate to={`/${user.role}`} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardRedirect />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/executive" element={<ProtectedRoute roles={['executive','admin']}><ExecutiveDashboard /></ProtectedRoute>} />
        <Route path="/manager" element={<ProtectedRoute roles={['manager','admin']}><ManagerDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/stock" element={<ProtectedRoute roles={['executive','admin']}><StockMasterList /></ProtectedRoute>} />
        <Route path="/stock/upload" element={<ProtectedRoute roles={['executive','admin']}><StockUpload /></ProtectedRoute>} />
        <Route path="/distributions" element={<ProtectedRoute roles={['executive','admin']}><DistributionList /></ProtectedRoute>} />
        <Route path="/distributions/create" element={<ProtectedRoute roles={['executive','admin']}><CreateDistribution /></ProtectedRoute>} />
        <Route path="/distributions/upload" element={<ProtectedRoute roles={['executive','admin']}><BulkDistributionUpload /></ProtectedRoute>} />
        <Route path="/emp-distribution" element={<ProtectedRoute roles={['executive','admin']}><EmpDistribution /></ProtectedRoute>} />
        <Route path="/approvals" element={<ProtectedRoute roles={['manager','admin']}><ApprovalDashboard /></ProtectedRoute>} />
        <Route path="/approvals/:id" element={<ProtectedRoute roles={['manager','admin']}><ApprovalDetail /></ProtectedRoute>} />
        <Route path="/emp-approvals" element={<ProtectedRoute roles={['manager','admin']}><EmpApprovalDashboard /></ProtectedRoute>} />
        <Route path="/low-stock" element={<ProtectedRoute roles={['executive','manager','admin']}><LowStockAlerts /></ProtectedRoute>} />
        <Route path="/reorder-requests" element={<ProtectedRoute roles={['executive','admin']}><ReorderRequests /></ProtectedRoute>} />
        <Route path="/reorder-approvals" element={<ProtectedRoute roles={['manager','admin']}><ReorderApprovals /></ProtectedRoute>} />
        <Route path="/reports" element={<ReportsList />} />
        <Route path="/reports/:type" element={<ReportView />} />
        <Route path="/audit" element={<AuditTrail />} />
        <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/workflow" element={<ProtectedRoute roles={['admin']}><WorkflowConfig /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SystemSettings /></ProtectedRoute>} />
        <Route path="/employee" element={<ProtectedRoute roles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
        <Route path="/employee/allocations" element={<ProtectedRoute roles={['employee']}><EmployeeAllocations /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute roles={['executive','manager','admin']}><TemplateCenter /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

