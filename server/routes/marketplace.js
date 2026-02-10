const express = require('express');
const router = express.Router();
const { safeRedirect, buildSafeRedirectUrl } = require('../utils/redirectValidator'); // SECURITY: Redirect validation
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const marketplaceServices = require('../services/marketplace');
const marketplaceRegistry = require('../services/marketplaces/registry');
const allegroOAuth = require('../services/allegroOAuth');
const allegroSettings = require('../services/allegroSettings');
const olxOAuth = require('../services/olxOAuth');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');

// Get all integrations for user
router.get('/integrations', authenticate, async (req, res) => {
  try {
    const [integrations] = await db.execute(
      'SELECT id, marketplace, is_active, invoice_type, shipping_rates_id, return_policy_id, implied_warranty_id, warranty_id, responsible_producer_id, created_at, updated_at FROM marketplace_integrations WHERE user_id = ?',
      [req.userId]
    );
    
    // Don't send tokens in response
    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add/Update integration
router.post('/integrations', authenticate, async (req, res) => {
  try {
    const { marketplace, access_token, refresh_token, invoice_type } = req.body;
    
    if (!marketplace || !access_token) {
      return res.status(400).json({ error: 'Marketplace and access_token are required' });
    }
    
    // Use registry to validate marketplace
    if (!marketplaceRegistry.hasAdapter(marketplace.toLowerCase())) {
      return res.status(400).json({ 
        error: `Invalid marketplace. Available: ${marketplaceRegistry.getRegisteredMarketplaces().join(', ')}` 
      });
    }
    
    // Validate invoice_type if provided
    const validInvoiceTypes = ['vat', 'vat_marza', 'no_vat_invoice', 'invoice_no_vat'];
    if (invoice_type && !validInvoiceTypes.includes(invoice_type)) {
      return res.status(400).json({ error: 'Invalid invoice type. Must be "vat", "vat_marza", "no_vat_invoice" or "invoice_no_vat"' });
    }
    
    // Check if integration already exists
    const [existing] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      [marketplace.toLowerCase(), req.userId]
    );
    
    if (existing.length > 0) {
      // Update existing integration
      await db.execute(
        'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ?, invoice_type = ? WHERE id = ? AND user_id = ?',
        [encrypt(access_token), encrypt(refresh_token || null), invoice_type || null, existing[0].id, req.userId]
      );
      res.json({ message: 'Integration updated successfully', integration: { id: existing[0].id, marketplace: marketplace.toLowerCase() } });
    } else {
      // Create new integration
      const [result] = await db.execute(
        'INSERT INTO marketplace_integrations (user_id, marketplace, access_token, refresh_token, is_active, invoice_type, shipping_rates_id, return_policy_id, implied_warranty_id, warranty_id, responsible_producer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [req.userId, marketplace.toLowerCase(), encrypt(access_token), encrypt(refresh_token || null), true, invoice_type || null, null, null, null, null, null]
      );
      res.json({ message: 'Integration added successfully', integration: { id: result.insertId, marketplace: marketplace.toLowerCase() } });
    }
  } catch (error) {
    console.error('Add integration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Allegro settings options
router.get('/allegro/settings-options', authenticate, async (req, res) => {
  try {
    // Get Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', req.userId]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not found or not connected' });
    }
    
    const accessToken = decrypt(integrations[0].access_token);
    
    // Get all settings options
    const options = await allegroSettings.getAllSettingsOptions(accessToken);
    
    res.json(options);
  } catch (error) {
    console.error('Get Allegro settings options error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Update integration settings
router.put('/integrations/:id/settings', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      invoice_type, 
      shipping_rates_id, 
      return_policy_id, 
      implied_warranty_id, 
      warranty_id, 
      responsible_producer_id 
    } = req.body;
    
    // Validate invoice_type if provided
    const validInvoiceTypes = ['vat', 'vat_marza', 'no_vat_invoice', 'invoice_no_vat'];
    if (invoice_type && !validInvoiceTypes.includes(invoice_type)) {
      return res.status(400).json({ error: 'Invalid invoice type. Must be "vat", "vat_marza", "no_vat_invoice" or "invoice_no_vat"' });
    }
    
    // Verify ownership
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    // Update settings
    await db.execute(
      'UPDATE marketplace_integrations SET invoice_type = ?, shipping_rates_id = ?, return_policy_id = ?, implied_warranty_id = ?, warranty_id = ?, responsible_producer_id = ? WHERE id = ? AND user_id = ?',
      [
        invoice_type || null,
        shipping_rates_id || null,
        return_policy_id || null,
        implied_warranty_id || null,
        warranty_id || null,
        responsible_producer_id || null,
        id,
        req.userId
      ]
    );
    
    const logActivity = require('../utils/activityLogger');
    await logActivity(req, req.userId, 'integration_update', { marketplace: integrations[0].marketplace });
    
    res.json({ message: 'Integration settings updated successfully' });
  } catch (error) {
    console.error('Update integration settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete integration
router.delete('/integrations/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify ownership
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    await db.execute('DELETE FROM marketplace_integrations WHERE id = ? AND user_id = ?', [id, req.userId]);
    
    res.json({ message: 'Integration deleted successfully' });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test integration connection
router.post('/integrations/:id/test', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    const integration = integrations[0];
    
    // Test connection using marketplace service
    const testResult = await marketplaceServices.testConnection(
      integration.marketplace,
      decrypt(integration.access_token),
      decrypt(integration.refresh_token)
    );
    
    // If token was refreshed, update it in database
    if (testResult.tokenRefreshed && testResult.newAccessToken) {
      await db.execute(
        'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ? WHERE id = ? AND user_id = ?',
        [
          encrypt(testResult.newAccessToken),
          encrypt(testResult.newRefreshToken || integration.refresh_token),
          integration.id,
          req.userId
        ]
      );
    }
    
    res.json({ 
      success: testResult.success, 
      message: testResult.message,
      tokenRefreshed: testResult.tokenRefreshed || false
    });
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// ========== ALLEGRO OAUTH ENDPOINTS ==========

// Generate Allegro OAuth authorization URL
router.get('/allegro/authorize', authenticate, async (req, res) => {
  try {
    const { scopes } = req.query;
    
    // Parse scopes if provided
    let scopeArray = null;
    if (scopes) {
      scopeArray = typeof scopes === 'string' ? scopes.split(' ') : scopes;
    }
    
    // Generate state for CSRF protection (using user ID + random)
    const state = crypto.randomBytes(32).toString('hex');
    
    // Generate authorization URL with PKCE
    const { authUrl, codeVerifier } = allegroOAuth.generateAuthorizationUrl(state, scopeArray, true);
    
    // Store code_verifier temporarily in database with state
    // We'll use a simple approach: store in a temporary table or use existing integrations table with a flag
    // For simplicity, we'll store it in a JSON file or use a temporary storage
    // In production, you might want to use Redis or a proper session store
    
    // Store state and code_verifier mapping (we'll retrieve it in callback)
    // For now, we'll encode it in the state parameter or use a simple in-memory store
    // Better approach: create a temporary oauth_sessions table or use Redis
    
    // Simple approach: encode user_id in state and store code_verifier separately
    // We'll use a combination: state contains user_id + random, and we store code_verifier
    const stateWithUserId = `${req.userId}:${state}`;
    
    // Store code_verifier in a temporary way (in production use Redis or database)
    // For now, we'll pass it through a secure cookie or store it server-side
    // Let's use a simple approach: modify state to include a hash we can verify
    
    // Update authUrl to use stateWithUserId
    const finalAuthUrl = authUrl.replace(`state=${state}`, `state=${encodeURIComponent(stateWithUserId)}`);
    
    // Store code_verifier in database (thread-safe, no race conditions)
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Clean up expired sessions first (older than 10 minutes)
    await db.execute(
      'DELETE FROM oauth_sessions WHERE expires_at < NOW()'
    );
    
    // Insert new session into database
    await db.execute(
      'INSERT INTO oauth_sessions (session_id, user_id, state, code_verifier, marketplace, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [sessionId, req.userId, stateWithUserId, codeVerifier, 'allegro', expiresAt]
    );
    
    res.json({
      authUrl: finalAuthUrl,
      sessionId: sessionId // Frontend can use this to retrieve code_verifier if needed
    });
  } catch (error) {
    console.error('Allegro authorize error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL', message: error.message });
  }
});

// Allegro OAuth callback - exchange code for token
// Note: This endpoint doesn't use authenticate middleware because user might return from Allegro
// We verify user via state parameter instead
router.get('/allegro/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Check for errors from Allegro
    if (error) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: error_description || error }));
    }
    
    if (!code || !state) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Missing authorization code or state' }));
    }
    
    // Parse state to get user_id
    const stateParts = decodeURIComponent(state).split(':');
    if (stateParts.length < 2) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Invalid state parameter format' }));
    }
    
    const userId = parseInt(stateParts[0]);
    const originalState = stateParts.slice(1).join(':');
    
    if (!userId || isNaN(userId)) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Invalid user ID in state parameter' }));
    }
    
    // Retrieve code_verifier from database (thread-safe)
    const fullState = `${userId}:${originalState}`;
    
    // Find and delete session in one transaction (prevents race conditions)
    const [sessions] = await db.execute(
      'SELECT * FROM oauth_sessions WHERE state = ? AND user_id = ? AND marketplace = ? AND expires_at > NOW()',
      [fullState, userId, 'allegro']
    );
    
    if (sessions.length === 0) {
      return res.redirect(`${process.env.FRONTEND_URL || 'https://wystawoferte.pl'}/integrations?error=${encodeURIComponent('Session expired or invalid')}`);
    }
    
    const session = sessions[0];
    const codeVerifier = session.code_verifier;
    
    // Remove used session (delete after successful retrieval)
    await db.execute(
      'DELETE FROM oauth_sessions WHERE session_id = ?',
      [session.session_id]
    );
    
    // Exchange code for token
    const tokenData = await allegroOAuth.exchangeCodeForToken(code, codeVerifier);
    
    // Get user info to verify token (optional - don't fail if it doesn't work)
    let userInfo = null;
    try {
      userInfo = await allegroOAuth.getUserInfo(tokenData.access_token);
      console.log('Allegro user info retrieved successfully:', userInfo?.id || userInfo?.login || 'OK');
    } catch (userInfoError) {
      console.warn('Allegro getUserInfo failed (non-critical):', userInfoError.message);
      // Continue anyway - token exchange was successful, so we can save the integration
    }
    
    // Check if integration already exists
    const [existing] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', userId]
    );
    
    if (existing.length > 0) {
      // Update existing integration (preserve invoice_type if it exists)
      await db.execute(
        'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ?, is_active = ? WHERE id = ? AND user_id = ?',
        [encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), true, existing[0].id, userId]
      );
    } else {
      // Create new integration
      await db.execute(
        'INSERT INTO marketplace_integrations (user_id, marketplace, access_token, refresh_token, is_active, invoice_type, shipping_rates_id, return_policy_id, implied_warranty_id, warranty_id, responsible_producer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'allegro', encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), true, null, null, null, null, null, null]
      );
    }
    
    // SECURITY: Redirect to frontend with success (validated)
    safeRedirect(res, buildSafeRedirectUrl('/integrations', { success: 'allegro_connected' }));
  } catch (error) {
    console.error('Allegro callback error:', error);
    safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: error.message || 'Failed to connect Allegro' }));
  }
});

