import React, { Component, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PageViewTracker from './components/PageViewTracker';
import { trackPageView } from './utils/trafficTracker';
// Import all your pages
import Home from './pages/Home';
import Login from './pages/Login';
import TradesmanRegister from './pages/TradesmanRegister';
import CustomerRegister from './pages/CustomerRegister';
import TradesmanDashboard from './pages/TradesmanDashboard';
import TradesmanPublicProfile from './pages/TradesmanPublicProfile';
import CustomerDashboard from './pages/CustomerDashboard';
import BrowseTradesmen from './pages/BrowseTradesmen';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingRequest from './pages/BookingRequest';
// 🆕 NEW IMPORTS - Bulletproof Architecture
import QuoteRequests from './pages/QuoteRequests';
import ActiveJobs from './pages/ActiveJobs';
import WeeklyJobs from './pages/WeeklyJobs';
import MakeMoreMoney from './pages/MakeMoreMoney';
import Messaging from './pages/Messaging';
import Messages from './pages/Messages';
import Reviews from './pages/Reviews';
import ManageAvailability from './pages/ManageAvailability';
// 🆕 NEW IMPORTS - Payment System
import PaymentCheckout from './pages/PaymentCheckout';
import PaymentSuccess from './pages/PaymentSuccess';
import TradesmanOnboarding from './pages/TradesmanOnboarding';
import EarningsOverview from './pages/EarningsOverview';
import TopEarners from './pages/TopEarners';
import TopPerformers from './pages/TopPerformers';
// 🆕 NEW IMPORTS - Password Reset System
import ForgotPassword from './pages/ForgotPassword';
import ResetConfirmation from './pages/ResetConfirmation';
// 🆕 NEW IMPORTS - How It Works Pages
import CustomerHowItWorks from './pages/CustomerHowItWorks';
import TradesmanHowItWorks from './pages/TradesmanHowItWorks';
// Import legal pages
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import ContactHelp from './pages/ContactHelp';
// 🆕 NEW IMPORTS - Admin Dashboards
import AdminDashboard from './pages/AdminDashboard';
import AdminAnalytics from './pages/AdminAnalytics';
import TradesmanAnalytics from './components/TradesmanAnalytics';

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.314 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition duration-200"
              >
                Go to Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-red-50 rounded-md">
                <summary className="cursor-pointer text-sm font-medium text-red-800">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto">
                  {this.state.error && this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);

  return (
    <>
      <PageViewTracker />
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register-tradesman" element={<TradesmanRegister />} />
            <Route path="/register-customer" element={<CustomerRegister />} />
            <Route path="/browse" element={<BrowseTradesmen />} />
            <Route path="/tradesman/:tradesmanId" element={<TradesmanPublicProfile />} />
            
            {/* 🆕 ADMIN ROUTES - Password Protected */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin-analytics" element={<AdminAnalytics />} />
            <Route path="/analytics/:tradesmanId" element={<TradesmanAnalytics />} />
            
            {/* 🆕 NEW ROUTES - Password Reset System (Public Routes) */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-confirmation" element={<ResetConfirmation />} />
            
            {/* 🆕 NEW ROUTES - How It Works Pages (User-Type Restricted) */}
            <Route
              path="/customer-how-it-works"
              element={
                <ProtectedRoute userType="customer">
                  <CustomerHowItWorks />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/tradesman-how-it-works"
              element={
                <ProtectedRoute userType="tradesman">
                  <TradesmanHowItWorks />
                </ProtectedRoute>
              }
            />
            
            {/* Legal & Information Pages - Public Access */}
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/contact" element={<ContactHelp />} />
            
            <Route
              path="/tradesman-dashboard"
              element={
                <ProtectedRoute userType="tradesman">
                  <TradesmanDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-availability"
              element={
                <ProtectedRoute userType="tradesman">
                  <ManageAvailability />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTE: Make More Money - Tradesman Only */}
            <Route
              path="/make-more-money"
              element={
                <ProtectedRoute userType="tradesman">
                  <MakeMoreMoney />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTES: Payment System */}
            <Route
              path="/payment-checkout"
              element={
                <ProtectedRoute userType="customer">
                  <PaymentCheckout />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute userType="customer">
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/tradesman-onboarding"
              element={
                <ProtectedRoute userType="tradesman">
                  <TradesmanOnboarding />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/earnings-overview"
              element={
                <ProtectedRoute userType="tradesman">
                  <EarningsOverview />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/customer-dashboard"
              element={
                <ProtectedRoute userType="customer">
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/booking-request/:tradesmanId?"
              element={
                <ProtectedRoute userType="customer">
                  <BookingRequest />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTES - Bulletproof Architecture */}
            <Route
              path="/quote-requests"
              element={
                <ProtectedRoute>
                  <QuoteRequests />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTE: Weekly Jobs - Available to both customers and tradesmen */}
            <Route
              path="/weekly-jobs"
              element={
                <ProtectedRoute>
                  <WeeklyJobs />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/active-jobs"
              element={
                <ProtectedRoute>
                  <ActiveJobs />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTE: Top Earners - Available to all users */}
            <Route
              path="/top-earners"
              element={
                <ProtectedRoute>
                  <TopEarners />
                </ProtectedRoute>
              }
            />
            
            {/* 🆕 NEW ROUTE: Top Performers - Customer-facing version */}
            <Route
              path="/top-performers"
              element={
                <ProtectedRoute>
                  <TopPerformers />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/booking-confirmation"
              element={
                <ProtectedRoute userType="customer">
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/messaging/:bookingId"
              element={
                <ProtectedRoute>
                  <Messaging />
                </ProtectedRoute>
              }
            />
            
            <Route path="/reviews/:tradesmanId" element={<Reviews />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default App;
