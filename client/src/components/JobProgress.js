import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  LinearProgress, 
  Typography, 
  Paper,
  Stack,
  Alert,
  IconButton,
  Collapse
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

const JobProgress = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const prevJobsRef = useRef([]);

  const fetchJobStatus = async (jobId) => {
    try {
      const response = await axios.get(`${API_URL}/jobs/${jobId}`);
      return response.data.job;
    } catch (error) {
      console.error(`Error fetching job ${jobId}:`, error);
      return null;
    }
  };

  const fetchJobs = async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API_URL}/jobs/active`);
      
      const newActiveJobs = response.data.jobs || [];
      const prevActiveJobs = prevJobsRef.current;
      
      // Identify jobs that finished (were in prev but not in new)
      const finishedJobIds = prevActiveJobs
        .filter(prevJob => !newActiveJobs.find(newJob => newJob.id === prevJob.id))
        .map(job => job.id);

      // Process finished jobs to show notifications
      if (finishedJobIds.length > 0) {
        finishedJobIds.forEach(async (jobId) => {
          const finishedJob = await fetchJobStatus(jobId);
          if (finishedJob) {
            // Add to notifications
            const notification = {
              id: finishedJob.id,
              type: finishedJob.status === 'completed' ? 'success' : 'error',
              message: finishedJob.status === 'completed' 
                ? 'Pomyślnie utworzono ofertę!' 
                : `Błąd: ${finishedJob.error_message || 'Nieznany błąd'}`,
              productName: finishedJob.data?.productName || 'Produkt',
              timestamp: Date.now()
            };
            
            setNotifications(prev => [notification, ...prev]);
            
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
              removeNotification(jobId);
            }, 10000);
          }
        });
      }

      setJobs(newActiveJobs);
      prevJobsRef.current = newActiveJobs;
      
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchJobs();

    // Poll every 2 seconds for faster updates
    const interval = setInterval(fetchJobs, 2000);

    return () => clearInterval(interval);
  }, [user]);

  if (jobs.length === 0 && notifications.length === 0) return null;

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, width: 360, maxHeight: '80vh', overflowY: 'auto' }}>
      <Stack spacing={2}>
        {/* Notifications */}
        {notifications.map((notification) => (
          <Collapse in={true} key={`notif-${notification.id}`}>
            <Alert 
              severity={notification.type}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => removeNotification(notification.id)}
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
              sx={{ boxShadow: 3 }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {notification.productName}
              </Typography>
              {notification.message}
            </Alert>
          </Collapse>
        ))}

        {/* Active Jobs */}
        {jobs.map((job) => (
          <Paper key={job.id} elevation={6} sx={{ p: 2, bgcolor: 'background.paper', borderLeft: '4px solid #1976d2' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {job.data?.productName || 'Przetwarzanie...'}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {job.type === 'process_images_and_publish' 
                ? 'Przetwarzanie zdjęć i publikacja...' 
                : 'Trwa przetwarzanie w tle...'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress variant="determinate" value={job.progress || 0} />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography variant="body2" color="textSecondary">{`${Math.round(job.progress || 0)}%`}</Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default JobProgress;