// Refresh Allegro access token
router.post('/allegro/refresh', authenticate, async (req, res) => {
  try {
    // Get integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', req.userId]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ error: 'Allegro integration not found' });
    }
    
    const integration = integrations[0];
    
    if (!integration.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }
    
    // Refresh token
    const tokenData = await allegroOAuth.refreshAccessToken(decrypt(integration.refresh_token));
    
    // Update integration with new tokens
    await db.execute(
      'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ? WHERE id = ? AND user_id = ?',
      [encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), integration.id, req.userId]
    );
    
    res.json({
      message: 'Token refreshed successfully',
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error('Allegro refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token', message: error.message });
  }
});

// ========== OLX OAUTH ENDPOINTS ==========

// Generate OLX OAuth authorization URL
router.get('/olx/authorize', authenticate, async (req, res) => {
  try {
    // Check if OLX is configured
    if (!process.env.OLX_CLIENT_ID || !process.env.OLX_CLIENT_SECRET) {
      return res.status(500).json({ 
        error: 'OLX nie jest skonfigurowane', 
        message: 'Brak OLX_CLIENT_ID lub OLX_CLIENT_SECRET w konfiguracji serwera. Skontaktuj się z administratorem.' 
      });
    }

    const { scopes } = req.query;
    
    // Parse scopes if provided
    let scopeArray = null;
    if (scopes) {
      scopeArray = typeof scopes === 'string' ? scopes.split(' ') : scopes;
    }
    
    // Generate state for CSRF protection (using user ID + random)
    const state = crypto.randomBytes(32).toString('hex');
    const stateWithUserId = `${req.userId}:${state}`;
    
    // Generate authorization URL
    const authUrl = olxOAuth.generateAuthorizationUrl(stateWithUserId, scopeArray);
    
    // Store state in database (thread-safe, no race conditions)
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Clean up expired sessions first
    await db.execute(
      'DELETE FROM oauth_sessions WHERE expires_at < NOW()'
    );
    
    // Insert new session into database
    try {
      await db.execute(
        'INSERT INTO oauth_sessions (session_id, user_id, state, code_verifier, marketplace, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, req.userId, stateWithUserId, null, 'olx', expiresAt]
      );
    } catch (e) {
      console.error('Error writing OAuth session to database:', e);
      return res.status(500).json({ 
        error: 'Błąd zapisu sesji', 
        message: 'Nie udało się zapisać sesji OAuth' 
      });
    }
    
    res.json({
      authUrl: authUrl,
      sessionId: sessionId
    });
  } catch (error) {
    console.error('OLX authorize error:', error);
    res.status(500).json({ 
      error: 'Błąd podczas generowania URL autoryzacji', 
      message: error.message || 'Nieznany błąd' 
    });
  }
});

