import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './modules/auth/presentation/context/AuthContext';

// Layouts
import { CustomerLayout } from './layouts/CustomerLayout';
import { OperatorLayout } from './layouts/OperatorLayout';
import { StaffLayout } from './layouts/StaffLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Guards
import {
  AuthGuard,
  OperatorGuard,
  StaffGuard,
  AdminGuard,
  CapabilityGuard,
} from './shared/presentation/guards/Guards';

// Customer Pages
import { HomePage } from './pages/HomePage';
import { CustomerTripSearchPage } from './modules/trip/presentation/pages/CustomerTripSearchPage';
import { TripDetailPage } from './modules/trip/presentation/pages/TripDetailPage';
import { CheckoutPage } from './modules/booking/presentation/pages/CheckoutPage';
import { PaymentReturnPage } from './modules/booking/presentation/pages/PaymentReturnPage';
import { CustomerTicketsPage } from './modules/booking/presentation/pages/CustomerTicketsPage';
import { CustomerOrderDetailPage } from './modules/booking/presentation/pages/CustomerOrderDetailPage';
import { CustomerDisputesPage } from './modules/booking/presentation/pages/CustomerDisputesPage';
import { ExchangeTicketPage } from './modules/booking/presentation/pages/ExchangeTicketPage';
import { OperationProgressPage } from './modules/booking/presentation/pages/OperationProgressPage';
import { AmendTicketPage } from './modules/booking/presentation/pages/AmendTicketPage';
import { LoginPage } from './modules/auth/presentation/pages/LoginPage';
import { AuthCallbackPage } from './modules/auth/presentation/pages/AuthCallbackPage';
import { RegisterPage } from './modules/auth/presentation/pages/RegisterPage';
import { ProfilePage } from './modules/user/presentation/pages/ProfilePage';
import { OperatorRegisterPage } from './pages/OperatorRegisterPage';

// Operator Pages
import { OperatorDashboardPage } from './modules/operator/presentation/pages/OperatorDashboardPage';
import { OperatorCarListPage } from './modules/car/presentation/pages/OperatorCarListPage';
import { OperatorSeatLayoutPage } from './modules/car/presentation/pages/OperatorSeatLayoutPage';
import { OperatorStopsPage } from './modules/operator/presentation/pages/OperatorStopsPage';
import { OperatorRouteListPage } from './modules/route/presentation/pages/OperatorRouteListPage';
import { OperatorTripListPage } from './modules/trip/presentation/pages/OperatorTripListPage';
import { OperatorTripManagePage } from './modules/trip/presentation/pages/OperatorTripManagePage';
import { OperatorCounterPage } from './modules/operator/presentation/pages/OperatorCounterPage';
import { OperatorCounterSalesPage } from './modules/operator/presentation/pages/OperatorCounterSalesPage';
import { OperatorStaffPage } from './modules/operator/presentation/pages/OperatorStaffPage';
import { OperatorOrdersPage } from './modules/operator/presentation/pages/OperatorOrdersPage';
import { OperatorProfilePage } from './modules/operator/presentation/pages/OperatorProfilePage';
import { OperatorReportsPage } from './modules/operator/presentation/pages/OperatorReportsPage';
import { OperatorOfferContentPage } from './modules/operator/presentation/pages/OperatorOfferContentPage';

// Staff Pages
import { StaffCheckInPage } from './modules/staff/presentation/pages/StaffCheckInPage';

