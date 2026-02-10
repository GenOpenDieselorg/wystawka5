import React, { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, Typography, Container, useTheme, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Navbar from './Navbar';
import JobProgress from './JobProgress';

const drawerWidth = 250;

const Layout = ({ children, title, actions, maxWidth = "lg" }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar 
        mobileOpen={mobileOpen} 
        onClose={handleDrawerToggle} 
        drawerWidth={drawerWidth} 
      />
      
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <AppBar position="sticky" sx={{ bgcolor: 'white', color: 'text.primary', boxShadow: 1 }}>
          <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
             <IconButton 
               color="inherit" 
               aria-label="open drawer" 
               edge="start" 
               onClick={handleDrawerToggle}
               sx={{ mr: 2, display: { sm: 'none' } }}
             >
                <MenuIcon />
             </IconButton>
             <Typography 
               variant="h6" 
               component="div" 
               sx={{ 
                 flexGrow: 1,
                 fontSize: { xs: '1rem', sm: '1.25rem' },
                 overflow: 'hidden',
                 textOverflow: 'ellipsis',
                 whiteSpace: 'nowrap'
               }}
             >
                {title}
             </Typography>
             <Box sx={{ display: { xs: 'flex', sm: 'flex' }, alignItems: 'center' }}>
               {actions}
             </Box>
          </Toolbar>
        </AppBar>
        <Container 
          maxWidth={maxWidth} 
          sx={{ 
            mt: { xs: 2, sm: 4 }, 
            mb: { xs: 2, sm: 4 }, 
            flexGrow: 1,
            px: { xs: 1, sm: 2 }
          }}
        >
          {children}
        </Container>
      </Box>
      <JobProgress />
    </Box>
  );
};

export default Layout;