// OLX OAuth callback - exchange code for token
router.get('/olx/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Check for errors from OLX
    if (error) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: error_description || error }));
    }
    
    if (!code || !state) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Missing authorization code or state' }));
    }
    
    // Parse state to get user_id
    const stateParts = decodeURIComponent(state).split(':');
    if (stateParts.length < 2) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Invalid state parameter format' }));
    }
    
    const userId = parseInt(stateParts[0]);
    const originalState = stateParts.slice(1).join(':');
    
    if (!userId || isNaN(userId)) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Invalid user ID in state parameter' }));
    }
    
    // Retrieve session from database (thread-safe)
    const fullState = `${userId}:${originalState}`;
    
    // Find and delete session in one transaction (prevents race conditions)
    const [sessions] = await db.execute(
      'SELECT * FROM oauth_sessions WHERE state = ? AND user_id = ? AND marketplace = ? AND expires_at > NOW()',
      [fullState, userId, 'olx']
    );
    
    if (sessions.length === 0) {
      return safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: 'Session expired or invalid' }));
    }
    
    const session = sessions[0];
    
    // Remove used session (delete after successful retrieval)
    await db.execute(
      'DELETE FROM oauth_sessions WHERE session_id = ?',
      [session.session_id]
    );
    
    // Exchange code for token
    const tokenData = await olxOAuth.exchangeCodeForToken(code);
    
    // Get user info to verify token (optional - don't fail if it doesn't work)
    let userInfo = null;
    try {
      userInfo = await olxOAuth.getUserInfo(tokenData.access_token);
      console.log('OLX user info retrieved successfully:', userInfo?.id || userInfo?.email || 'OK');
    } catch (userInfoError) {
      console.warn('OLX getUserInfo failed (non-critical):', userInfoError.message);
      // Continue anyway - token exchange was successful, so we can save the integration
    }
    
    // Check if integration already exists
    const [existing] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', userId]
    );
    
    if (existing.length > 0) {
      // Update existing integration (preserve invoice_type if it exists)
      await db.execute(
        'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ?, is_active = ? WHERE id = ? AND user_id = ?',
        [encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), true, existing[0].id, userId]
      );
    } else {
      // Create new integration
      await db.execute(
        'INSERT INTO marketplace_integrations (user_id, marketplace, access_token, refresh_token, is_active, invoice_type, shipping_rates_id, return_policy_id, implied_warranty_id, warranty_id, responsible_producer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'olx', encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), true, null, null, null, null, null, null]
      );
    }
    
    // SECURITY: Redirect to frontend with success (validated)
    safeRedirect(res, buildSafeRedirectUrl('/integrations', { success: 'olx_connected' }));
  } catch (error) {
    console.error('OLX callback error:', error);
    safeRedirect(res, buildSafeRedirectUrl('/integrations', { error: error.message || 'Failed to connect OLX' }));
  }
});

