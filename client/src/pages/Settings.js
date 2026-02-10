import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  Tabs,
  Tab,
  Paper,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Grid,
  Radio,
  RadioGroup,
  FormLabel,
  useTheme as useMuiTheme,
  useMediaQuery
} from '@mui/material';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import SaveIcon from '@mui/icons-material/Save';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import GoogleIcon from '@mui/icons-material/Google';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Layout from '../components/Layout';
import axios from 'axios';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Settings() {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(() => {
    return location.state?.activeTab !== undefined ? location.state.activeTab : 0;
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // User data
  const [userData, setUserData] = useState({
    id: '',
    name: '',
    email: '',
    nip: '',
    two_factor_enabled: false
  });

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Email change
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: ''
  });

  // Notification Preferences
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    system: true,
    login: true
  });

  // 2FA Setup
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    isSettingUp: false,
    secret: '',
    qrCode: '',
    token: '',
    password: '' // For disabling
  });

  // Activity Log
  const [activities, setActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all');

  // Google OAuth
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Product Preferences
  const [preferences, setPreferences] = useState({
    auto_publish_offers: false,
    scanner_enabled: true,
    scanner_type: 'advanced'
  });

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/preferences`);
      if (response.data.preferences) {
        setPreferences(prev => ({
            ...prev,
            ...response.data.preferences
        }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };


  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/me`);
      setUserData({
        id: response.data.user.id || '',
        name: response.data.user.name || '',
        email: response.data.user.email || '',
        nip: response.data.user.nip || '',
        two_factor_enabled: response.data.user.two_factor_enabled || false
      });
      
      // Parse notification preferences
      const userPrefs = response.data.user.notification_preferences;
      if (userPrefs) {
        const prefs = typeof userPrefs === 'string' ? JSON.parse(userPrefs) : userPrefs;
        setNotificationPreferences({
            email: prefs.email !== undefined ? prefs.email : true,
            system: prefs.system !== undefined ? prefs.system : true,
            login: prefs.login !== undefined ? prefs.login : true
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchActivities = useCallback(async (filter = null) => {
    try {
      const params = {};
      const filterToUse = filter !== null ? filter : activityFilter;
      if (filterToUse !== 'all') {
        params.type = filterToUse;
      }
      const response = await axios.get(`${API_URL}/user/activities`, {
        params
      });
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, [activityFilter]);

  // Separate function for fetching with specific filter (to avoid closure issues)
  const fetchActivitiesWithFilter = useCallback(async (filter) => {
    try {
      const params = {};
      if (filter && filter !== 'all') {
        params.type = filter;
      }
      const response = await axios.get(`${API_URL}/user/activities`, {
        params
      });
      setActivities(response.data.activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  }, []);

  const fetchGoogleStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/google/status`);
      setGoogleLinked(response.data.linked);
    } catch (error) {
      console.error('Error fetching Google status:', error);
    }
  };

  const handleGoogleLink = async (credentialResponse) => {
    setGoogleLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // We use the link endpoint differently here - since user is already logged in,
      // we can use a special "authenticated link" approach
      const response = await axios.post(
        `${API_URL}/auth/google/link-authenticated`,
        { credential: credentialResponse.credential }
      );
      setGoogleLinked(true);
      setMessage({ type: 'success', text: 'Konto Google zostało połączone' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Nie udało się połączyć konta Google' 
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleUnlink = async () => {
    setGoogleLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.post(
        `${API_URL}/auth/google/unlink`,
        {}
      );
      setGoogleLinked(false);
      setMessage({ type: 'success', text: 'Konto Google zostało odłączone' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Nie udało się odłączyć konta Google' 
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchPreferences();
    fetchGoogleStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 3) {
      // Only fetch when tab is opened, not when filter changes (filter changes are handled by onChange)
      fetchActivitiesWithFilter(activityFilter);
    }
  }, [activeTab, fetchActivitiesWithFilter]);

  useEffect(() => {
    if (location.state?.activeTab !== undefined) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  const handleSaveUserData = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    if (userData.nip && userData.nip.trim() !== '') {
      const nipDigits = userData.nip.replace(/\D/g, '');
      if (nipDigits.length !== 10) {
        setMessage({ type: 'error', text: 'NIP musi zawierać dokładnie 10 cyfr' });
        setLoading(false);
        return;
      }
    }
    
    try {
      
      // Save user profile
      const userResponse = await axios.put(
        `${API_URL}/user/profile`,
        userData
      );
      
      if (userResponse.data.user) {
        setUserData({
          ...userData,
          ...userResponse.data.user
        });
      }

      // Save preferences
      await axios.put(
        `${API_URL}/user/preferences`,
        preferences
      );
      await fetchPreferences();
      
      setMessage({ type: 'success', text: 'Dane i preferencje zostały zapisane' });
      await fetchUserData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas aktualizacji danych' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Hasła nie są identyczne' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Hasło musi mieć co najmniej 6 znaków' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(
        `${API_URL}/user/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }
      );
      setMessage({ type: 'success', text: 'Hasło zostało zmienione' });
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas zmiany hasła' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleChangeEmail = async () => {
    if (!emailData.newEmail || !emailData.password) {
      setMessage({ type: 'error', text: 'Wszystkie pola są wymagane' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(
        `${API_URL}/user/email`,
        {
          newEmail: emailData.newEmail,
          password: emailData.password
        }
      );
      setMessage({ type: 'success', text: 'Adres email został zmieniony' });
      setEmailData({ newEmail: '', password: '' });
      fetchUserData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas zmiany emaila' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await axios.put(
        `${API_URL}/user/notifications`,
        { notifications: notificationPreferences }
      );
      setMessage({ type: 'success', text: 'Ustawienia powiadomień zostały zapisane' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas zapisywania powiadomień' });
    } finally {
      setLoading(false);
    }
  };

  const handleStart2FASetup = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/user/2fa/setup`,
        {}
      );
      setTwoFactorSetup({
        isSettingUp: true,
        secret: response.data.secret,
        qrCode: response.data.qrCode,
        token: '',
        password: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Błąd podczas inicjalizacji 2FA' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/user/2fa/verify`,
        {
          token: twoFactorSetup.token,
          secret: twoFactorSetup.secret
        }
      );
      setMessage({ type: 'success', text: 'Weryfikacja dwuetapowa została włączona' });
      setTwoFactorSetup({
        isSettingUp: false,
        secret: '',
        qrCode: '',
        token: '',
        password: ''
      });
      fetchUserData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Nieprawidłowy kod weryfikacyjny' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorSetup.password) {
      setMessage({ type: 'error', text: 'Podaj hasło, aby wyłączyć 2FA' });
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/user/2fa/disable`,
        {
          password: twoFactorSetup.password,
          token: twoFactorSetup.token // Optional: can require current OTP for extra security
        }
      );
      setMessage({ type: 'success', text: 'Weryfikacja dwuetapowa została wyłączona' });
      setTwoFactorSetup({ ...twoFactorSetup, password: '' });
      fetchUserData();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas wyłączania 2FA' });
    } finally {
      setLoading(false);
    }
  };

  const getActivityLabel = (type) => {
    const map = {
      'login': 'Logowanie',
      'login_2fa': 'Logowanie (2FA)',
      'login_google': 'Logowanie przez Google',
      'login_oauth': 'Logowanie przez social media',
      'login_failed': 'Nieudane logowanie',
      'login_2fa_failed': 'Nieudana weryfikacja 2FA',
      'register': 'Rejestracja konta',
      'profile_update': 'Aktualizacja profilu',
      'password_change': 'Zmiana hasła',
      'password_change_failed': 'Nieudana zmiana hasła',
      'email_change': 'Zmiana adresu email',
      'email_change_failed': 'Nieudana zmiana emaila',
      '2fa_enabled': 'Włączono weryfikację dwuetapową',
      '2fa_disabled': 'Wyłączono weryfikację dwuetapową',
      'register_google': 'Rejestracja przez Google',
      'google_linked': 'Połączono konto Google',
      'google_unlinked': 'Odłączono konto Google',
      'google_link_failed': 'Nieudane łączenie konta Google',
      'referral_bonus': 'Bonus za polecenie',
      'settings_update': 'Aktualizacja ustawień',
      'integration_update': 'Aktualizacja integracji'
    };
    return map[type] || type;
  };

  return (
    <Layout title="Ustawienia" maxWidth="md">
      {message.text && (
        <Alert severity={message.type} sx={{ mb: 3, fontSize: isMobile ? '0.875rem' : '0.9375rem' }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)} 
          variant={isMobile ? 'scrollable' : 'fullWidth'} 
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: isMobile ? 48 : 72,
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              padding: isMobile ? '12px 8px' : '12px 16px'
            }
          }}
        >
          <Tab label={isMobile ? "Dane" : "Moje dane"} />
          <Tab 
            label={isMobile ? "Bezpieczeństwo" : "Bezpieczeństwo"} 
            icon={!isMobile ? <SecurityIcon /> : null} 
            iconPosition="start" 
          />
          <Tab 
            label={isMobile ? "Powiadomienia" : "Powiadomienia"} 
            icon={!isMobile ? <NotificationsIcon /> : null} 
            iconPosition="start" 
          />
          <Tab 
            label={isMobile ? "Historia" : "Historia aktywności"} 
            icon={!isMobile ? <HistoryIcon /> : null} 
            iconPosition="start" 
          />
        </Tabs>
      </Paper>

      {/* Tab 0: User Data */}
          {activeTab === 0 && (
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
                  Moje dane
                </Typography>
                <Divider sx={{ my: 2 }} />
                <TextField
                  fullWidth
                  label="ID klienta"
                  value={userData.id}
                  margin="normal"
                  disabled
                  size={isMobile ? 'small' : 'medium'}
                  InputProps={{
                    readOnly: true,
                  }}
                />
                <TextField
                  fullWidth
                  label="Imię i nazwisko"
                  value={userData.name}
                  onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  margin="normal"
                  size={isMobile ? 'small' : 'medium'}
                />
                <TextField
                  fullWidth
                  label="Email"
                  value={userData.email}
                  margin="normal"
                  disabled
                  size={isMobile ? 'small' : 'medium'}
                  helperText="Zmiana adresu email dostępna w zakładce Bezpieczeństwo"
                />
                <TextField
                  fullWidth
                  label="NIP firmy"
                  value={userData.nip}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
                    if (value.length <= 10) {
                      setUserData({ ...userData, nip: value });
                    }
                  }}
                  margin="normal"
                  inputProps={{ maxLength: 10 }}
                  size={isMobile ? 'small' : 'medium'}
                  helperText={userData.nip && userData.nip.length > 0 && userData.nip.length !== 10 ? "NIP musi zawierać dokładnie 10 cyfr" : "10 cyfr (opcjonalne)"}
                  error={userData.nip && userData.nip.length > 0 && userData.nip.length !== 10}
                />
                <Divider sx={{ my: 3 }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                  Wygląd
                </Typography>
                <Box sx={{ mt: 2, mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={(e) => toggleDarkMode(e.target.checked)}
                        color="primary"
                        size={isMobile ? 'small' : 'medium'}
                      />
                    }
                    label="Tryb ciemny"
                    sx={{ mb: isMobile ? 1 : 0 }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, ml: isMobile ? 0 : 6, pl: isMobile ? 4 : 0, pr: isMobile ? 1 : 0 }}>
                    Przełącz między jasnym a ciemnym motywem interfejsu
                  </Typography>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                  Automatyzacja
                </Typography>
                <Box sx={{ mt: 2, mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences.auto_publish_offers}
                        onChange={(e) => setPreferences({ ...preferences, auto_publish_offers: e.target.checked })}
                        color="primary"
                        size={isMobile ? 'small' : 'medium'}
                      />
                    }
                    label="Automatyczne wystawianie ofert"
                    sx={{ mb: isMobile ? 1 : 0 }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1, ml: isMobile ? 0 : 6, pl: isMobile ? 4 : 0, pr: isMobile ? 1 : 0, wordBreak: 'break-word' }}>
                    Jeśli włączone, po utworzeniu produktu zostanie on automatycznie wystawiony na zintegrowanych marketplace (Allegro itp.).
                  </Typography>
                </Box>
                <Box sx={{ mt: 2, mb: 3 }}>
                  <FormControl component="fieldset" fullWidth>
                    <FormLabel component="legend" sx={{ mb: 1, color: 'text.primary', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: 500 }}>Skaner kodów kreskowych</FormLabel>
                    <RadioGroup
                      aria-label="scanner-type"
                      name="scanner-type"
                      value={preferences.scanner_type || (preferences.scanner_enabled !== false ? 'advanced' : 'none')}
                      onChange={(e) => {
                        const type = e.target.value;
                        setPreferences({ 
                          ...preferences, 
                          scanner_type: type,
                          scanner_enabled: type !== 'none'
                        });
                      }}
                    >
                      <FormControlLabel 
                        value="keyboard" 
                        control={<Radio size={isMobile ? 'small' : 'medium'} />} 
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 500 }}>Skaner klawiaturowy (Prosty)</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                              Działa w tle, nasłuchuje szybkiego wpisywania (np. czytnik USB). Nie wyświetla przycisku kamery.
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 1, alignItems: 'flex-start' }}
                      />
                      <FormControlLabel 
                        value="advanced" 
                        control={<Radio size={isMobile ? 'small' : 'medium'} />} 
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 500 }}>Skaner zaawansowany (Kamera + Klawiatura)</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                              Pozwala używać kamery urządzenia do skanowania ORAZ czytnika klawiaturowego.
                            </Typography>
                          </Box>
                        }
                        sx={{ mb: 1, alignItems: 'flex-start' }}
                      />
                      <FormControlLabel 
                        value="none" 
                        control={<Radio size={isMobile ? 'small' : 'medium'} />} 
                        label={
                          <Box>
                            <Typography variant="body1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem', fontWeight: 500 }}>Wyłączony</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.85rem' }}>
                              Wyłącz wszystkie funkcje skanowania.
                            </Typography>
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start' }}
                      />
                    </RadioGroup>
                  </FormControl>
                </Box>
                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveUserData}
                    disabled={loading}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                  >
                    Zapisz zmiany
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Tab 1: Security (Password, Email, 2FA) */}
          {activeTab === 1 && (
            <Box>
              {/* Password Change */}
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                    Zmiana hasła
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      type="password"
                      label="Obecne hasło"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      margin="normal"
                      size={isMobile ? 'small' : 'medium'}
                    />
                    <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Nowe hasło"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        margin="normal"
                        size={isMobile ? 'small' : 'medium'}
                      />
                      <TextField
                        fullWidth
                        type="password"
                        label="Potwierdź nowe hasło"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        margin="normal"
                        size={isMobile ? 'small' : 'medium'}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleChangePassword}
                      disabled={loading}
                      fullWidth={isMobile}
                      size={isMobile ? 'large' : 'medium'}
                    >
                      Zmień hasło
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Email Change */}
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                    Zmiana adresu email
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body2" color="textSecondary" paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                    Obecny email: <strong>{userData.email}</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="Nowy adres email"
                      value={emailData.newEmail}
                      onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                      margin="normal"
                      size={isMobile ? 'small' : 'medium'}
                    />
                    <TextField
                      fullWidth
                      type="password"
                      label="Twoje hasło (do potwierdzenia)"
                      value={emailData.password}
                      onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                      margin="normal"
                      size={isMobile ? 'small' : 'medium'}
                    />
                  </Box>
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      onClick={handleChangeEmail}
                      disabled={loading}
                      fullWidth={isMobile}
                      size={isMobile ? 'large' : 'medium'}
                    >
                      Zmień email
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* Google OAuth */}
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    mb: 1,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 1 : 0
                  }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <GoogleIcon sx={{ color: '#4285f4', fontSize: isMobile ? '1.2rem' : '1.5rem' }} />
                      Konto Google
                    </Typography>
                    {googleLinked && (
                      <Chip label="Połączone" color="success" size={isMobile ? 'small' : 'medium'} icon={<LinkIcon />} sx={{ mt: isMobile ? 0.5 : 0 }} />
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  
                  {googleLinked ? (
                    <Box>
                      <Typography paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem', mb: 2 }}>
                        Twoje konto jest połączone z Google. Możesz logować się jednym kliknięciem.
                      </Typography>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={googleLoading ? <CircularProgress size={16} /> : <LinkOffIcon />}
                        onClick={handleGoogleUnlink}
                        disabled={googleLoading}
                        fullWidth={isMobile}
                        size={isMobile ? 'large' : 'medium'}
                      >
                        Odłącz konto Google
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <Typography paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem', mb: 2 }}>
                        Połącz swoje konto z Google, aby logować się jednym kliknięciem bez podawania hasła.
                      </Typography>
                      {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
                        <Box sx={{ display: 'flex', justifyContent: isMobile ? 'center' : 'flex-start', mt: 2 }}>
                          <GoogleLogin
                            onSuccess={handleGoogleLink}
                            onError={() => setMessage({ type: 'error', text: 'Nie udało się połączyć z Google' })}
                            text="signin_with"
                            shape="rectangular"
                            locale="pl"
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                          Google OAuth nie jest skonfigurowane
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* 2FA */}
              <Card>
                <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'flex-start' : 'center', 
                    mb: 1,
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: isMobile ? 1 : 0
                  }}>
                    <Typography variant={isMobile ? "subtitle1" : "h6"}>
                      Weryfikacja dwuetapowa (2FA)
                    </Typography>
                    {userData.two_factor_enabled && (
                      <Chip label="Aktywne" color="success" size={isMobile ? 'small' : 'medium'} sx={{ mt: isMobile ? 0.5 : 0 }} />
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  
                  {!userData.two_factor_enabled ? (
                    <>
                      {!twoFactorSetup.isSettingUp ? (
                        <Box>
                          <Typography paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem', mb: 2 }}>
                            Zabezpiecz swoje konto dodatkową warstwą ochrony. Po włączeniu 2FA, przy logowaniu będziesz musiał podać kod z aplikacji uwierzytelniającej (np. Google Authenticator).
                          </Typography>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleStart2FASetup}
                            disabled={loading}
                            fullWidth={isMobile}
                            size={isMobile ? 'large' : 'medium'}
                            sx={{ mt: 2 }}
                          >
                            Rozpocznij konfigurację 2FA
                          </Button>
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant={isMobile ? "body1" : "subtitle1"} gutterBottom fontWeight="bold">
                            Krok 1: Zeskanuj kod QR
                          </Typography>
                          <Typography variant="body2" paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                            Zeskanuj poniższy kod QR w swojej aplikacji uwierzytelniającej (np. Google Authenticator, Authy).
                          </Typography>
                          
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3, px: isMobile ? 1 : 0 }}>
                            {twoFactorSetup.qrCode ? (
                              <img 
                                src={twoFactorSetup.qrCode} 
                                alt="QR Code" 
                                style={{ 
                                  border: '1px solid #ddd', 
                                  padding: isMobile ? '8px' : '10px', 
                                  borderRadius: '4px',
                                  maxWidth: isMobile ? '250px' : '300px',
                                  width: '100%',
                                  height: 'auto'
                                }} 
                              />
                            ) : (
                              <CircularProgress />
                            )}
                            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', wordBreak: 'break-word', textAlign: 'center', px: 2, fontSize: isMobile ? '0.7rem' : '0.75rem' }}>
                              Kod sekretny: {twoFactorSetup.secret}
                            </Typography>
                          </Box>

                          <Typography variant={isMobile ? "body1" : "subtitle1"} gutterBottom fontWeight="bold" sx={{ mt: 3 }}>
                            Krok 2: Wpisz kod z aplikacji
                          </Typography>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: 2, 
                            alignItems: isMobile ? 'stretch' : 'flex-start' 
                          }}>
                            <TextField
                              label="Kod 6-cyfrowy"
                              value={twoFactorSetup.token}
                              onChange={(e) => setTwoFactorSetup({ ...twoFactorSetup, token: e.target.value })}
                              size={isMobile ? 'medium' : 'small'}
                              fullWidth={isMobile}
                            />
                            <Button
                              variant="contained"
                              onClick={handleVerify2FA}
                              disabled={loading || !twoFactorSetup.token}
                              fullWidth={isMobile}
                              size={isMobile ? 'large' : 'medium'}
                            >
                              Włącz 2FA
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={() => setTwoFactorSetup({ isSettingUp: false, secret: '', qrCode: '', token: '', password: '' })}
                              fullWidth={isMobile}
                              size={isMobile ? 'large' : 'medium'}
                            >
                              Anuluj
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box>
                      <Typography paragraph sx={{ wordBreak: 'break-word', fontSize: isMobile ? '0.875rem' : '0.9375rem', mb: 2 }}>
                        Weryfikacja dwuetapowa jest włączona. Twoje konto jest chronione.
                      </Typography>
                      <Typography variant="body2" gutterBottom sx={{ fontSize: isMobile ? '0.875rem' : '0.9375rem' }}>
                        Aby wyłączyć 2FA, podaj swoje hasło:
                      </Typography>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: 2, 
                        alignItems: isMobile ? 'stretch' : 'flex-start', 
                        mt: 2 
                      }}>
                        <TextField
                          type="password"
                          label="Twoje hasło"
                          value={twoFactorSetup.password}
                          onChange={(e) => setTwoFactorSetup({ ...twoFactorSetup, password: e.target.value })}
                          size={isMobile ? 'medium' : 'small'}
                          fullWidth={isMobile}
                        />
                        <Button
                          variant="contained"
                          color="error"
                          onClick={handleDisable2FA}
                          disabled={loading || !twoFactorSetup.password}
                          fullWidth={isMobile}
                          size={isMobile ? 'large' : 'medium'}
                        >
                          Wyłącz 2FA
                        </Button>
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          {/* Tab 2: Notifications */}
          {activeTab === 2 && (
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                  Ustawienia powiadomień
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                {Number(userData.id) === 1 && (
                  <>
                    <Typography variant={isMobile ? "body1" : "subtitle1"} gutterBottom fontWeight="bold">
                      Kanały powiadomień
                    </Typography>
                    <Box sx={{ mb: 3 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={notificationPreferences.system}
                            onChange={(e) => setNotificationPreferences({ ...notificationPreferences, system: e.target.checked })}
                            color="primary"
                            size={isMobile ? 'small' : 'medium'}
                          />
                        }
                        label="Powiadomienia systemowe (Linux/Server)"
                        sx={{ mb: isMobile ? 1 : 0 }}
                      />
                      <Typography variant="body2" color="textSecondary" sx={{ ml: isMobile ? 4 : 4, pl: isMobile ? 0 : 0, pr: isMobile ? 1 : 0, wordBreak: 'break-word', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                        Otrzymuj powiadomienia systemowe na serwerze (np. dzwonek, popup)
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                  </>
                )}
                
                <Typography variant={isMobile ? "body1" : "subtitle1"} gutterBottom fontWeight="bold">
                  Zdarzenia
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationPreferences.login}
                        onChange={(e) => setNotificationPreferences({ ...notificationPreferences, login: e.target.checked })}
                        color="primary"
                        size={isMobile ? 'small' : 'medium'}
                      />
                    }
                    label="Nowe logowanie"
                    sx={{ mb: isMobile ? 1 : 0 }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ ml: isMobile ? 4 : 4, pl: isMobile ? 0 : 0, pr: isMobile ? 1 : 0, mb: 2, wordBreak: 'break-word', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                    Powiadom mnie, gdy ktoś zaloguje się na moje konto
                  </Typography>
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveNotificationPreferences}
                    disabled={loading}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                  >
                    Zapisz ustawienia powiadomień
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}


          {/* Tab 3: Activity History */}
          {activeTab === 3 && (
            <Card>
              <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: isMobile ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isMobile ? 'stretch' : 'center', 
                  mb: 2,
                  gap: isMobile ? 2 : 0,
                  px: isMobile ? 0 : 0
                }}>
                  <Typography variant={isMobile ? "h6" : "h6"} sx={{ mb: isMobile ? 0 : 0, fontWeight: 600 }}>
                    Historia aktywności
                  </Typography>
                  <FormControl size={isMobile ? 'medium' : 'small'} sx={{ minWidth: isMobile ? '100%' : 200 }} fullWidth={isMobile}>
                    <InputLabel>Filtruj po typie</InputLabel>
                    <Select
                      value={activityFilter}
                      label="Filtruj po typie"
                      onChange={(e) => {
                        const newFilter = e.target.value;
                        setActivityFilter(newFilter);
                        // Immediately fetch with new filter
                        fetchActivitiesWithFilter(newFilter);
                      }}
                      fullWidth={isMobile}
                    >
                      <MenuItem value="all">Wszystkie</MenuItem>
                      <MenuItem value="login">Logowanie</MenuItem>
                      <MenuItem value="login_failed">Nieudane logowanie</MenuItem>
                      <MenuItem value="password_change">Zmiana hasła</MenuItem>
                      <MenuItem value="settings_update">Aktualizacja ustawień</MenuItem>
                      <MenuItem value="integration_update">Aktualizacja integracji</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3, px: isMobile ? 0 : 0, fontSize: isMobile ? '0.875rem' : '0.875rem' }}>
                  Ostatnie 200 aktywności na Twoim koncie.
                </Typography>
                <Divider sx={{ mb: isMobile ? 2 : 2 }} />
                
                {isMobile ? (
                  // Mobile: Card-based layout
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {activities.length > 0 ? (
                      activities.map((activity) => (
                        <Card 
                          key={activity.id}
                          variant="outlined"
                          sx={{ 
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: 2,
                              transform: 'translateY(-1px)'
                            }
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <Chip 
                                  label={getActivityLabel(activity.type)} 
                                  size="small" 
                                  color={activity.type.includes('failed') ? 'error' : activity.type.includes('login') ? 'primary' : 'default'} 
                                  variant="filled"
                                  sx={{ 
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    height: 28
                                  }}
                                />
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                  }}
                                >
                                  {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                                </Typography>
                              </Box>
                              
                              {activity.ip && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      fontSize: '0.75rem',
                                      fontWeight: 500
                                    }}
                                  >
                                    IP:
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.primary',
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace'
                                    }}
                                  >
                                    {activity.ip}
                                  </Typography>
                                </Box>
                              )}
                              
                              {activity.user_agent && (
                                <Box sx={{ 
                                  mt: activity.ip ? 0 : -0.5,
                                  pt: activity.ip ? 1 : 0,
                                  borderTop: activity.ip ? '1px solid' : 'none',
                                  borderColor: 'divider'
                                }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      display: 'block',
                                      mb: 0.5
                                    }}
                                  >
                                    Przeglądarka:
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.primary',
                                      fontSize: '0.75rem',
                                      wordBreak: 'break-word',
                                      display: 'block',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {activity.user_agent}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 4,
                        px: 2
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          Brak aktywności do wyświetlenia
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  // Desktop: Table layout
                  <TableContainer sx={{ overflowX: 'auto', mt: 2, maxWidth: '100%' }}>
                    <Table size="medium">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 120, fontSize: '0.875rem', fontWeight: 600 }}>Data</TableCell>
                          <TableCell sx={{ minWidth: 150, fontSize: '0.875rem', fontWeight: 600 }}>Aktywność</TableCell>
                          <TableCell sx={{ minWidth: 120, fontSize: '0.875rem', fontWeight: 600 }}>IP</TableCell>
                          <TableCell sx={{ minWidth: 200, fontSize: '0.875rem', fontWeight: 600 }}>Przeglądarka</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {activities.length > 0 ? (
                          activities.map((activity) => (
                            <TableRow key={activity.id} hover>
                              <TableCell sx={{ fontSize: '0.875rem' }}>
                                {format(new Date(activity.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                              </TableCell>
                              <TableCell sx={{ fontSize: '0.875rem' }}>
                                <Chip 
                                  label={getActivityLabel(activity.type)} 
                                  size="small" 
                                  color={activity.type.includes('failed') ? 'error' : activity.type.includes('login') ? 'primary' : 'default'} 
                                  variant="outlined"
                                  sx={{ fontSize: '0.75rem' }}
                                />
                              </TableCell>
                              <TableCell sx={{ wordBreak: 'break-word', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                                {activity.ip}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ 
                                  display: 'block',
                                  wordBreak: 'break-word',
                                  fontSize: '0.875rem'
                                }}>
                                  {activity.user_agent || 'Brak'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} align="center" sx={{ py: 3, fontSize: '0.9375rem' }}>
                              Brak aktywności do wyświetlenia
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}

    </Layout>
  );
}

export default Settings;
