const db = require('../config/database');
const logger = require('./logger');

async function initDefaultAiTemplate() {
  try {
    // 1. CZYSZCZENIE: Usuń stary, niesekcyjny szablon (cleanup legacy)
    try {
        await db.execute("DELETE FROM ai_templates WHERE name = 'Domyślny szablon Allegro'");
    } catch (e) {
        // Ignorujemy błąd
    }

    // =========================================================================
    // SZABLON 1: STANDARDOWY (Prosty, sekcyjny)
    // =========================================================================
    const templateStructure = [
      {
        type: 'text',
        name: 'Nagłówek i Wstęp',
        content: 'Napisz nagłówek <H1> z nazwą produktu: {productName}. Następnie napisz akapit wstępu marketingowego (język korzyści), opisujący główne zastosowanie produktu. Potwierdź jakość i skuteczność. Nie używaj list punktowanych w tej sekcji.'
      },
      {
        type: 'image',
        name: 'Zdjęcie główne'
      },
      {
        type: 'text',
        name: 'Kluczowe Cechy',
        content: 'Napisz nagłówek <H2> "Kluczowe cechy" lub "Zalety". Następnie stwórz listę punktowaną (<ul><li>) wymieniającą najważniejsze atuty produktu, innowacyjną formułę lub unikalne funkcje. Używaj tagu <b> do pogrubiania kluczowych fraz.'
      },
      {
        type: 'image',
        name: 'Zdjęcie 2'
      },
      {
        type: 'text',
        name: 'Specyfikacja i Zastosowanie',
        content: 'Napisz nagłówek <H2> "Specyfikacja i Zastosowanie". Opisz dokładnie jak używać produktu lub gdzie znajduje zastosowanie. Poniżej wypisz dane techniczne, skład, wymiary lub parametry (na podstawie {parameters} i {eanCode}) w czytelnej formie.'
      },
      {
        type: 'text',
        name: 'Dodatkowe Dane',
        content: 'Napisz nagłówek <H2> "Wymiary i Waga". Wypisz podane wymiary: {user_wymiary} oraz wagę: {user_waga}.',
        is_optional: true,
        requires_input: true,
        input_fields: [
            { name: 'user_wymiary', label: 'Wymiary (np. 10x20x5 cm)' },
            { name: 'user_waga', label: 'Waga (np. 0.5 kg)' }
        ]
      },
      {
        type: 'image',
        name: 'Zdjęcie 3'
      },
      {
        type: 'text',
        name: 'Podsumowanie',
        content: 'Napisz nagłówek <H2> "Dlaczego warto?". Krótkie podsumowanie zachęcające do zakupu.'
      }
    ];

    await createOrUpdateTemplate(
        'Domyślny szablon Allegro (Sekcyjny)', 
        templateStructure, 
        'General'
    );

    // =========================================================================
    // SZABLON 2: PREMIUM (Styl "Lehmann" - Emocjonalny, Sprzedażowy)
    // =========================================================================
    const lehmannStructure = [
      {
        type: 'text',
        name: 'Nagłówek i Wstęp Emocjonalny',
        content: `Napisz <H1> z pełną nazwą produktu: {productName} (DODAJ PRZYMIOTNIKI: MOCNY, WYDAJNY, PROFESJONALNY).
        Następnie napisz wstęp w stylu: "Marzą Ci się [efekt końcowy]? Mamy na to sposób!".
        Opisz produkt {productName} jako urządzenie o imponujących parametrach i przemyślanej konstrukcji.
        Zakończ zdaniem: "Odkryj olśniewające efekty bez zbędnej dodatkowej pracy!".
        Styl: entuzjastyczny, bezpośredni zwrot do klienta.`
      },
      {
        type: 'image',
        name: 'Zdjęcie główne'
      },
      {
        type: 'text',
        name: 'Rozwiązanie problemu',
        content: `Napisz <H2> "Nasz produkt jest przełomowym rozwiązaniem dla [Ciebie/Twojego Domu]!".
        Napisz akapit: "Dlaczego wybierać kompromisy?". Wyjaśnij, że ten produkt gwarantuje wysoką jakość, nie tracąc na funkcjonalności.
        Zadaj pytanie retoryczne: "Czy kiedykolwiek zastanawiałeś się, co stoi za sukcesem...?".
        Odpowiedz, że ten produkt ma wszystko, aby to zapewnić.`
      },
      {
        type: 'text',
        name: 'Najważniejsze Zalety (Lista)',
        content: `Napisz <H2> "Najważniejsze zalety:".
        Stwórz listę punktowaną (<ul><li>).
        Każdy punkt zacznij od pogrubionej frazy (tag <b>), np. "<b>Ekspresowe działanie</b> - opis...".
        Wymień 5-6 kluczowych zalet na podstawie parametrów: {parameters}.
        Podkreśl takie cechy jak: nowoczesność, bezpieczeństwo, wygoda, styl.`
      },
      {
        type: 'image',
        name: 'Zdjęcie detalu'
      },
      {
        type: 'text',
        name: 'Specyfikacja Techniczna',
        content: `Napisz <H2> "Specyfikacja techniczna".
        Wypisz dane w formie prostej listy (Model, Parametry, Materiał, Wymiary, Zasilanie itp.) korzystając z danych: {parameters}, {eanCode}, {manufacturer}.
        Dodaj linię: "Certyfikat: CE" (jeśli dotyczy).`
      },
      {
        type: 'image',
        name: 'Zdjęcie w użyciu'
      },
      {
        type: 'text',
        name: 'Rozwinięcie Cech (Szczegółowe)',
        content: `W tej sekcji opisz 4-5 kluczowych funkcji produktu w osobnych akapitach.
        Każdy akapit poprzedź nagłówkiem <H2> w stylu marketingowym (np. "Imponująca szybkość...", "Niespotykane rozwiązanie...", "Nieporównywalnie lepsza jakość...").
        Opisz te funkcje językiem korzyści, używając fraz typu: "Gwarantuje to...", "Dzięki temu unikamy...", "To wygodne rozwiązanie...".
        Wykorzystaj dostępne informacje o produkcie.`
      },
      {
        type: 'text',
        name: 'Zakończenie Premium',
        content: `Napisz <H2> "Zdumiewający design".
        Napisz krótkie podsumowanie, że produkt {productName} wyznacza trendy i jest praktycznym dodatkiem.
        Zakończ wezwaniem do działania: "Jeszcze dziś zapewnij sobie odrobinę luksusu." lub "Kup jednym kliknięciem i doświadcz różnicy!".`
      }
    ];

    await createOrUpdateTemplate(
        'Szablon Premium (Styl Marketingowy)', 
        lehmannStructure, 
        'Premium'
    );

  } catch (error) {
    logger.error('Failed to initialize default AI templates:', error);
  }
}

// Helper function to insert/update templates
async function createOrUpdateTemplate(name, structure, category) {
    const content = JSON.stringify(structure);
    const isGlobal = 1;

    // Check if template exists
    const [existing] = await db.execute(
      'SELECT id FROM ai_templates WHERE name = ? AND is_global = 1',
      [name]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE ai_templates SET content = ?, category = ? WHERE id = ?',
        [content, category, existing[0].id]
      );
      logger.info(`Template '${name}' updated.`);
    } else {
      let userId = null;
      try {
          const [users] = await db.execute('SELECT id FROM users ORDER BY id ASC LIMIT 1');
          if (users.length > 0) userId = users[0].id;
      } catch (e) {}

      await db.execute(
        'INSERT INTO ai_templates (name, content, category, user_id, is_global) VALUES (?, ?, ?, ?, ?)',
        [name, content, category, userId, isGlobal]
      );
      logger.info(`Template '${name}' created.`);
    }
}

module.exports = initDefaultAiTemplate;
