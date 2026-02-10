const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const crypto = require('crypto');
const axios = require('axios');
const walletService = require('../services/walletService');
const notificationService = require('../services/notificationService');
const { safeAxiosRequest } = require('../utils/ssrfValidator');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://wystawoferte.pl';

const CASHBILL_SHOP_ID = null; // Deprecated
const CASHBILL_SECRET_KEY = null; // Deprecated

const TPAY_API_URL = 'https://api.tpay.com';
const TPAY_CLIENT_ID = process.env.TPAY_CLIENT_ID;
const TPAY_CLIENT_SECRET = process.env.TPAY_CLIENT_SECRET;
const API_URL = process.env.BACKEND_URL || 'https://api.wystawoferte.pl';

// Helper to get Tpay access token
let tpayToken = null;
let tpayTokenExpiresAt = 0;

const getTpayToken = async () => {
  const now = Date.now();
  if (tpayToken && tpayTokenExpiresAt > now) {
    return tpayToken;
  }

  try {
    const response = await axios.post(`${TPAY_API_URL}/oauth/auth`, {
      client_id: TPAY_CLIENT_ID,
      client_secret: TPAY_CLIENT_SECRET
    });

    tpayToken = response.data.access_token;
    // Set expiration 60 seconds before actual expiry
    tpayTokenExpiresAt = now + (response.data.expires_in * 1000) - 60000;
    return tpayToken;
  } catch (error) {
    console.error('Error getting Tpay token:', error?.response?.data || error.message);
    throw new Error('Failed to authenticate with Tpay');
  }
};

