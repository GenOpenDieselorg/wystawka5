const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const backgroundJobs = require('../services/backgroundJobs');

// Create a new job
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, data } = req.body;
    const userId = req.userId;

    if (!type) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    // Add baseUrl to data for publishing
    const jobData = {
      ...data,
      baseUrl: `${req.protocol}://${req.get('host')}`
    };

    const jobId = await backgroundJobs.createJob(userId, type, jobData);

    res.status(201).json({ 
      message: 'Job created successfully', 
      jobId,
      status: 'pending'
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active jobs
router.get('/active', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const jobs = await backgroundJobs.getActiveJobs(userId);
    res.json({ jobs });
  } catch (error) {
    console.error('Get active jobs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get specific job
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const job = await backgroundJobs.getJob(id, userId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
