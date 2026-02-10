import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Drawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LinkIcon from '@mui/icons-material/Link';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ViewListIcon from '@mui/icons-material/ViewList';
import HelpIcon from '@mui/icons-material/Help';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Navbar({ mobileOpen, onClose, drawerWidth = 250 }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [walletBalance, setWalletBalance] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/wallet`);
      setWalletBalance(response.data.wallet?.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/integrations') {
      return location.pathname === path || location.pathname.startsWith('/integrations/');
    }
    return location.pathname === path;
  };

  const getButtonStyle = (path) => ({
    color: 'white',
    justifyContent: 'flex-start',
    textAlign: 'left',
    px: 2,
    py: 1.5,
    bgcolor: isActive(path) ? 'primary.dark' : 'transparent',
    '&:hover': { bgcolor: 'primary.dark' }
  });

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        bgcolor: 'primary.main',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        pt: 0.5
      }}
    >
      <Box sx={{ px: 0.5, py: 0.5, mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src="/logo.svg" 
          alt="wystawoferte.pl" 
          style={{ height: '45px', width: 'auto', maxWidth: '200px' }}
        />
      </Box>
      <Button
        startIcon={<DashboardIcon />}
        sx={getButtonStyle('/dashboard')}
        onClick={() => { navigate('/dashboard'); if(isMobile) onClose(); }}
      >
        Wystaw ofertę
      </Button>
      <Button
        startIcon={<ViewListIcon />}
        sx={getButtonStyle('/allegro-bulk-edit')}
        onClick={() => { navigate('/allegro-bulk-edit'); if(isMobile) onClose(); }}
      >
        Masowa Edycja Allegro
      </Button>
      <Button
        startIcon={<AnalyticsIcon />}
        sx={getButtonStyle('/analytics')}
        onClick={() => { navigate('/analytics'); if(isMobile) onClose(); }}
      >
        Analityka
      </Button>
      <Button
        startIcon={<AutoFixHighIcon />}
        sx={getButtonStyle('/ai-templates')}
        onClick={() => { navigate('/ai-templates'); if(isMobile) onClose(); }}
      >
        Szablony AI
      </Button>
      <Button
        startIcon={<InventoryIcon />}
        sx={getButtonStyle('/warehouse')}
        onClick={() => { navigate('/warehouse'); if(isMobile) onClose(); }}
      >
        Magazyn
      </Button>
      <Button
        startIcon={<PhotoLibraryIcon />}
        sx={getButtonStyle('/gallery')}
        onClick={() => { navigate('/gallery'); if(isMobile) onClose(); }}
      >
        Galeria
      </Button>
      <Button
        startIcon={<AccountBalanceWalletIcon />}
        sx={getButtonStyle('/wallet')}
        onClick={() => { navigate('/wallet'); if(isMobile) onClose(); }}
      >
        Portfel ({walletBalance.toFixed(2)} PLN)
      </Button>
      <Button
        startIcon={<SettingsIcon />}
        sx={getButtonStyle('/settings')}
        onClick={() => { navigate('/settings'); if(isMobile) onClose(); }}
      >
        Ustawienia
      </Button>
      <Button
        startIcon={<LinkIcon />}
        sx={getButtonStyle('/integrations')}
        onClick={() => { navigate('/integrations'); if(isMobile) onClose(); }}
      >
        Integracje
      </Button>
      <Button
        startIcon={<HelpIcon />}
        sx={getButtonStyle('/faq')}
        onClick={() => { navigate('/faq'); if(isMobile) onClose(); }}
      >
        FAQ
      </Button>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ px: 2, py: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {user?.name}
        </Typography>
        <Button
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{ color: 'white' }}
        >
          Wyloguj
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}

export default Navbar;

