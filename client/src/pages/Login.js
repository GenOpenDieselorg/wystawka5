import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import Turnstile from 'react-turnstile';
import { useAuth } from '../context/AuthContext';
import SecurityIcon from '@mui/icons-material/Security';
import GoogleIcon from '@mui/icons-material/Google';
import PublicLayout from '../components/PublicLayout';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const TURNSTILE_SITE_KEY = process.env.REACT_APP_CLOUDFLARE_TURNSTILE_SITE_KEY;

// Debug: sprawdź czy zmienna jest załadowana
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
console.log('REACT_APP_GOOGLE_CLIENT_ID from env:', process.env.REACT_APP_GOOGLE_CLIENT_ID);

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [turnstileKey, setTurnstileKey] = useState(0);
  
  // Google linking dialog
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkCredential, setLinkCredential] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  
  const { login, googleLogin, googleLink, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [resendStatus, setResendStatus] = useState('idle');
  const [resendMessage, setResendMessage] = useState('');

  const handleResendVerification = async () => {
    setResendStatus('loading');
    const result = await resendVerification(email);
    if (result.success) {
      setResendStatus('success');
      setResendMessage(result.message);
    } else {
      setResendStatus('error');
      setResendMessage(result.error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password, twoFactorCode, turnstileToken);
      if (result.success) {
        // Reset licznika nieudanych prób po udanym logowaniu
        setFailedAttempts(0);
        navigate('/dashboard');
      } else {
        if (result.requires2FA) {
          setShow2FA(true);
          setTurnstileToken('');
          setTurnstileKey(prev => prev + 1);
        } else {
          setError(result.error);
          setTurnstileToken('');
          setTurnstileKey(prev => prev + 1); // Force new widget on any error as token is one-time use
          
          // Zwiększ licznik nieudanych prób
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          // Po 5 nieudanych próbach zresetuj licznik
          if (newFailedAttempts >= 5) {
            setFailedAttempts(0);
            setError('Zbyt wiele nieudanych prób logowania. Odczekaj chwilę i spróbuj ponownie.');
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setIsLoading(true);
    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requires_linking) {
        // Account exists - show linking dialog
        setLinkCredential(credentialResponse.credential);
        setLinkEmail(result.email);
        setLinkError('');
        setLinkPassword('');
        setLinkDialog(true);
      } else {
        setError(result.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    setError('Logowanie przez Google nie powiodło się');
  };

  const handleLinkAccounts = async () => {
    if (!linkPassword) {
      setLinkError('Podaj hasło');
      return;
    }
    setLinkLoading(true);
    setLinkError('');
    try {
      const result = await googleLink(linkCredential, linkEmail, linkPassword);
      if (result.success) {
        setLinkDialog(false);
        navigate('/dashboard');
      } else {
        setLinkError(result.error);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <PublicLayout>
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Zaloguj się
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
              {error && (error.includes('Proszę potwierdzić adres email') || error.includes('Prosz')) && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={handleResendVerification}
                    disabled={resendStatus === 'loading' || resendStatus === 'success'}
                  >
                    {resendStatus === 'loading' ? 'Wysyłanie...' : 'Wyślij email ponownie'}
                  </Button>
                  {resendMessage && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {resendMessage}
                    </Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}

          {show2FA && (
            <Alert severity="info" icon={<SecurityIcon />} sx={{ mt: 2, mb: 2 }}>
              Wprowadź kod z aplikacji uwierzytelniającej, aby się zalogować.
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            {!show2FA ? (
              <>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Reset licznika nieudanych prób przy zmianie emaila
                    setFailedAttempts(0);
                  }}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Hasło"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  margin="normal"
                />
                <Box sx={{ textAlign: 'right', mt: 1 }}>
                  <Link to="/forgot-password" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>
                    Nie pamiętasz hasła?
                  </Link>
                </Box>
                
                {TURNSTILE_SITE_KEY && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Turnstile
                      key={turnstileKey}
                      sitekey={TURNSTILE_SITE_KEY}
                      onVerify={(token) => setTurnstileToken(token)}
                    />
                  </Box>
                )}
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Kod 2FA (6 cyfr)"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  margin="normal"
                  autoFocus
                  inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                />
                {TURNSTILE_SITE_KEY && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Turnstile
                      key={turnstileKey}
                      sitekey={TURNSTILE_SITE_KEY}
                      onVerify={(token) => setTurnstileToken(token)}
                    />
                  </Box>
                )}
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ mt: 3, mb: 2 }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: 'inherit' }} />
                  {show2FA ? 'Weryfikowanie...' : 'Logowanie...'}
                </>
              ) : (
                show2FA ? 'Zweryfikuj' : 'Zaloguj się'
              )}
            </Button>
            
            {show2FA && (
              <Button
                fullWidth
                variant="text"
                onClick={() => { 
                  setShow2FA(false); 
                  setTwoFactorCode('');
                  setFailedAttempts(0);
                  setTurnstileToken('');
                  setTurnstileKey(prev => prev + 1);
                }}
                sx={{ mb: 2 }}
              >
                Anuluj
              </Button>
            )}
          </Box>

          {!show2FA && (
            <>
              <Divider sx={{ my: 3 }}>LUB</Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {GOOGLE_CLIENT_ID && (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                    text="signin_with"
                    shape="rectangular"
                    width="100%"
                    locale="pl"
                  />
                )}
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2">
                  Nie masz konta?{' '}
                  <Link to="/register" style={{ textDecoration: 'none' }}>
                    Zarejestruj się
                  </Link>
                </Typography>
              </Box>
            </>
          )}
        </Paper>
      </Box>

      {/* Dialog łączenia kont */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GoogleIcon sx={{ color: '#4285f4' }} />
            Połącz konto Google
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Konto z adresem <strong>{linkEmail}</strong> już istnieje. 
            Podaj hasło do tego konta, aby połączyć je z Google.
          </Alert>
          {linkError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {linkError}
            </Alert>
          )}
          <TextField
            fullWidth
            type="password"
            label="Hasło do konta"
            value={linkPassword}
            onChange={(e) => setLinkPassword(e.target.value)}
            margin="normal"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLinkAccounts();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)} disabled={linkLoading}>
            Anuluj
          </Button>
          <Button 
            onClick={handleLinkAccounts} 
            variant="contained" 
            disabled={linkLoading || !linkPassword}
          >
            {linkLoading ? <CircularProgress size={20} /> : 'Połącz i zaloguj'}
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </PublicLayout>
  );
}

export default Login;
