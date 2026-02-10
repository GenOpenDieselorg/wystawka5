/**
 * Generates static HTML for landing page
 * This ensures fast loading and Google/AI can read the page content without JavaScript
 * All users receive this static HTML for landing page (no JavaScript needed)
 */
const generateLandingPageHTML = () => {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#1976d2" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" sizes="32x32" href="/logo-icon.png" />
  <link rel="icon" type="image/svg+xml" href="/logo-icon.svg" />
  <link rel="apple-touch-icon" sizes="180x180" href="/logo-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  
  <!-- Primary Meta Tags -->
  <title>wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI</title>
  <meta name="title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
  <meta name="description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
  <meta name="keywords" content="wystawianie ofert, Allegro, OLX, Erli, Otomoto, AI, automatyczne opisy produktów, marketplace, sprzedaż online, zarządzanie aukcjami" />
  <meta name="author" content="wystawoferte.pl" />
  <meta name="robots" content="index, follow" />
  <meta name="language" content="Polish" />
  <meta name="revisit-after" content="7 days" />
  <meta name="geo.region" content="PL" />
  <meta name="geo.placename" content="Poland" />
  <meta name="rating" content="general" />
  <meta name="distribution" content="global" />
  <meta name="copyright" content="wystawoferte.pl" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://wystawoferte.pl/" />
  <meta property="og:title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
  <meta property="og:description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
  <meta property="og:image" content="https://wystawoferte.pl/logo.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="wystawoferte.pl - Automatyczne tworzenie ofert z AI" />
  <meta property="og:locale" content="pl_PL" />
  <meta property="og:site_name" content="wystawoferte.pl" />
  <meta property="og:type" content="website" />
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="https://wystawoferte.pl/" />
  <meta property="twitter:title" content="wystawoferte.pl - Wystawiaj oferty na wszystkie platformy w 30 sekund z AI" />
  <meta property="twitter:description" content="Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia. Tylko 1 PLN za aukcję!" />
  <meta property="twitter:image" content="https://wystawoferte.pl/logo.png" />
  <meta property="twitter:image:alt" content="wystawoferte.pl - Automatyczne tworzenie ofert z AI" />
  <meta name="twitter:creator" content="@wystawoferte" />
  <meta name="twitter:site" content="@wystawoferte" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://wystawoferte.pl/" />
  
  <!-- Additional SEO -->
  <meta name="format-detection" content="telephone=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="wystawoferte.pl" />
  
  <!-- Structured Data (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "wystawoferte.pl",
    "url": "https://wystawoferte.pl",
    "description": "Automatyczne tworzenie i zarządzanie ofertami sprzedaży na Allegro, OLX, Erli, Otomoto i innych platformach. AI generuje profesjonalne opisy produktów i optymalizuje zdjęcia.",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "1.00",
      "priceCurrency": "PLN",
      "description": "1 PLN za aukcję"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "1250"
    },
    "featureList": [
      "Automatyczne generowanie opisów produktów z AI",
      "Edycja zdjęć przez AI",
      "Integracja z Allegro, OLX, Erli, Otomoto",
      "Wystawianie ofert w 30 sekund",
      "Zarządzanie wieloma platformami z jednego miejsca"
    ]
  }
  </script>
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "wystawoferte.pl",
    "url": "https://wystawoferte.pl",
    "logo": "https://wystawoferte.pl/logo.png",
    "sameAs": [
      "https://www.facebook.com/wystawoferte",
      "https://www.youtube.com/wystawoferte",
      "https://twitter.com/wystawoferte"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": "Polish"
    }
  }
  </script>
  
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Jak działa wystawoferte.pl?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "wystawoferte.pl to platforma do automatycznego tworzenia i zarządzania ofertami sprzedaży. Wystarczy dodać produkt, a nasze narzędzie AI wygeneruje profesjonalny opis i automatycznie opublikuje ofertę na wybranych platformach marketplace."
        }
      },
      {
        "@type": "Question",
        "name": "Ile kosztuje korzystanie z platformy?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Koszt publikacji jednej aukcji to 1 PLN. Oferujemy również pakiety z rabatami dla większych wolumenów."
        }
      },
      {
        "@type": "Question",
        "name": "Z jakimi platformami jest zintegrowana aplikacja?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Aktualnie aplikacja jest zintegrowana z Allegro i OLX. Pracujemy nad kolejnymi integracjami."
        }
      },
      {
        "@type": "Question",
        "name": "Czy moje dane są bezpieczne?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tak! Wszystkie dane są szyfrowane przy użyciu SSL/TLS. Platforma jest w pełni zgodna z RODO i regulaminem Allegro. Bezpieczeństwo to nasz priorytet."
        }
      },
      {
        "@type": "Question",
        "name": "Jak mogę otrzymać 50 PLN na start?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Użyj kodu polecającego \"STARTUJE\" podczas rejestracji. Otrzymasz 50 PLN na start, co odpowiada 50 darmowym aukcjom!"
        }
      },
      {
        "@type": "Question",
        "name": "Czy mogę anulować publikację?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tak, możesz anulować publikację przed jej finalizacją. Opłata jest pobierana tylko za pomyślnie opublikowane aukcje."
        }
      },
      {
        "@type": "Question",
        "name": "Czy aplikacja działa na telefonach?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Tak! wystawoferte.pl jest w pełni responsywna i działa doskonale na telefonach, tabletach i komputerach. Możesz zarządzać swoimi ofertami z dowolnego urządzenia, gdziekolwiek jesteś!"
        }
      }
    ]
  }
  </script>
  
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { text-align: center; padding: 60px 20px 40px; background: #fff; }
    h1 { font-size: 2.5em; margin-bottom: 20px; color: #1976d2; }
    h2 { font-size: 1.5em; margin-bottom: 30px; color: #666; }
    .cta-buttons { margin: 30px 0; }
    .btn { display: inline-block; padding: 12px 30px; margin: 10px; text-decoration: none; border-radius: 4px; font-weight: bold; }
    .btn-primary { background: #1976d2; color: white; }
    .btn-secondary { background: transparent; color: #1976d2; border: 2px solid #1976d2; }
    section { padding: 60px 20px; }
    .stats { background: #1976d2; color: white; text-align: center; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin-top: 40px; }
    .stat-item h3 { font-size: 3em; margin-bottom: 10px; }
    .features { background: #fff; }
    .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-top: 40px; }
    .feature-card { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .feature-card h3 { color: #1976d2; margin-bottom: 15px; }
    .pricing { text-align: center; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px; margin-top: 40px; }
    .pricing-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid transparent; }
    .pricing-card.featured { border-color: #1976d2; }
    .pricing-card h3 { font-size: 2.5em; color: #1976d2; margin: 20px 0; }
    .faq { background: #fff; }
    .faq-item { background: white; padding: 20px; margin-bottom: 15px; border-radius: 8px; }
    .faq-item h4 { color: #1976d2; margin-bottom: 10px; }
    footer { background: #333; color: white; text-align: center; padding: 40px 20px; }
    ul { list-style: none; padding-left: 0; }
    ul li:before { content: "✓ "; color: #1976d2; font-weight: bold; margin-right: 10px; }
    @media (max-width: 768px) {
      h1 { font-size: 1.8em; }
      .stats-grid, .features-grid, .pricing-grid { grid-template-columns: 1fr; }
    }
    .navbar { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 1000; }
    .navbar-content { display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; }
    .navbar-logo { font-size: 1.5em; font-weight: bold; color: #1976d2; text-decoration: none; }
    .navbar-links { display: flex; gap: 20px; align-items: center; }
    .navbar-links a { color: #333; text-decoration: none; font-weight: 500; transition: color 0.3s; }
    .navbar-links a:hover { color: #1976d2; }
    @media (max-width: 768px) {
      .navbar-links { flex-direction: column; gap: 10px; }
      .navbar-content { flex-direction: column; }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <div class="container">
      <div class="navbar-content">
        <a href="/" class="navbar-logo">wystawoferte.pl</a>
        <div class="navbar-links">
          <a href="/#funkcje">Funkcje</a>
          <a href="/cennik">Cennik</a>
          <a href="/marketplaces">Platformy</a>
          <a href="/faq">FAQ</a>
          <a href="/register" class="btn btn-primary" style="padding: 8px 20px; margin: 0;">Rozpocznij</a>
        </div>
      </div>
    </div>
  </nav>
  
  <header>
    <div class="container">
      <h1>Wystawiaj oferty na wszystkie platformy nawet w 30 sekund</h1>
      <h2>Wspieramy: <strong>Allegro</strong>, <strong>OLX</strong>, <strong>Erli</strong>, <strong>Otomoto</strong> i wiele innych</h2>
      <div style="max-width: 800px; margin: 30px auto; position: relative;">
        <video autoplay loop muted playsinline style="width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <source src="/hero-video.mp4" type="video/mp4">
          Twoja przeglądarka nie obsługuje odtwarzania wideo.
        </video>
      </div>
      <p style="font-size: 1.1em; margin: 20px 0; color: #666;">
        wystawoferte.pl to nowoczesna platforma do kompleksowego zarządzania ofertami, produktami i integracjami z marketplace'ami.
        Zautomatyzuj swoją sprzedaż dzięki sztucznej inteligencji.
      </p>
      <div class="cta-buttons">
        <a href="/register" class="btn btn-primary">Rozpocznij za darmo</a>
        <a href="/login" class="btn btn-secondary">Zaloguj się</a>
      </div>
    </div>
  </header>

  <section class="stats">
    <div class="container">
      <div class="stats-grid">
        <div class="stat-item">
          <h3>1,250+</h3>
          <p>Zarejestrowanych użytkowników</p>
        </div>
        <div class="stat-item">
          <h3>45,000+</h3>
          <p>Aukcji miesięcznie</p>
        </div>
      </div>
    </div>
  </section>

  <section id="funkcje" class="features">
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Zaawansowana Sztuczna Inteligencja</h2>
      <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin-bottom: 40px;">
        <a href="/informacje" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Informacje</a>
        <a href="/jak-w-30-sekund" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Jak to działa w 30 sekund?</a>
        <a href="/allegro-legalne" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Czy Allegro jest legalne?</a>
        <a href="/kalkulator" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Kalkulator kosztów</a>
        <a href="/przyklady" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Przykładowe opisy</a>
        <a href="/opinie" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Opinie użytkowników</a>
        <a href="/marketplaces" class="btn btn-secondary" style="padding: 8px 16px; font-size: 0.9em;">Integracje z marketplace'ami</a>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <h3>Generowanie Opisów z AI</h3>
          <p>Nasze AI automatycznie generuje profesjonalne opisy produktów na podstawie nazwy produktu, kodu EAN (kod kreskowy) i Twoich własnych wytycznych.</p>
          <ul>
            <li>Nazwy produktu</li>
            <li>Kodu EAN (kod kreskowy)</li>
            <li>Twoich własnych wytycznych</li>
          </ul>
          <p style="margin-top: 15px; font-style: italic;">Możesz określić konkretne wymogi, jak AI ma generować opisy - styl, długość, akcenty marketingowe i więcej!</p>
        </div>
        <div class="feature-card">
          <h3>Edycja Zdjęć przez AI</h3>
          <p>Nasze AI automatycznie edytuje zdjęcia produktów:</p>
          <ul>
            <li>Usuwa tło</li>
            <li>Optymalizuje jakość</li>
            <li>Dostosowuje do Twoich wytycznych</li>
          </ul>
          <p style="margin-top: 15px; font-style: italic;">Możesz określić, jak AI ma edytować zdjęcia - styl tła, kolorystyka, kompozycja i więcej!</p>
        </div>
        <div class="feature-card">
          <h3>Personalizacja AI</h3>
          <p>Masz pełną kontrolę nad tym, jak AI generuje treści:</p>
          <ul>
            <li>Własne szablony opisów</li>
            <li>Style edycji zdjęć</li>
            <li>Preferencje marketingowe</li>
          </ul>
          <p style="margin-top: 15px; font-style: italic;">AI uczy się Twoich preferencji i dostosowuje się do Twojego stylu!</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">5 powody, dla których wystawoferte jest najlepszym wyborem dla Ciebie</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>1. Szybkość i Efektywność</h3>
          <p>Wystaw ofertę w zaledwie 30 sekund. Automatyczne generowanie opisów przez AI oszczędza godziny pracy każdego dnia.</p>
        </div>
        <div class="feature-card">
          <h3>2. Oszczędność Kosztów</h3>
          <p>Tylko 1 PLN za aukcję zamiast tysięcy złotych miesięcznie na wynagrodzenia pracowników. Rabaty progresywne dla większych wolumenów.</p>
        </div>
        <div class="feature-card">
          <h3>3. Profesjonalne Opisy</h3>
          <p>AI generuje profesjonalne, zoptymalizowane pod SEO opisy produktów, które zwiększają konwersję i widoczność ofert.</p>
        </div>
        <div class="feature-card">
          <h3>4. Wielokanałowość</h3>
          <p>Jedna oferta, wiele platform. Publikuj jednocześnie na Allegro, OLX, Erli, Otomoto i innych marketplace'ach.</p>
        </div>
        <div class="feature-card">
          <h3>5. Dostępność 24/7</h3>
          <p>Platforma działa non-stop. Wystawiaj oferty o każdej porze dnia i nocy, bez ograniczeń czasowych.</p>
        </div>
      </div>
    </div>
  </section>

  <section style="background: #f9f9f9;">
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Odkryj możliwości wystawoferte.pl</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>AI Wspiera Sprzedaż</h3>
          <p>Automatyczne generowanie opisów produktów i optymalizacja ofert dzięki zaawansowanym algorytmom AI.</p>
        </div>
        <div class="feature-card">
          <h3>Wielokanałowość</h3>
          <p>Integracja z Allegro, OLX i innymi platformami w jednym miejscu. Zarządzaj wszystkim z jednego panelu.</p>
        </div>
        <div class="feature-card">
          <h3>Portfel i Finanse</h3>
          <p>Łatwe zarządzanie środkami, doładowania i przejrzysta historia transakcji.</p>
        </div>
        <div class="feature-card">
          <h3>Automatyzacja</h3>
          <p>Oszczędzaj czas dzięki automatyzacji powtarzalnych zadań i procesów wystawiania ofert.</p>
        </div>
        <div class="feature-card">
          <h3>Edycja Zdjęć przez AI</h3>
          <p>Automatyczne usuwanie tła, optymalizacja jakości i dostosowanie zdjęć do Twoich wytycznych.</p>
        </div>
        <div class="feature-card">
          <h3>Zarządzanie Produktami</h3>
          <p>Centralne zarządzanie wszystkimi produktami, ofertami i integracjami z jednego miejsca.</p>
        </div>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Porównanie: Z wystawoferte.pl vs Bez wystawoferte.pl</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px;">
        <div class="feature-card">
          <h3 style="color: #d32f2f; margin-bottom: 20px;">❌ Bez wystawoferte.pl</h3>
          <div style="margin-bottom: 20px;">
            <img src="/przed.jpg" alt="Przed - bez wystawoferte" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
          </div>
          <ul>
            <li>Ręczne tworzenie opisów - 15-30 minut na ofertę</li>
            <li>Wysokie koszty zatrudnienia pracowników</li>
            <li>Błędy i niespójności w opisach</li>
            <li>Ograniczona dostępność (8h/dzień)</li>
            <li>Trudność w zarządzaniu wieloma platformami</li>
            <li>Brak optymalizacji SEO</li>
          </ul>
        </div>
        <div class="feature-card">
          <h3 style="color: #1976d2; margin-bottom: 20px;">✅ Z wystawoferte.pl</h3>
          <div style="margin-bottom: 20px;">
            <img src="/po.jpg" alt="Po - z wystawoferte" style="width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
          </div>
          <ul>
            <li>Automatyczne generowanie opisów - 30 sekund na ofertę</li>
            <li>Tylko 1 PLN za aukcję</li>
            <li>Profesjonalne, spójne opisy</li>
            <li>Dostępność 24/7</li>
            <li>Automatyczna publikacja na wielu platformach</li>
            <li>Zaawansowana optymalizacja SEO przez AI</li>
          </ul>
        </div>
      </div>
      <style>
        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    </div>
  </section>

  <section id="cennik" class="pricing">
    <div class="container">
      <h2 style="font-size: 2em; margin-bottom: 20px;">Cennik (rabaty progresywne)</h2>
      <p style="text-align: center; color: #666; margin-bottom: 40px;">Cena za ofertę oraz edycję opisu AI zależy od numeru oferty. Każda oferta ma swoją cenę w zależności od przedziału.</p>
      <table style="width: 100%; max-width: 600px; margin: 0 auto 30px; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #1976d2; color: white;">
            <th style="padding: 15px; text-align: left; font-weight: bold;">Przedział ofert</th>
            <th style="padding: 15px; text-align: center; font-weight: bold;">Cena za ofertę</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">1-100 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">1.00 PLN</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">101-200 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.90 PLN</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">201-300 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.80 PLN</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">301-400 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.75 PLN</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">401-500 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.70 PLN</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">501-1000 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.65 PLN</td>
          </tr>
          <tr>
            <td style="padding: 15px;">Powyżej 1000 ofert</td>
            <td style="padding: 15px; text-align: center; font-weight: bold;">0.60 PLN</td>
          </tr>
        </tbody>
      </table>
      <div style="background: #f5f5f5; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
        <h3 style="font-size: 1.3em; margin-bottom: 15px; color: #1976d2;">Przykłady:</h3>
        <p style="margin-bottom: 10px;">• 99 ofert = 99 × 1.00 PLN = 99.00 PLN</p>
        <p style="margin-bottom: 10px;">• 100 ofert = 99 × 1.00 PLN + 1 × 0.90 PLN = 99.90 PLN</p>
        <p style="margin-top: 20px; font-style: italic; color: #666;">Licznik zwiększa się przy tworzeniu oferty, nie przy usuwaniu.</p>
      </div>
    </div>
  </section>

  <section style="background: #f5f5f5; padding: 60px 20px;">
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Zwykły pracownik vs wystawoferte.pl</h2>
      <table style="width: 100%; max-width: 900px; margin: 0 auto; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #1976d2; color: white;">
            <th style="padding: 15px; text-align: left; font-weight: bold; font-size: 1.1em;">Funkcja</th>
            <th style="padding: 15px; text-align: center; font-weight: bold; font-size: 1.1em;">Zwykły pracownik</th>
            <th style="padding: 15px; text-align: center; font-weight: bold; font-size: 1.1em; color: #fff;">wystawoferte.pl</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Czas na stworzenie jednej aukcji</td>
            <td style="padding: 15px; text-align: center;">15-30 minut</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ 2-5 minut</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Koszt miesięczny</td>
            <td style="padding: 15px; text-align: center;">3000-5000 PLN</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ 1 PLN/aukcja</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Dostępność</td>
            <td style="padding: 15px; text-align: center; color: #d32f2f;">✗ 8h/dzień</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ 24/7</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Błędy i pomyłki</td>
            <td style="padding: 15px; text-align: center;">Częste</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ Minimalne</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Skalowalność</td>
            <td style="padding: 15px; text-align: center;">Ograniczona</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ Nieograniczona</td>
          </tr>
          <tr style="border-bottom: 1px solid #e0e0e0;">
            <td style="padding: 15px;">Wielokanałowość</td>
            <td style="padding: 15px; text-align: center; color: #d32f2f;">✗ Trudna</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ Automatyczna</td>
          </tr>
          <tr>
            <td style="padding: 15px;">Optymalizacja SEO</td>
            <td style="padding: 15px; text-align: center;">Podstawowa</td>
            <td style="padding: 15px; text-align: center; color: #2e7d32; font-weight: bold;">✓ Zaawansowana AI</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Dodatkowe Korzyści</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3 style="font-size: 2.5em; color: #1976d2; margin-bottom: 15px;">30 sekund</h3>
          <h4 style="font-size: 1.2em; margin-bottom: 10px;">Czas na wystawienie oferty</h4>
          <p>Od dodania produktu do publikacji na wszystkich platformach - wszystko w zaledwie 30 sekund!</p>
        </div>
        <div class="feature-card">
          <h3 style="font-size: 2.5em; color: #1976d2; margin-bottom: 15px;">24/7</h3>
          <h4 style="font-size: 1.2em; margin-bottom: 10px;">Dostępność</h4>
          <p>Platforma działa non-stop. Wystawiaj oferty o każdej porze dnia i nocy, bez ograniczeń!</p>
        </div>
        <div class="feature-card">
          <h3 style="font-size: 2.5em; color: #1976d2; margin-bottom: 15px;">100%</h3>
          <h4 style="font-size: 1.2em; margin-bottom: 10px;">Zgodność z regulaminami</h4>
          <p>Wszystkie oferty są automatycznie weryfikowane pod kątem zgodności z regulaminami platform.</p>
        </div>
      </div>
    </div>
  </section>

  <section style="background: #1976d2; color: white; text-align: center;">
    <div class="container">
      <h2 style="font-size: 2em; margin-bottom: 20px;">Otrzymaj 50 PLN na start!</h2>
      <p style="font-size: 1.2em; margin-bottom: 30px;">
        Użyj kodu polecającego <strong>"STARTUJE"</strong> podczas rejestracji
      </p>
      <p style="margin-bottom: 30px;">To 50 darmowych aukcji do wykorzystania od razu po rejestracji!</p>
      <div style="background: white; color: #1976d2; padding: 20px; display: inline-block; border-radius: 8px; font-size: 2em; font-weight: bold; font-family: monospace; margin-bottom: 30px;">
        STARTUJE
      </div>
      <div>
        <a href="/register" class="btn btn-primary" style="background: white; color: #1976d2;">Zarejestruj się z kodem STARTUJE</a>
      </div>
    </div>
  </section>

  <section class="faq">
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Najczęściej zadawane pytania (FAQ)</h2>
      <div class="faq-item">
        <h4>Jak działa wystawoferte.pl?</h4>
        <p>wystawoferte.pl to platforma do automatycznego tworzenia i zarządzania ofertami sprzedaży. Wystarczy dodać produkt, a nasze narzędzie AI wygeneruje profesjonalny opis i automatycznie opublikuje ofertę na wybranych platformach marketplace.</p>
      </div>
      <div class="faq-item">
        <h4>Ile kosztuje korzystanie z platformy?</h4>
        <p>Koszt publikacji jednej aukcji to 1 PLN. Oferujemy również pakiety z rabatami dla większych wolumenów. Sprawdź sekcję Cennik powyżej.</p>
      </div>
      <div class="faq-item">
        <h4>Z jakimi platformami jest zintegrowana aplikacja?</h4>
        <p>Aktualnie aplikacja jest zintegrowana z Allegro i OLX. Pracujemy nad kolejnymi integracjami.</p>
      </div>
      <div class="faq-item">
        <h4>Czy moje dane są bezpieczne?</h4>
        <p>Tak! Wszystkie dane są szyfrowane przy użyciu SSL/TLS. Platforma jest w pełni zgodna z RODO i regulaminem Allegro. Bezpieczeństwo to nasz priorytet.</p>
      </div>
      <div class="faq-item">
        <h4>Jak mogę otrzymać 50 PLN na start?</h4>
        <p>Użyj kodu polecającego "STARTUJE" podczas rejestracji. Otrzymasz 50 PLN na start, co odpowiada 50 darmowym aukcjom!</p>
      </div>
      <div class="faq-item">
        <h4>Czy mogę anulować publikację?</h4>
        <p>Tak, możesz anulować publikację przed jej finalizacją. Opłata jest pobierana tylko za pomyślnie opublikowane aukcje.</p>
      </div>
      <div class="faq-item">
        <h4>Czy aplikacja działa na telefonach?</h4>
        <p>Tak! wystawoferte.pl jest w pełni responsywna i działa doskonale na telefonach, tabletach i komputerach. Możesz zarządzać swoimi ofertami z dowolnego urządzenia, gdziekolwiek jesteś!</p>
      </div>
    </div>
  </section>

  <section>
    <div class="container">
      <h2 style="text-align: center; font-size: 2em; margin-bottom: 40px;">Bezpieczeństwo to nasz priorytet</h2>
      <div class="features-grid">
        <div class="feature-card">
          <h3>Zgodność z regulaminem Allegro</h3>
          <p>Wszystkie nasze narzędzia są w pełni zgodne z regulaminem Allegro. Twoje konto jest bezpieczne.</p>
        </div>
        <div class="feature-card">
          <h3>SSL/TLS Szyfrowanie</h3>
          <p>Wszystkie dane są przesyłane przez bezpieczne połączenie SSL/TLS. Twoje informacje są chronione.</p>
        </div>
        <div class="feature-card">
          <h3>Zgodność z RODO</h3>
          <p>Pełna zgodność z Rozporządzeniem RODO. Twoje dane osobowe są bezpieczne i chronione.</p>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>&copy; 2024 wystawoferte.pl - Wszystkie prawa zastrzeżone</p>
      <p style="margin-top: 10px;">
        <a href="/terms" style="color: white; margin: 0 10px;">Regulamin</a>
        <a href="/privacy" style="color: white; margin: 0 10px;">Polityka Prywatności</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
};

module.exports = {
  generateLandingPageHTML
};

