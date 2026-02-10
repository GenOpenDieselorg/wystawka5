import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import ProductWizard from './pages/ProductWizard';
import Settings from './pages/Settings';
import Integrations from './pages/Integrations';
import Wallet from './pages/Wallet';
import Analytics from './pages/Analytics';
import FAQ from './pages/FAQ';
import LandingPage from './pages/LandingPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import MarketplaceList from './pages/MarketplaceList';
import AiTemplates from './pages/AiTemplates';
import AllegroBulkEdit from './pages/AllegroBulkEdit';
import Gallery from './pages/Gallery';
import Warehouse from './pages/Warehouse';
import HowItWorks30Sec from './pages/HowItWorks30Sec';
import AllegroLegal from './pages/AllegroLegal';
import Calculator from './pages/Calculator';
import Examples from './pages/Examples';
import Reviews from './pages/Reviews';
import Informacje from './pages/Informacje';
import Przewodnik from './pages/Przewodnik';
import Wsparcie from './pages/Wsparcie';
import Blog from './pages/Blog';
import Partnerzy from './pages/Partnerzy';
import Logs from './pages/Logs';
import WalletLogs from './pages/WalletLogs';
import JobProgress from './components/JobProgress';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';

const getTheme = (darkMode) => createTheme({
  palette: {
    mode: darkMode ? 'dark' : 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: darkMode ? '#121212' : '#f5f5f5',
      paper: darkMode ? '#1e1e1e' : '#ffffff',
    },
  },
});

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const { darkMode } = useTheme();
  const theme = getTheme(darkMode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <JobProgress />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/product/wizard"
            element={
              <PrivateRoute>
                <ProductWizard />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
          <Route
            path="/integrations"
            element={
              <PrivateRoute>
                <Integrations />
              </PrivateRoute>
            }
          />
          <Route
            path="/integrations/allegro/callback"
            element={
              <PrivateRoute>
                <Integrations />
              </PrivateRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <PrivateRoute>
                <Wallet />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/cennik" element={<LandingPage />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/marketplaces" element={<MarketplaceList />} />
          <Route path="/jak-w-30-sekund" element={<HowItWorks30Sec />} />
          <Route path="/allegro-legalne" element={<AllegroLegal />} />
          <Route path="/kalkulator" element={<Calculator />} />
          <Route path="/przyklady" element={<Examples />} />
          <Route path="/opinie" element={<Reviews />} />
          <Route path="/informacje" element={<Informacje />} />
          <Route path="/przewodnik" element={<Przewodnik />} />
          <Route path="/wsparcie" element={<Wsparcie />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/partnerzy" element={<Partnerzy />} />
          <Route
            path="/ai-templates"
            element={
              <PrivateRoute>
                <AiTemplates />
              </PrivateRoute>
            }
          />
          <Route
            path="/allegro-bulk-edit"
            element={
              <PrivateRoute>
                <AllegroBulkEdit />
              </PrivateRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <PrivateRoute>
                <Gallery />
              </PrivateRoute>
            }
          />
          <Route
            path="/warehouse"
            element={
              <PrivateRoute>
                <Warehouse />
              </PrivateRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <PrivateRoute>
                <Logs />
              </PrivateRoute>
            }
          />
          <Route
            path="/logs/wallet"
            element={
              <PrivateRoute>
                <WalletLogs />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </Router>
    </MuiThemeProvider>
  );
};

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// Debug: sprawdź czy zmienna jest załadowana
console.log('App.js - GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
console.log('App.js - REACT_APP_GOOGLE_CLIENT_ID from env:', process.env.REACT_APP_GOOGLE_CLIENT_ID);

function App() {
  const content = (
    <HelmetProvider>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </HelmetProvider>
  );

  // Wrap with Google OAuth provider only if client ID is configured
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}

export default App;

