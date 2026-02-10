const db = require('../config/database');

async function fixMissingDescriptions() {
  try {
    console.log('Starting fix for missing transaction descriptions...');
    
    const [transactions] = await db.execute(
      `SELECT t.id, t.product_id, p.product_name 
       FROM transactions t 
       JOIN products p ON t.product_id = p.id 
       WHERE t.type = 'offer_creation' 
       AND (t.description IS NULL OR t.description = '')`
    );

    console.log(`Found ${transactions.length} transactions to fix.`);

    for (const tx of transactions) {
      if (tx.product_name) {
        const newDescription = `Utworzenie oferty: ${tx.product_name}`;
        await db.execute(
          'UPDATE transactions SET description = ? WHERE id = ?',
          [newDescription, tx.id]
        );
        console.log(`Updated transaction #${tx.id} with description: ${newDescription}`);
      }
    }

    console.log('Fix completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing descriptions:', error);
    process.exit(1);
  }
}

fixMissingDescriptions();

