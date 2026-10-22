import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { LoginCallback } from "./pages/LoginCallback";
import { AdminHome } from "./pages/AdminHome";
import { QuestionnaireNew } from "./pages/QuestionnaireNew";
import { QuestionnaireDetail } from "./pages/QuestionnaireDetail";
import { ProgressDashboard } from "./pages/ProgressDashboard";
import { GridResult } from "./pages/GridResult";
import { EvaluatorHome } from "./pages/EvaluatorHome";
import { ScoringForm } from "./pages/ScoringForm";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questionnaires/new"
          element={
            <ProtectedRoute requireAdmin>
              <QuestionnaireNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questionnaires/:id"
          element={
            <ProtectedRoute requireAdmin>
              <QuestionnaireDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questionnaires/:id/progress"
          element={
            <ProtectedRoute requireAdmin>
              <ProgressDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/questionnaires/:id/grid"
          element={
            <ProtectedRoute requireAdmin>
              <GridResult />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluator"
          element={
            <ProtectedRoute>
              <EvaluatorHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluator/score/:relationId"
          element={
            <ProtectedRoute>
              <ScoringForm />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  );
}