// Admin Pages
import { AdminTransportOverviewPage } from './modules/admin/presentation/pages/AdminTransportOverviewPage';
import { AdminOperatorListPage } from './modules/admin/presentation/pages/AdminOperatorListPage';
import { AdminOperatorApplicationsPage } from './modules/admin/presentation/pages/AdminOperatorApplicationsPage';
import { AdminRefundsPage } from './modules/admin/presentation/pages/AdminRefundsPage';
import { AdminOrdersPage } from './modules/admin/presentation/pages/AdminOrdersPage';
import { AdminOperationsPage } from './modules/admin/presentation/pages/AdminOperationsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* 1. Customer Public & Protected Routes under CustomerLayout */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<CustomerTripSearchPage />} />
            <Route path="/trips/:tripId" element={<TripDetailPage />} />
            <Route path="/checkout/:orderId" element={<CheckoutPage />} />
            <Route path="/payment/return" element={<PaymentReturnPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Customer Routes */}
            <Route element={<AuthGuard />}>
              <Route path="/account/tickets" element={<CustomerTicketsPage />} />
              <Route path="/account/orders/:orderId" element={<CustomerOrderDetailPage />} />
              <Route path="/account/orders/:orderId/items/:itemId/exchange" element={<ExchangeTicketPage />} />
              <Route path="/account/orders/:orderId/items/:itemId/amend" element={<AmendTicketPage />} />
              <Route path="/account/operations/:operationId" element={<OperationProgressPage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
              <Route path="/account/disputes" element={<CustomerDisputesPage />} />
              <Route path="/become-operator" element={<OperatorRegisterPage />} />
              <Route path="/operator/register" element={<OperatorRegisterPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* 2. Operator Portal Routes */}
          <Route element={<OperatorGuard />}>
            <Route element={<OperatorLayout />}>
              <Route path="/operator" element={<OperatorDashboardPage />} />
              <Route path="/operator/dashboard" element={<OperatorDashboardPage />} />
              <Route path="/operator/cars" element={<OperatorCarListPage />} />
              <Route path="/operator/cars/:carId/seats" element={<OperatorSeatLayoutPage />} />
              <Route path="/operator/stops" element={<OperatorStopsPage />} />
              <Route path="/operator/routes" element={<OperatorRouteListPage />} />
              <Route path="/operator/trips" element={<OperatorTripListPage />} />
              <Route path="/operator/trips/:tripId/manage" element={<OperatorTripManagePage />} />
              <Route path="/operator/orders" element={<OperatorOrdersPage />} />
              <Route path="/operator/counter" element={<Navigate to="/operator/orders" replace />} />
              <Route path="/operator/counter-sales" element={<OperatorCounterSalesPage />} />
              <Route path="/operator/shifts" element={<Navigate to="/operator/counter-sales" replace />} />
              <Route path="/operator/staff" element={<OperatorStaffPage />} />
              <Route path="/operator/reports" element={<OperatorReportsPage />} />
              <Route path="/operator/profile" element={<OperatorProfilePage />} />
              <Route path="/operator/offers/:listingId" element={<OperatorOfferContentPage />} />
            </Route>
          </Route>

          {/* 3. Staff Portal Routes */}
          <Route element={<StaffGuard />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff" element={<OperatorTripListPage />} />
              <Route path="/staff/trips" element={<OperatorTripListPage />} />
              <Route path="/staff/trips/:tripId/manage" element={<CapabilityGuard anyOf={['MANAGE_TRIP']}><OperatorTripManagePage /></CapabilityGuard>} />
              <Route path="/staff/check-in" element={<CapabilityGuard anyOf={['CHECK_IN']}><StaffCheckInPage /></CapabilityGuard>} />
              <Route path="/staff/counter" element={<CapabilityGuard anyOf={['SELL_CASH']}><OperatorCounterPage /></CapabilityGuard>} />
              <Route path="/staff/shifts" element={<Navigate to="/staff/trips" replace />} />
              <Route path="/staff/orders" element={<OperatorOrdersPage />} />
            </Route>
          </Route>

          {/* 4. Admin Portal Routes */}
          <Route element={<AdminGuard />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminTransportOverviewPage />} />
              <Route path="/admin/operators" element={<AdminOperatorListPage />} />
              <Route path="/admin/applications" element={<AdminOperatorApplicationsPage />} />
              <Route path="/admin/operator-applications" element={<AdminOperatorApplicationsPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/offers" element={<Navigate to="/admin/operators" replace />} />
              <Route path="/admin/refunds" element={<AdminRefundsPage />} />
              <Route path="/admin/cancellations" element={<AdminOperationsPage key="cancellations" mode="cancellations" />} />
              <Route path="/admin/reconciliation" element={<AdminOperationsPage key="reconciliation" mode="reconciliation" />} />
              <Route path="/admin/payouts" element={<AdminOperationsPage key="payouts" mode="payouts" />} />
              <Route path="/admin/accounts" element={<AdminOperationsPage key="accounts" mode="accounts" />} />
              <Route path="/admin/policies" element={<AdminOperationsPage key="policies" mode="policies" />} />
            </Route>
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
