import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
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
import MakeMoreMoney from './pages/MakeMoreMoney'; // 🆕 NEW IMPORT
import Messaging from './pages/Messaging';
import Messages from './pages/Messages';
import Reviews from './pages/Reviews';
import ManageAvailability from './pages/ManageAvailability';
// Import legal pages
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import CookiePolicy from './pages/CookiePolicy';
import ContactHelp from './pages/ContactHelp';

function App() {
  return (
    <AuthProvider>
      <Router>
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
              
              <Route
                path="/active-jobs"
                element={
                  <ProtectedRoute>
                    <ActiveJobs />
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
      </Router>
    </AuthProvider>
  );
}

export default App;