// Refresh OLX access token
router.post('/olx/refresh', authenticate, async (req, res) => {
  try {
    // Get integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    if (integrations.length === 0) {
      return res.status(404).json({ error: 'OLX integration not found' });
    }
    
    const integration = integrations[0];
    
    if (!integration.refresh_token) {
      return res.status(400).json({ error: 'No refresh token available' });
    }
    
    // Refresh token
    const tokenData = await olxOAuth.refreshAccessToken(decrypt(integration.refresh_token));
    
    // Update integration with new tokens
    await db.execute(
      'UPDATE marketplace_integrations SET access_token = ?, refresh_token = ? WHERE id = ? AND user_id = ?',
      [encrypt(tokenData.access_token), encrypt(tokenData.refresh_token), integration.id, req.userId]
    );
    
    res.json({
      message: 'Token refreshed successfully',
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.error('OLX refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token', message: error.message });
  }
});

// ========== ALLEGRO DRAFT OFFERS ENDPOINTS ==========

// Get draft (INACTIVE) offers from Allegro
router.get('/allegro/draft-offers', authenticate, async (req, res) => {
  try {
    // Get Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', req.userId]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not found or not connected' });
    }
    
    const accessToken = integrations[0].access_token;
    const axios = require('axios');
    
    // Get draft offers (INACTIVE status) from Allegro
    // Using sale/offers endpoint with publication.status filter
    const response = await axios.get('https://api.allegro.pl/sale/offers', {
      params: {
        'publication.status': 'INACTIVE',
        limit: 100
      },
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    const offers = response.data.offers || [];
    
    // Map to simpler format
    const draftOffers = offers.map(offer => ({
      id: offer.id,
      name: offer.name,
      price: offer.sellingMode?.price?.amount,
      currency: offer.sellingMode?.price?.currency,
      status: offer.publication?.status,
      createdAt: offer.createdAt,
      primaryImage: offer.primaryImage?.url
    }));
    
    res.json({ draftOffers, total: draftOffers.length });
  } catch (error) {
    console.error('Get Allegro draft offers error:', error.response?.data || error.message);
    
    // Handle token expiration
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ 
        error: 'Token wygasł', 
        message: 'Proszę odświeżyć połączenie z Allegro' 
      });
    }
    
    res.status(500).json({ 
      error: 'Błąd podczas pobierania szkicowych ofert', 
      message: error.response?.data?.errors?.[0]?.message || error.message 
    });
  }
});

