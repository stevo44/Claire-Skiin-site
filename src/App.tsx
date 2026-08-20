import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';

// Auth
import { AuthProvider } from './store/authStore';
import { ProductProvider } from './store/productStore';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import { usePageTracking } from './hooks/useTracking';

// Lazy-loaded public pages. Previously these were all eagerly imported,
// meaning every visitor downloaded the entire storefront — including
// checkout/payment code — before the homepage even rendered. Measured
// impact: main JS chunk was 824.95 kB (206.67 kB gzipped) before this
// change. Given the mobile-first requirement, this was the single highest-
// leverage performance fix available.
const HomePage           = lazy(() => import('./pages/HomePage'));
const ShopPage           = lazy(() => import('./pages/ShopPage'));
const ProductDetailPage  = lazy(() => import('./pages/ProductDetailPage'));
const CartPage           = lazy(() => import('./pages/CartPage'));
const CheckoutPage       = lazy(() => import('./pages/CheckoutPage'));
const HairCarePage       = lazy(() => import('./pages/HairCarePage'));
const LipCarePage        = lazy(() => import('./pages/LipCarePage'));
const SpaServicesPage    = lazy(() => import('./pages/SpaServicesPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const OrderConfirmedPage = lazy(() => import('./pages/OrderConfirmedPage'));
const WishlistPage       = lazy(() => import('./pages/WishlistPage'));
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage'));
// NotFoundPage stays eager — it's tiny, and used as a catch-all 404 route;
// splitting it out adds a network round-trip for zero benefit.
import NotFoundPage from './pages/NotFoundPage';

// Lazy-loaded admin pages
const AdminLayout        = lazy(() => import('./components/admin/AdminLayout'));
const DashboardPage      = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsListPage   = lazy(() => import('./pages/admin/ProductsListPage'));
const AddProductPage     = lazy(() => import('./pages/admin/AddProductPage'));
const OrdersPage         = lazy(() => import('./pages/admin/OrdersPage'));
const UsersPage          = lazy(() => import('./pages/admin/UsersPage'));
const AnalyticsPage      = lazy(() => import('./pages/admin/AnalyticsPage'));
const SpaManagementPage  = lazy(() => import('./pages/admin/SpaManagementPage')); // Fix 3
const CouponsPage        = lazy(() => import('./pages/admin/CouponsPage'));
const ReviewsModerationPage = lazy(() => import('./pages/admin/ReviewsModerationPage'));
const SettingsPage       = lazy(() => import('./pages/admin/SettingsPage'));

// Global components
import { CartProvider } from './store/cartStore';
import { SpaProvider } from './store/spaStore';
import ClairesNavbar from './components/ClaireSkaNavbar';
import CartSidebar from './components/CartSidebar';
import AIChat from './components/AIChat';
import ToastContainer from './components/ToastContainer';
import PageTransition from './components/PageTransition';
import GlobalReveal from './components/GlobalReveal';
import Footer from './components/layout/Footer';

const AdminLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-stone-50">
    <div className="flex flex-col items-center gap-4">
      <span className="w-8 h-8 border-2 border-stone-200 border-t-primary rounded-full animate-spin" />
      <p className="text-xs uppercase tracking-widest text-stone-400">Loading...</p>
    </div>
  </div>
);

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const RouteWrapper = () => {
  const location   = useLocation();
  const isAdmin    = location.pathname.startsWith('/admin');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password' || location.pathname === '/reset-password';

  usePageTracking();

  return (
    <>
      <ScrollToTop />
      <GlobalReveal />
      {!isAdmin && !isAuthPage && <ClairesNavbar />}

      <PageTransition>
        <Suspense fallback={null}>
        <Routes>
          {/* Public */}
          <Route path="/"                element={<HomePage />} />
          <Route path="/shop"            element={<ShopPage />} />
          <Route path="/product/:id"     element={<ProductDetailPage />} />
          <Route path="/cart"            element={<CartPage />} />
          <Route path="/checkout"        element={<CheckoutPage />} />
          <Route path="/hair-care"       element={<HairCarePage />} />
          <Route path="/lip-care"        element={<LipCarePage />} />
          <Route path="/spa-services"    element={<SpaServicesPage />} />
          <Route path="/wishlist"        element={<WishlistPage />} />
          <Route path="/notifications"   element={<NotificationsPage />} />
          <Route path="/order-confirmed" element={<OrderConfirmedPage />} />

          {/* Auth */}
          <Route path="/login"            element={<LoginPage />} />
          <Route path="/register"         element={<RegisterPage />} />
          <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
          <Route path="/reset-password"   element={<ResetPasswordPage />} />

          {/* Protected admin */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <Suspense fallback={<AdminLoader />}>
                <AdminLayout />
              </Suspense>
            </ProtectedRoute>
          }>
            <Route index               element={<DashboardPage />} />
            <Route path="dashboard"    element={<DashboardPage />} />
            <Route path="products"     element={<ProductsListPage />} />
            <Route path="products/add" element={<AddProductPage />} />
            <Route path="orders"       element={<OrdersPage />} />
            <Route path="users"        element={<UsersPage />} />
            <Route path="coupons"      element={<CouponsPage />} />
            <Route path="reviews"      element={<ReviewsModerationPage />} />
            <Route path="analytics"    element={<AnalyticsPage />} />
            <Route path="spa"          element={<SpaManagementPage />} /> {/* Fix 3 */}
            <Route path="settings"     element={<SettingsPage />} />
          </Route>

          {/* Legacy redirect */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </PageTransition>

      {!isAdmin && !isAuthPage && (
        <>
          <CartSidebar />
          <AIChat />
          <Footer />
        </>
      )}
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ProductProvider>
            <SpaProvider>
              <CartProvider>
                <RouteWrapper />
              </CartProvider>
            </SpaProvider>
          </ProductProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
