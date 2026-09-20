import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./modules/auth/presentation/context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { HomePage } from "./pages/HomePage";
import { OperatorRegisterPage } from "./pages/OperatorRegisterPage";
import { LoginPage } from "./modules/auth/presentation/pages/LoginPage";
import { RegisterPage } from "./modules/auth/presentation/pages/RegisterPage";
import { ProfilePage } from "./modules/user/presentation/pages/ProfilePage";
import { OperatorGuard } from "./modules/operator/presentation/components/OperatorGuard";
import { OperatorLayout } from "./modules/operator/presentation/layouts/OperatorLayout";
import { OperatorDashboardPage } from "./modules/operator/presentation/pages/OperatorDashboardPage";
import { AdminGuard } from "./modules/admin/presentation/components/AdminGuard";
import { AdminLayout } from "./modules/admin/presentation/layouts/AdminLayout";
import { AdminOperatorListPage } from "./modules/admin/presentation/pages/AdminOperatorListPage";
import { AdminOperatorApplicationsPage } from "./modules/admin/presentation/pages/AdminOperatorApplicationsPage";
import { OperatorCarListPage } from "./modules/car/presentation/pages/OperatorCarListPage";
import { OperatorRouteListPage } from "./modules/route/presentation/pages/OperatorRouteListPage";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Protected Admin Portal Routes */}
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminOperatorListPage />} />
              <Route
                path="/admin/operators"
                element={<AdminOperatorListPage />}
              />
              <Route
                path="/admin/applications"
                element={<AdminOperatorApplicationsPage />}
              />
              <Route
                path="/admin/operator-applications"
                element={<AdminOperatorApplicationsPage />}
              />
            </Route>
          </Route>

          {/* Protected Operator Portal Routes */}
          <Route element={<OperatorGuard />}>
            <Route element={<OperatorLayout />}>
              <Route path="/operator" element={<OperatorDashboardPage />} />
              <Route
                path="/operator/dashboard"
                element={<OperatorDashboardPage />}
              />
              <Route path="/operator/cars" element={<OperatorCarListPage />} />
              <Route
                path="/operator/routes"
                element={<OperatorRouteListPage />}
              />
            </Route>
          </Route>

          {/* Main User Facing Routes */}
          <Route
            path="*"
            element={
              <MainLayout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/cars"
                    element={<Navigate to="/operator/cars" replace />}
                  />
                  <Route
                    path="/operator/register"
                    element={<OperatorRegisterPage />}
                  />
                  <Route
                    path="/operator/admin"
                    element={<Navigate to="/admin/applications" replace />}
                  />
                  <Route
                    path="/add-car"
                    element={
                      <Navigate to="/operator/cars?action=new" replace />
                    }
                  />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