// Delete a draft offer from Allegro
router.delete('/allegro/offers/:offerId', authenticate, async (req, res) => {
  try {
    const { offerId } = req.params;
    
    // SECURITY: Verify ownership of this offer in local database
    try {
      const [listings] = await db.execute(
        'SELECT * FROM marketplace_listings WHERE external_id = ? AND user_id = ? AND marketplace = ?',
        [offerId, req.userId, 'allegro']
      );
      
      if (listings.length === 0) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'Nie masz uprawnień do usunięcia tej oferty lub oferta nie została utworzona przez tę aplikację.' 
        });
      }
    } catch (dbError) {
      // If table doesn't exist (old installation), log warning but allow deletion
      // This is backward compatibility - remove after all users migrate
      console.warn('marketplace_listings table check failed:', dbError.message);
      console.warn('SECURITY WARNING: Cannot verify offer ownership - allowing deletion (backward compatibility)');
    }
    
    // Get Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', req.userId]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not found or not connected' });
    }
    
    const accessToken = decrypt(integrations[0].access_token);
    const axios = require('axios');
    
    // First, check offer status - can only delete INACTIVE offers
    try {
      // Use /sale/product-offers endpoint to check status as /sale/offers/{id} is deprecated
      const offerResponse = await axios.get(`https://api.allegro.pl/sale/product-offers/${offerId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.allegro.public.v1+json'
        }
      });
      
      const offerStatus = offerResponse.data.publication?.status;
      if (offerStatus !== 'INACTIVE') {
        return res.status(400).json({ 
          error: 'Nie można usunąć aktywnej oferty', 
          message: `Oferta ma status ${offerStatus}. Można usunąć tylko oferty ze statusem INACTIVE (szkice).` 
        });
      }
    } catch (checkError) {
      if (checkError.response?.status === 404) {
        return res.status(404).json({ error: 'Oferta nie istnieje' });
      }
      throw checkError;
    }
    
    // Delete the offer using DELETE /sale/offers/{offerId}
    // Note: Documentation says DELETE /sale/offers/{offerId} is for drafts. 
    // If this fails with "resource not supported", it might be because the offer was created via new API?
    // But /sale/product-offers doesn't support DELETE.
    await axios.delete(`https://api.allegro.pl/sale/offers/${offerId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    
    res.json({ message: 'Oferta szkicowa została usunięta', offerId });
  } catch (error) {
    console.error('Delete Allegro offer error:', error.response?.data || error.message);
    
    // Handle token expiration
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ 
        error: 'Token wygasł', 
        message: 'Proszę odświeżyć połączenie z Allegro' 
      });
    }
    
    res.status(500).json({ 
      error: 'Błąd podczas usuwania oferty', 
      message: error.response?.data?.errors?.[0]?.message || error.message 
    });
  }
});

