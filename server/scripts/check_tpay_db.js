const db = require('../config/database');

async function checkDatabase() {
  try {
    console.log('🔍 Sprawdzanie struktury bazy danych pod Tpay...');
    
    const dbName = process.env.DB_NAME || 'wystawka';
    let missingElements = [];
    let warnings = [];

    // 1. Sprawdź tabelę transactions
    const [transactionsTable] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'transactions'
    `);

    if (transactionsTable.length === 0) {
      missingElements.push('Tabela "transactions" nie istnieje!');
    } else {
      console.log('✅ Tabela "transactions" istnieje.');

      // 2. Sprawdź kolumnę external_id (KLUCZOWA dla Tpay)
      const [externalIdCol] = await db.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${dbName}' 
        AND TABLE_NAME = 'transactions' 
        AND COLUMN_NAME = 'external_id'
      `);

      if (externalIdCol.length === 0) {
        missingElements.push('Brak kolumny "external_id" w tabeli "transactions". Tpay nie może zapisać ID transakcji.');
      } else {
        console.log('✅ Kolumna "external_id" istnieje.');
      }

      // 3. Sprawdź czy product_id pozwala na NULL (doładowania portfela nie mają produktu)
      const [productIdCol] = await db.execute(`
        SELECT IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${dbName}' 
        AND TABLE_NAME = 'transactions' 
        AND COLUMN_NAME = 'product_id'
      `);

      if (productIdCol.length > 0 && productIdCol[0].IS_NULLABLE === 'NO') {
        warnings.push('Kolumna "product_id" nie pozwala na wartości NULL. Doładowania portfela mogą powodować błędy.');
      }
    }

    // 4. Sprawdź tabelę wallet
    const [walletTable] = await db.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = '${dbName}' AND TABLE_NAME = 'wallet'
    `);

    if (walletTable.length === 0) {
      missingElements.push('Tabela "wallet" nie istnieje! Użytkownik nie otrzyma środków po wpłacie.');
    } else {
      console.log('✅ Tabela "wallet" istnieje.');
    }

    console.log('\n--- RAPORT ---');
    if (missingElements.length === 0 && warnings.length === 0) {
      console.log('🟢 Struktura bazy danych wygląda poprawnie dla integracji Tpay.');
    } else {
      if (missingElements.length > 0) {
        console.log('🔴 BŁĘDY KRYTYCZNE:');
        missingElements.forEach(err => console.log(` - ${err}`));
        console.log('\nRozwiązanie: Uruchom skrypt migracji, np. "node server/scripts/fix_transactions_table.js" lub "node server/scripts/migrate_to_mysql.js"');
      }
      if (warnings.length > 0) {
        console.log('🟡 OSTRZEŻENIA:');
        warnings.forEach(warn => console.log(` - ${warn}`));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Błąd podczas sprawdzania bazy:', error);
    process.exit(1);
  }
}

checkDatabase();