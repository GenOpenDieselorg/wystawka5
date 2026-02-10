const db = require('../config/database');

const BASE_OFFER_PRICE = 1.09; // 1.09 zł netto
const BASE_AI_DESCRIPTION_PRICE = BASE_OFFER_PRICE; // Same as offer price

class WalletService {
    // Calculate offer price with discount based on number of offers created
    // Returns price for the NEXT offer (offersCreated + 1)
    // Prices are NETTO (without VAT)
    calculateOfferPrice(offersCreated) {
        const offersCount = parseInt(offersCreated || 0);
        const nextOfferNumber = offersCount + 1;

        // Progressive pricing tiers (NETTO)
        // od 1 do 100 ofert: 1.09 zł netto
        // od 100 do 400: 0.99 zł netto (od 101)
        // od 400 do 800: 0.89 zł netto (od 401)
        // od 800 ofert: 0.79 zł netto (od 801)
        if (nextOfferNumber > 800) {
            return 0.79; // 0.79 zł netto
        } else if (nextOfferNumber > 400) {
            return 0.89; // 0.89 zł netto
        } else if (nextOfferNumber > 100) {
            return 0.99; // 0.99 zł netto
        } else {
            return BASE_OFFER_PRICE; // 1.09 zł netto
        }
    }

    // Calculate total price for N offers starting from a given number of offers created
    // This is used for the calculator to show total cost
    calculateTotalPrice(startingOffersCreated, numberOfOffers) {
        let total = 0;
        let currentOfferNumber = parseInt(startingOffersCreated || 0);
        
        for (let i = 0; i < numberOfOffers; i++) {
            total += this.calculateOfferPrice(currentOfferNumber);
            currentOfferNumber++;
        }
        
        return total;
    }

    calculateAiDescriptionPrice(offersCreated) {
        // Use exactly the same pricing logic as for creating offers
        return this.calculateOfferPrice(offersCreated);
    }

    async getUserWallet(userId) {
        const [wallets] = await db.execute('SELECT * FROM wallet WHERE user_id = ?', [userId]);
        
        if (wallets.length === 0) {
            // Create wallet with 0 balance
            const [result] = await db.execute(
                'INSERT INTO wallet (user_id, balance, offers_created) VALUES (?, ?, ?)',
                [userId, 0, 0]
            );
            return {
                id: result.insertId,
                user_id: userId,
                balance: 0,
                offers_created: 0
            };
        }
        
        return wallets[0];
    }

    async checkBalance(userId, requiredAmount) {
        const wallet = await this.getUserWallet(userId);
        return {
            hasBalance: parseFloat(wallet.balance) >= requiredAmount,
            balance: parseFloat(wallet.balance),
            wallet
        };
    }

    async chargeWallet(userId, amount, type, productId = null, externalId = null, description = null) {
        // Safeguard: If productId looks like an Allegro ID (large number), treat it as externalId if externalId is missing
        if (productId && (typeof productId === 'string' || typeof productId === 'number') && String(productId).length > 9) {
             console.warn(`[Wallet] Warning: productId ${productId} looks like an external ID. Moving to externalId.`);
             if (!externalId) {
                 externalId = productId;
                 productId = null;
             }
        }

        console.log(`[Wallet] Charging user ${userId} amount ${amount} for ${type} productId ${productId} externalId ${externalId} desc ${description}`);
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [wallets] = await connection.execute('SELECT * FROM wallet WHERE user_id = ? FOR UPDATE', [userId]);
            
            if (wallets.length === 0) {
                throw new Error('Wallet not found');
            }

            const wallet = wallets[0];
            const currentBalance = parseFloat(wallet.balance);

            if (currentBalance < amount) {
                throw new Error('Insufficient funds');
            }

            const newBalance = currentBalance - amount;
            
            // Update wallet
            await connection.execute(
                'UPDATE wallet SET balance = ? WHERE user_id = ?',
                [newBalance, userId]
            );

            // Create transaction record
            await connection.execute(
                'INSERT INTO transactions (user_id, type, amount, status, product_id, external_id, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, type, -amount, 'completed', productId, externalId, description]
            );

            await connection.commit();
            return { success: true, newBalance };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Specific method for charging for AI description
    async chargeForAiDescription(userId, offerId, description = null) {
        const wallet = await this.getUserWallet(userId);
        const offersCreated = parseInt(wallet.offers_created || 0);
        const price = this.calculateAiDescriptionPrice(offersCreated);
        
        // Charge wallet
        const result = await this.chargeWallet(userId, price, 'ai_description_update', null, offerId, description || `Masowa edycja (AI) dla oferty ${offerId}`);
        
        // Update offers_created count - AI descriptions count towards the same counter as offers
        const newOffersCreated = offersCreated + 1;
        await db.execute(
            'UPDATE wallet SET offers_created = ? WHERE user_id = ?',
            [newOffersCreated, userId]
        );
        
        return result;
    }
}

module.exports = new WalletService();