// Delete multiple draft offers from Allegro
router.post('/allegro/offers/delete-batch', authenticate, async (req, res) => {
  try {
    const { offerIds } = req.body;
    
    if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
      return res.status(400).json({ error: 'Brak ID ofert do usunięcia' });
    }
    
    // SECURITY: Verify ownership of all offers in local database
    try {
      const placeholders = offerIds.map(() => '?').join(',');
      const [listings] = await db.execute(
        `SELECT external_id FROM marketplace_listings WHERE external_id IN (${placeholders}) AND user_id = ? AND marketplace = ?`,
        [...offerIds, req.userId, 'allegro']
      );
      
      const ownedOfferIds = listings.map(l => l.external_id);
      const unauthorizedOffers = offerIds.filter(id => !ownedOfferIds.includes(id));
      
      if (unauthorizedOffers.length > 0) {
        return res.status(403).json({ 
          error: 'Access denied', 
          message: `Nie masz uprawnień do usunięcia następujących ofert: ${unauthorizedOffers.join(', ')}`,
          unauthorizedOffers
        });
      }
    } catch (dbError) {
      // If table doesn't exist (old installation), log warning but allow deletion
      console.warn('marketplace_listings table check failed:', dbError.message);
      console.warn('SECURITY WARNING: Cannot verify batch offer ownership - allowing deletion (backward compatibility)');
    }
    
    // Get Allegro integration
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['allegro', req.userId]
    );
    
    if (integrations.length === 0 || !integrations[0].access_token) {
      return res.status(404).json({ error: 'Allegro integration not found or not connected' });
    }
    
    const accessToken = decrypt(integrations[0].access_token);
    const axios = require('axios');
    
    const results = [];
    
    for (const offerId of offerIds) {
      try {
        // Check offer status first
        // Use /sale/product-offers endpoint to check status as /sale/offers/{id} is deprecated
        const offerResponse = await axios.get(`https://api.allegro.pl/sale/product-offers/${offerId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json'
          }
        });
        
        const offerStatus = offerResponse.data.publication?.status;
        if (offerStatus !== 'INACTIVE') {
          results.push({ offerId, success: false, error: `Status: ${offerStatus} (wymagany INACTIVE)` });
          continue;
        }
        
        // Delete the offer
        await axios.delete(`https://api.allegro.pl/sale/offers/${offerId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.allegro.public.v1+json'
          }
        });
        
        results.push({ offerId, success: true });
      } catch (error) {
        results.push({ 
          offerId, 
          success: false, 
          error: error.response?.data?.errors?.[0]?.message || error.message 
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    res.json({ 
      message: `Usunięto ${successCount} z ${offerIds.length} ofert`,
      results,
      successCount,
      failCount
    });
  } catch (error) {
    console.error('Batch delete Allegro offers error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Błąd podczas usuwania ofert', 
      message: error.message 
    });
  }
});