// Get wallet info
router.get('/wallet', authenticate, async (req, res) => {
  try {
    // Get or create wallet
    const [wallets] = await db.execute('SELECT * FROM wallet WHERE user_id = ?', [req.userId]);
    
    let wallet;
    if (wallets.length === 0) {
      // Create wallet with 0 balance
      const [result] = await db.execute(
        'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
        [req.userId, 0, 0]
      );
      wallet = {
        id: result.insertId,
        user_id: req.userId,
        balance: 0,
        offers_created: 0,
        bulk_edits_count: 0
      };
    } else {
      wallet = wallets[0];
    }

    // Calculate totals from ALL transactions
    const [allTransactions] = await db.execute(
        'SELECT amount FROM transactions WHERE user_id = ? AND status = ?',
        [req.userId, 'completed']
    );

    let totalDeposited = 0;
    let totalCosts = 0;

    allTransactions.forEach(t => {
        const amt = parseFloat(t.amount);
        if (amt > 0) totalDeposited += amt;
        else totalCosts += Math.abs(amt);
    });

    // Get transactions for history (limit 50) with product information
    const [transactions] = await db.execute(
      `SELECT t.*, p.product_name, p.id as product_id_from_join
       FROM transactions t
       LEFT JOIN products p ON t.product_id = p.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC
       LIMIT 50`,
      [req.userId]
    );

    res.json({
      wallet: {
        balance: parseFloat(wallet.balance || 0),
        offersCreated: parseInt(wallet.offers_created || 0),
        bulkEditsCount: parseInt(wallet.bulk_edits_count || 0),
        totalDeposited: parseFloat(totalDeposited.toFixed(2)),
        totalCosts: parseFloat(totalCosts.toFixed(2))
      },
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        status: t.status,
        created_at: t.created_at,
        description: t.description || null,
        product_id: t.product_id || null,
        product_name: t.product_name || null,
        external_id: t.external_id || null
      }))
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Top up wallet via Tpay
router.post('/topup', authenticate, async (req, res) => {
  try {
    let { amount } = req.body;
    
    // Convert to number if it's a string
    amount = parseFloat(amount);
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    // Round to 2 decimal places
    amount = Math.round(amount * 100) / 100;

    // Validate Tpay configuration
    if (!TPAY_CLIENT_ID || !TPAY_CLIENT_SECRET) {
      console.error('Tpay configuration missing');
      return res.status(500).json({ 
        error: 'Płatności Tpay nie są poprawnie skonfigurowane. Skontaktuj się z administratorem.' 
      });
    }

    // Create transaction in database
    let transactionId;
    try {
      const [transactionResult] = await db.execute(
        'INSERT INTO transactions (user_id, type, amount, status) VALUES (?, ?, ?, ?)',
        [req.userId, 'topup', amount, 'pending']
      );
      transactionId = transactionResult.insertId;
      
      if (!transactionId) {
        throw new Error('Failed to create transaction record');
      }
    } catch (dbError) {
      console.error('Error creating transaction:', dbError);
      return res.status(500).json({
        error: 'Błąd podczas tworzenia transakcji',
        details: dbError.message
      });
    }

    // Get Tpay token
    const token = await getTpayToken();

    // Prepare Tpay transaction data
    const transactionData = {
      amount: parseFloat(amount.toFixed(2)),
      description: `Doładowanie portfela - ${amount} PLN`,
      hiddenDescription: transactionId.toString(),
      payer: {
        email: req.userEmail || 'no-email@wystawoferte.pl',
        name: `User ${req.userId}`
      },
      callbacks: {
        payerUrls: {
          success: `${FRONTEND_URL}/settings?payment=success`,
          error: `${FRONTEND_URL}/settings?payment=cancelled`
        },
        notification: {
          url: `${API_URL}/api/wallet/tpay/notification`,
          email: 'biuro@wystawoferte.pl'
        }
      }
    };

    console.log('Creating Tpay transaction:', { amount, transactionId });

    // Call Tpay API
    const response = await axios.post(
      `${TPAY_API_URL}/transactions`,
      transactionData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Tpay response:', response.data);

    // Update transaction with Tpay transaction ID
    if (response.data.transactionId) {
      try {
        await db.execute(
          'UPDATE transactions SET external_id = ? WHERE id = ?',
          [response.data.transactionId, transactionId]
        );
      } catch (dbError) {
        console.error('Error updating transaction with external_id:', dbError);
        // Continue anyway - the payment was created successfully
      }
    }

    res.json({
      paymentUrl: response.data.transactionPaymentUrl,
      transactionId: transactionId,
      paymentId: response.data.transactionId
    });
  } catch (error) {
    console.error('Top up error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data
    });
    
    // Provide more specific error messages
    let errorMessage = 'Wystąpił błąd podczas tworzenia płatności';
    
    if (error.response?.data?.error) {
      errorMessage = `Błąd Tpay: ${JSON.stringify(error.response.data)}`;
    } else if (error.response?.status === 401) {
      errorMessage = 'Błąd autoryzacji Tpay. Sprawdź konfigurację.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorMessage = 'Nie można połączyć się z Tpay. Sprawdź połączenie internetowe.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Ensure response is sent (check if headers already sent)
    if (!res.headersSent) {
      res.status(500).json({
        error: errorMessage,
        details: error.response?.data || error.message
      });
    } else {
      console.error('Response already sent, cannot send error response');
    }
  }
});

// Tpay notification callback (webhook)
// Tpay will POST to this endpoint when payment status changes
router.post('/tpay/notification', async (req, res) => {
  try {
    // Don't log sensitive data in production
    if (process.env.NODE_ENV !== 'production') {
      console.log('Tpay notification received:', req.body);
    }

    // Tpay REST API sends data in body. Structure depends on Tpay configuration,
    // but usually contains transaction ID and status or basic transaction data.
    // We will verify the transaction status by calling Tpay API directly using ID from notification.
    
    // Check various possible fields for transaction ID
    // Note: req.body.id is usually Merchant ID in Tpay notifications, so we shouldn't use it as transaction ID
    const transactionId = req.body.transactionId || req.body.tr_id;
    // Check for internal transaction ID (sent as hiddenDescription or tr_crc)
    const internalTransactionId = req.body.hiddenDescription || req.body.tr_crc || req.body.crc;

    if (!transactionId && !internalTransactionId) {
      console.error('Tpay notification: Missing transaction ID', req.body);
      return res.status(400).send('Missing transaction ID');
    }

    // Find transaction by Tpay transaction ID (external_id)
    let transactions = [];
    if (transactionId) {
      const [results] = await db.execute(
        'SELECT * FROM transactions WHERE external_id = ?',
        [transactionId]
      );
      transactions = results;
    }

    // Fallback: Find by internal ID if not found by external ID
    if (transactions.length === 0 && internalTransactionId) {
      console.log(`Tpay notification: Transaction not found by external_id ${transactionId}, trying internal ID ${internalTransactionId}`);
      const [results] = await db.execute(
        'SELECT * FROM transactions WHERE id = ?',
        [internalTransactionId]
      );
      transactions = results;

      // If found, update external_id if it was missing or different
      if (transactions.length > 0 && transactionId && transactions[0].external_id !== transactionId) {
        await db.execute(
          'UPDATE transactions SET external_id = ? WHERE id = ?',
          [transactionId, transactions[0].id]
        );
        transactions[0].external_id = transactionId; // Update in memory object
      }
    }

    if (transactions.length === 0) {
      console.error('Tpay notification: Transaction not found for payment', { transactionId, internalTransactionId });
      // Return OK to Tpay to stop retries if we can't find it (or maybe it's for another system)
      return res.send('TRUE');
    }

    const transaction = transactions[0];
    const userId = transaction.user_id;
    
    // Use the ID from the notification or the one from DB for verification
    let verifyId = transaction.external_id || transactionId;
    
    if (!verifyId) {
       console.error('Cannot verify transaction: No external ID available');
       return res.send('TRUE');
    }

    // Validate verifyId format (should not be a Merchant ID which is typically 5-6 digits)
    // Tpay transaction IDs are usually ULIDs (26 chars) or legacy TR-... strings
    // SECURITY: Validate format to prevent SSRF
    if (!/^[a-zA-Z0-9-_]+$/.test(String(verifyId))) {
        console.error(`Invalid transaction ID format: ${verifyId}`);
        return res.send('TRUE');
    }

    if (/^\d{5,6}$/.test(String(verifyId))) {
        console.error(`Invalid transaction ID detected (looks like Merchant ID): ${verifyId}`);
        // If this invalid ID came from DB, clear it
        if (transaction.external_id === verifyId) {
            await db.execute('UPDATE transactions SET external_id = NULL WHERE id = ?', [transaction.id]);
            console.log('Cleared invalid external_id from database');
        }
        // Try to proceed if we have an alternative valid ID (e.g. from current request)
        if (transactionId && !/^\d{5,6}$/.test(String(transactionId))) {
            verifyId = transactionId;
        } else {
            return res.send('TRUE');
        }
    }

    // Get Tpay token
    const token = await getTpayToken();

    // Verify transaction status with Tpay API
    const response = await safeAxiosRequest({
      url: `${TPAY_API_URL}/transactions/${verifyId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const tpayTransaction = response.data;
    console.log('Tpay verification response:', { id: tpayTransaction.transactionId, status: tpayTransaction.status });

    let newStatus = 'pending';
    if (tpayTransaction.status === 'correct' || tpayTransaction.status === 'paid') {
      newStatus = 'completed';
    } else if (tpayTransaction.status === 'refund' || tpayTransaction.status === 'canceled' || tpayTransaction.status === 'declined') {
      newStatus = 'failed';
    }

    // Only process if status changed to completed
    if (newStatus === 'completed' && transaction.status !== 'completed') {
      // Update transaction status
      await db.execute(
        'UPDATE transactions SET status = ? WHERE id = ?',
        ['completed', transaction.id]
      );

      // Update wallet balance
      const amount = parseFloat(transaction.amount);
      const [wallets] = await db.execute('SELECT * FROM wallet WHERE user_id = ?', [userId]);
      
      if (wallets.length > 0) {
        const newBalance = parseFloat(wallets[0].balance || 0) + amount;
        await db.execute(
          'UPDATE wallet SET balance = ? WHERE user_id = ?',
          [newBalance, userId]
        );
        console.log('Wallet updated:', { userId, newBalance });
      } else {
        // Create wallet if it doesn't exist
        await db.execute(
          'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
          [userId, amount, 0]
        );
        console.log('Wallet created:', { userId, balance: amount });
      }
    } else if (newStatus === 'failed' && transaction.status === 'pending') {
      // Update transaction status to failed
      await db.execute(
        'UPDATE transactions SET status = ? WHERE id = ?',
        ['failed', transaction.id]
      );
      console.log('Transaction marked as failed:', transaction.id);
    } else {
      console.log('Transaction status unchanged or not actionable:', { old: transaction.status, new: newStatus });
    }

    // Tpay expects 'TRUE' response
    res.send('TRUE');
  } catch (error) {
    console.error('Tpay notification error:', error);
    console.error('Error details:', error?.response?.data);
    res.status(500).send('Error');
  }
});

// CashBill payment status check (for frontend polling)
router.get('/payment-status/:transactionId', authenticate, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const [transactions] = await db.execute(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.userId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const transaction = transactions[0];

    res.json({
      id: transaction.id,
      status: transaction.status,
      amount: parseFloat(transaction.amount),
      created_at: transaction.created_at
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if user has enough balance for creating an offer
router.get('/check-balance', authenticate, async (req, res) => {
  try {
    const wallet = await walletService.getUserWallet(req.userId);
    
    if (!wallet) {
      // Should ideally be created by getUserWallet if not exists
       const basePrice = walletService.calculateOfferPrice(0);
       return res.json({ hasBalance: false, balance: 0, required: basePrice, discount: 0 });
    }

    const balance = parseFloat(wallet.balance || 0);
    const offersCreated = parseInt(wallet.offers_created || 0);
    
    const offerPrice = walletService.calculateOfferPrice(offersCreated);
    const basePrice = walletService.calculateOfferPrice(0);
    
    const hasBalance = balance >= offerPrice;

    res.json({
      hasBalance,
      balance,
      required: offerPrice,
      discount: (1 - (offerPrice / basePrice)) * 100
    });
  } catch (error) {
    console.error('Check balance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Charge wallet for creating an offer
router.post('/charge', authenticate, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const wallet = await walletService.getUserWallet(req.userId);
    const offersCreated = parseInt(wallet.offers_created || 0);
    const offerPrice = walletService.calculateOfferPrice(offersCreated);
    const basePrice = walletService.calculateOfferPrice(0);

    // Get product name for description
    let description = 'Utworzenie oferty';
    try {
        const [products] = await db.execute('SELECT product_name FROM products WHERE id = ?', [productId]);
        if (products.length > 0) {
            description = `Utworzenie oferty: ${products[0].product_name}`;
        }
    } catch (e) {
        console.error('Error fetching product name for charge:', e);
    }

    try {
        const result = await walletService.chargeWallet(req.userId, offerPrice, 'offer_creation', productId, null, description);
        
        // Update offers_created count (chargeWallet doesn't do this specifically for offers)
        // We need to do it manually or add a method to service.
        // Since chargeWallet is generic, let's update offers_created here.
        // Ideally chargeOfferCreation should be a method in service.
        
        const newOffersCreated = offersCreated + 1;
        await db.execute(
            'UPDATE wallet SET offers_created = ? WHERE user_id = ?',
            [newOffersCreated, req.userId]
        );

        res.json({
          success: true,
          newBalance: result.newBalance,
          offersCreated: newOffersCreated,
          priceCharged: offerPrice,
          discount: (1 - (offerPrice / basePrice)) * 100
        });

    } catch (err) {
        if (err.message === 'Insufficient funds') {
             return res.status(402).json({ error: 'Niewystarczające saldo', balance: parseFloat(wallet.balance), required: offerPrice });
        }
        throw err;
    }
  } catch (error) {
    console.error('Charge wallet error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual top-up (only for user id: 1)
router.post('/manual-topup', authenticate, async (req, res) => {
  try {
    // Only allow for user id: 1, 2, 3
    if (![1, 2, 3].includes(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const amount = 10.00; // Fixed amount: 10 PLN

    // Get or create wallet
    const [wallets] = await db.execute('SELECT * FROM wallet WHERE user_id = ?', [req.userId]);
    
    let wallet;
    if (wallets.length === 0) {
      // Create wallet with bonus
      const [result] = await db.execute(
        'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
        [req.userId, amount, 0]
      );
      wallet = {
        id: result.insertId,
        user_id: req.userId,
        balance: amount,
        offers_created: 0
      };
    } else {
      wallet = wallets[0];
      // Update wallet balance
      const newBalance = parseFloat(wallet.balance || 0) + amount;
      await db.execute(
        'UPDATE wallet SET balance = ? WHERE user_id = ?',
        [newBalance, req.userId]
      );
      wallet.balance = newBalance;
    }

    // Create transaction record
    await db.execute(
      'INSERT INTO transactions (user_id, type, amount, status) VALUES (?, ?, ?, ?)',
      [req.userId, 'manual_topup', amount, 'completed']
    );

    res.json({
      success: true,
      newBalance: parseFloat(wallet.balance || 0),
      amount: amount
    });
  } catch (error) {
    console.error('Manual top-up error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Submit a complaint for a transaction
router.post('/complaint/:transactionId', authenticate, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { reason } = req.body;
        
        // Validate ownership
        const [transactions] = await db.execute(
            'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
            [transactionId, req.userId]
        );

        if (transactions.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = transactions[0];

        // Send Discord notification
        await notificationService.sendDiscordWebhook(
            'Zgłoszenie reklamacji transakcji',
            `Użytkownik ID ${req.userId} zgłosił reklamację do transakcji #${transactionId}`,
            [
                { name: 'Transaction ID', value: String(transactionId), inline: true },
                { name: 'User ID', value: String(req.userId), inline: true },
                { name: 'Amount', value: `${transaction.amount} PLN`, inline: true },
                { name: 'Type', value: transaction.type || 'unknown', inline: true },
                { name: 'Description', value: transaction.description || 'Brak opisu', inline: false },
                { name: 'Reason', value: reason || 'Brak uzasadnienia', inline: false },
                { name: 'Date', value: new Date(transaction.created_at).toLocaleString('pl-PL'), inline: false }
            ],
            0xe74c3c // Red color
        );

        res.json({ success: true, message: 'Zgłoszenie zostało wysłane' });
    } catch (error) {
        console.error('Complaint error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
