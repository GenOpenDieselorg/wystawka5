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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import Turnstile from 'react-turnstile';
import { useAuth } from '../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google';
import PublicLayout from '../components/PublicLayout';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const TURNSTILE_SITE_KEY = process.env.REACT_APP_CLOUDFLARE_TURNSTILE_SITE_KEY;

// Debug: sprawdź czy zmienna jest załadowana
console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID);
console.log('REACT_APP_GOOGLE_CLIENT_ID from env:', process.env.REACT_APP_GOOGLE_CLIENT_ID);

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nip, setNip] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showReferralCode, setShowReferralCode] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Google linking dialog
  const [linkDialog, setLinkDialog] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkCredential, setLinkCredential] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  const { register, googleLogin, googleLink } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków');
      return;
    }

    // Validate NIP if provided
    if (nip && nip.trim() !== '') {
      const nipDigits = nip.replace(/\D/g, '');
      if (nipDigits.length !== 10) {
        setError('NIP musi zawierać dokładnie 10 cyfr');
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await register(email, password, name, nip, referralCode, turnstileToken);
      if (result.success) {
        if (result.requiresVerification) {
          setSuccessMessage('Rejestracja pomyślna. Sprawdź swoją skrzynkę mailową, aby aktywować konto.');
          setName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setNip('');
          setReferralCode('');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.error);
        setTurnstileToken('');
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
    setError('Rejestracja przez Google nie powiodła się');
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
      <Container maxWidth="lg">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Grid container spacing={4}>
          {/* Lewa kolumna - Formularz */}
          <Grid item xs={12} md={7}>
            <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom align="center">
                Zarejestruj się
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                  {error}
                </Alert>
              )}

              {successMessage && (
                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  {successMessage}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Imię i nazwisko"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                <TextField
                  fullWidth
                  label="Potwierdź hasło"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="NIP firmy (opcjonalne)"
                  value={nip}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setNip(value);
                    }
                  }}
                  margin="normal"
                  inputProps={{ maxLength: 10 }}
                  helperText={nip && nip.length > 0 && nip.length !== 10 ? "NIP musi zawierać dokładnie 10 cyfr" : "10 cyfr (opcjonalne)"}
                  error={nip && nip.length > 0 && nip.length !== 10}
                />
                
                {/* Przycisk do pokazania kodu polecającego */}
                {!showReferralCode && (
                  <Button
                    type="button"
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowReferralCode(true)}
                    sx={{ mt: 2, mb: 1 }}
                  >
                    Mam kod polecający
                  </Button>
                )}

                {/* Pole kodu polecającego - pokazuje się po kliknięciu przycisku */}
                {showReferralCode && (
                  <TextField
                    fullWidth
                    label="Kod polecający (opcjonalne)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    margin="normal"
                    inputProps={{ maxLength: 20 }}
                    helperText="💡 Wprowadź kod polecający 'STARTUJE' aby otrzymać 50 PLN na start (50 darmowych aukcji)!"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                )}
                
                {TURNSTILE_SITE_KEY && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Turnstile
                      sitekey={TURNSTILE_SITE_KEY}
                      onVerify={(token) => setTurnstileToken(token)}
                    />
                  </Box>
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
                      Rejestracja...
                    </>
                  ) : (
                    'Zarejestruj się'
                  )}
                </Button>
              </Box>

              <Divider sx={{ my: 3 }}>LUB</Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {GOOGLE_CLIENT_ID && (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleFailure}
                    text="signup_with"
                    shape="rectangular"
                    width="100%"
                    locale="pl"
                  />
                )}
              </Box>

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2">
                  Masz już konto?{' '}
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    Zaloguj się
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Prawa kolumna - Informacja o kodzie polecającym */}
          <Grid item xs={12} md={5}>
            <Card elevation={3} sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Chcesz wypróbować narzędzie?
                </Typography>
                
                <Typography variant="body1" paragraph sx={{ mb: 2, fontSize: '1.1rem', lineHeight: 1.8 }}>
                  Dołącz do naszej platformy i odkryj, jak łatwo możesz zarządzać swoimi aukcjami i wystawkami!
                </Typography>

                <Typography variant="body1" paragraph sx={{ mb: 3, fontSize: '1.1rem', lineHeight: 1.8 }}>
                  <strong>Pamiętaj!</strong> Użyj kodu polecającego <strong>"STARTUJE"</strong> aby otrzymać <strong>50 PLN na start</strong> - to aż <strong>50 darmowych aukcji</strong>!
                </Typography>

                <Box sx={{ 
                  mt: 3, 
                  p: 2, 
                  backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                  borderRadius: 2,
                  backdropFilter: 'blur(10px)'
                }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    💡 Kod polecający możesz wprowadzić podczas rejestracji - wystarczy kliknąć przycisk "Mam kod polecający" w formularzu.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
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

export default Register;