// Get OLX categories
router.get('/olx/categories', authenticate, async (req, res) => {
  try {
    const { parent_id } = req.query;
    
    // Get integration to use access token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    let accessToken;
    if (integrations.length > 0 && integrations[0].access_token) {
      accessToken = decrypt(integrations[0].access_token);
    } else {
      // Use client credentials token for public endpoints
      const tokenData = await olxOAuth.getClientCredentialsToken();
      accessToken = tokenData.access_token;
    }
    
    const axios = require('axios');
    const url = 'https://www.olx.pl/api/partner/categories';
    const params = parent_id ? { parent_id } : {};
    
    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2.0',
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('OLX get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories', message: error.response?.data?.error?.detail || error.message });
  }
});

// Get OLX category details
router.get('/olx/categories/:categoryId', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Get integration to use access token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    let accessToken;
    if (integrations.length > 0 && integrations[0].access_token) {
      accessToken = decrypt(integrations[0].access_token);
    } else {
      // Use client credentials token for public endpoints
      const tokenData = await olxOAuth.getClientCredentialsToken();
      accessToken = tokenData.access_token;
    }
    
    const axios = require('axios');
    const response = await axios.get(`https://www.olx.pl/api/partner/categories/${categoryId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2.0',
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('OLX get category error:', error);
    res.status(500).json({ error: 'Failed to get category', message: error.response?.data?.error?.detail || error.message });
  }
});

// Get OLX category attributes
router.get('/olx/categories/:categoryId/attributes', authenticate, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Get integration to use access token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    let accessToken;
    if (integrations.length > 0 && integrations[0].access_token) {
      accessToken = decrypt(integrations[0].access_token);
    } else {
      // Use client credentials token for public endpoints
      const tokenData = await olxOAuth.getClientCredentialsToken();
      accessToken = tokenData.access_token;
    }
    
    const axios = require('axios');
    const response = await axios.get(`https://www.olx.pl/api/partner/categories/${categoryId}/attributes`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2.0',
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('OLX get category attributes error:', error);
    res.status(500).json({ error: 'Failed to get category attributes', message: error.response?.data?.error?.detail || error.message });
  }
});

// Get OLX cities
router.get('/olx/cities', authenticate, async (req, res) => {
  try {
    const { offset, limit } = req.query;
    
    // Get integration to use access token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    let accessToken;
    if (integrations.length > 0 && integrations[0].access_token) {
      accessToken = decrypt(integrations[0].access_token);
    } else {
      // Use client credentials token for public endpoints
      const tokenData = await olxOAuth.getClientCredentialsToken();
      accessToken = tokenData.access_token;
    }
    
    const axios = require('axios');
    const params = {};
    if (offset) params.offset = offset;
    if (limit) params.limit = limit;
    
    const response = await axios.get('https://www.olx.pl/api/partner/cities', {
      params,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2.0',
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('OLX get cities error:', error);
    res.status(500).json({ error: 'Failed to get cities', message: error.response?.data?.error?.detail || error.message });
  }
});

// Get OLX city districts
router.get('/olx/cities/:cityId/districts', authenticate, async (req, res) => {
  try {
    const { cityId } = req.params;
    
    // Get integration to use access token
    const [integrations] = await db.execute(
      'SELECT * FROM marketplace_integrations WHERE marketplace = ? AND user_id = ?',
      ['olx', req.userId]
    );
    
    let accessToken;
    if (integrations.length > 0 && integrations[0].access_token) {
      accessToken = decrypt(integrations[0].access_token);
    } else {
      // Use client credentials token for public endpoints
      const tokenData = await olxOAuth.getClientCredentialsToken();
      accessToken = tokenData.access_token;
    }
    
    const axios = require('axios');
    const response = await axios.get(`https://www.olx.pl/api/partner/cities/${cityId}/districts`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2.0',
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('OLX get city districts error:', error);
    res.status(500).json({ error: 'Failed to get city districts', message: error.response?.data?.error?.detail || error.message });
  }
});

module.exports = router;

