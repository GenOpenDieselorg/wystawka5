import React, { useEffect } from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import PublicLayout from '../components/PublicLayout';

const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <PublicLayout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
            Polityka Prywatności
          </Typography>
          
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 4, fontStyle: 'italic' }}>
            Ostatnia aktualizacja: {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>1. Administrator Danych Osobowych</Typography>
            <Typography paragraph>
              Administratorem danych osobowych jest <strong>Marek Zaworski</strong>, osoba fizyczna prowadząca działalność gospodarczą pod firmą <strong>"KAICOK Marek Zaworski"</strong>, wpisaną do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG) prowadzonej przez ministra właściwego ds. gospodarki.
            </Typography>
            <Typography paragraph>
              <strong>Dane kontaktowe Administratora:</strong><br />
              NIP: 5892083801<br />
              REGON: 526052165<br />
              Email: <a href="mailto:wystawoferte@gmail.com" style={{ color: 'inherit' }}>wystawoferte@gmail.com</a><br />
              Telefon: <a href="tel:+48459256861" style={{ color: 'inherit' }}>+48 459 256 861</a>
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>2. Podstawa Prawna i Cel Przetwarzania Danych</Typography>
            <Typography paragraph>
              Przetwarzamy Twoje dane osobowe na podstawie następujących przepisów prawa:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Art. 6 ust. 1 lit. b RODO</strong> - wykonanie umowy o świadczenie usług drogą elektroniczną (rejestracja, logowanie, korzystanie z platformy)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Art. 6 ust. 1 lit. a RODO</strong> - Twoja zgoda (marketing bezpośredni, newsletter, pliki cookies)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Art. 6 ust. 1 lit. f RODO</strong> - prawnie uzasadniony interes administratora (zapewnienie bezpieczeństwa serwisu, analityka, rozwój usług)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Art. 6 ust. 1 lit. c RODO</strong> - obowiązek prawny (np. rozliczenia podatkowe, archiwizacja dokumentów)
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>3. Zakres Zbieranych Danych Osobowych</Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              3.1. Dane zbierane podczas rejestracji i korzystania z serwisu:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>Adres e-mail (wymagany)</Typography>
              <Typography component="li" paragraph>Imię i nazwisko (opcjonalnie)</Typography>
              <Typography component="li" paragraph>Hasło (przechowywane w formie zahashowanej)</Typography>
              <Typography component="li" paragraph>Dane dotyczące produktów i ofert (nazwy, opisy, zdjęcia, ceny)</Typography>
              <Typography component="li" paragraph>Dane dotyczące integracji z platformami zewnętrznymi (tokeny dostępu, identyfikatory kont)</Typography>
            </Box>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              3.2. Dane zbierane podczas płatności:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>Dane niezbędne do realizacji płatności (przetwarzane przez zewnętrznych operatorów płatniczych)</Typography>
              <Typography component="li" paragraph>Historia transakcji i saldo wirtualnego portfela</Typography>
            </Box>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              3.3. Dane techniczne (automatycznie zbierane):
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>Adres IP</Typography>
              <Typography component="li" paragraph>Typ przeglądarki i system operacyjny</Typography>
              <Typography component="li" paragraph>Data i godzina wizyty</Typography>
              <Typography component="li" paragraph>Strony odwiedzone w serwisie</Typography>
              <Typography component="li" paragraph>Pliki cookies i podobne technologie</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>4. Cele Przetwarzania Danych</Typography>
            <Typography paragraph>
              Twoje dane osobowe są przetwarzane w następujących celach:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Świadczenie usług drogą elektroniczną</strong> - umożliwienie korzystania z platformy, zarządzania ofertami, integracji z marketplace'ami
              </Typography>
              <Typography component="li" paragraph>
                <strong>Obsługa konta użytkownika</strong> - rejestracja, logowanie, zarządzanie profilem, reset hasła
              </Typography>
              <Typography component="li" paragraph>
                <strong>Realizacja płatności</strong> - przetwarzanie transakcji, zarządzanie wirtualnym portfelem, rozliczenia
              </Typography>
              <Typography component="li" paragraph>
                <strong>Komunikacja z użytkownikiem</strong> - odpowiedzi na zapytania, powiadomienia o zmianach w serwisie, informacje o usługach
              </Typography>
              <Typography component="li" paragraph>
                <strong>Marketing bezpośredni</strong> - wysyłka newslettera, ofert promocyjnych (tylko za zgodą)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Analiza i statystyka</strong> - analiza korzystania z serwisu, poprawa funkcjonalności, optymalizacja usług
              </Typography>
              <Typography component="li" paragraph>
                <strong>Zapewnienie bezpieczeństwa</strong> - wykrywanie nadużyć, ochrona przed nieautoryzowanym dostępem
              </Typography>
              <Typography component="li" paragraph>
                <strong>Wypełnienie obowiązków prawnych</strong> - rozliczenia podatkowe, archiwizacja dokumentów zgodnie z przepisami
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>5. Okres Przechowywania Danych</Typography>
            <Typography paragraph>
              Twoje dane osobowe są przechowywane przez okres:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Dane konta użytkownika</strong> - przez czas trwania konta oraz przez okres wymagany przepisami prawa (np. 5 lat dla dokumentów księgowych)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Dane dotyczące transakcji</strong> - zgodnie z wymogami prawa podatkowego i rachunkowego (minimum 5 lat)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Dane marketingowe</strong> - do momentu wycofania zgody lub sprzeciwu wobec przetwarzania
              </Typography>
              <Typography component="li" paragraph>
                <strong>Pliki cookies</strong> - zgodnie z ustawieniami przeglądarki lub do czasu wygaśnięcia (maksymalnie 12 miesięcy)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Logi serwera</strong> - maksymalnie 12 miesięcy
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>6. Udostępnianie Danych Osobowych</Typography>
            <Typography paragraph>
              Twoje dane osobowe mogą być udostępniane następującym kategoriom odbiorców:
            </Typography>
            
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              6.1. Podmioty przetwarzające dane na nasze zlecenie (procesorzy):
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Dostawcy usług hostingowych</strong> - przechowywanie danych na serwerach
              </Typography>
              <Typography component="li" paragraph>
                <strong>Dostawcy usług płatniczych</strong> - Krajowy Integrator Płatności S.A. (Tpay) (NIP: 7773061579) do realizacji płatności
              </Typography>
              <Typography component="li" paragraph>
                <strong>Dostawcy usług analitycznych</strong> - analiza ruchu na stronie (Google Analytics - z możliwością wyłączenia)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Dostawcy usług e-mail</strong> - wysyłka wiadomości e-mail
              </Typography>
            </Box>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              6.2. Organy uprawnione na podstawie przepisów prawa:
            </Typography>
            <Typography paragraph>
              Dane mogą być udostępnione organom państwowym (np. Urząd Skarbowy, organy ścigania) na podstawie obowiązujących przepisów prawa.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
              6.3. Integracje z platformami zewnętrznymi:
            </Typography>
            <Typography paragraph>
              W przypadku korzystania z integracji z platformami marketplace (Allegro, OLX, itp.), dane niezbędne do publikacji ofert są przekazywane tym platformom zgodnie z ich politykami prywatności i regulaminami.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>7. Pliki Cookies i Technologie Śledzące</Typography>
            <Typography paragraph>
              Serwis wykorzystuje pliki cookies i podobne technologie w celu:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Cookies niezbędne</strong> - zapewnienie podstawowej funkcjonalności serwisu (logowanie, sesja użytkownika)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Cookies funkcjonalne</strong> - zapamiętywanie preferencji użytkownika (język, motyw)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Cookies analityczne</strong> - analiza korzystania z serwisu (Google Analytics)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Cookies marketingowe</strong> - personalizacja reklam (tylko za zgodą)
              </Typography>
            </Box>
            <Typography paragraph sx={{ mt: 2 }}>
              Możesz zarządzać plikami cookies w ustawieniach swojej przeglądarki. Wyłączenie niektórych plików cookies może wpłynąć na funkcjonalność serwisu.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>8. Twoje Prawa</Typography>
            <Typography paragraph>
              Zgodnie z RODO, przysługują Ci następujące prawa:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Prawo dostępu do danych</strong> (Art. 15 RODO) - możesz żądać informacji o przetwarzanych danych
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do sprostowania danych</strong> (Art. 16 RODO) - możesz żądać poprawienia nieprawidłowych danych
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do usunięcia danych</strong> (Art. 17 RODO) - możesz żądać usunięcia danych w określonych sytuacjach
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do ograniczenia przetwarzania</strong> (Art. 18 RODO) - możesz żądać ograniczenia przetwarzania w określonych sytuacjach
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do przenoszenia danych</strong> (Art. 20 RODO) - możesz żądać przekazania danych w ustrukturyzowanym formacie
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do sprzeciwu</strong> (Art. 21 RODO) - możesz wnieść sprzeciw wobec przetwarzania danych w celach marketingowych
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do cofnięcia zgody</strong> - możesz w każdej chwili cofnąć zgodę na przetwarzanie danych (jeśli przetwarzanie opiera się na zgodzie)
              </Typography>
              <Typography component="li" paragraph>
                <strong>Prawo do wniesienia skargi</strong> - możesz wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych (UODO), jeśli uważasz, że przetwarzanie narusza przepisy RODO
              </Typography>
            </Box>
            <Typography paragraph sx={{ mt: 2 }}>
              Aby skorzystać z powyższych praw, skontaktuj się z nami na adres: <a href="mailto:wystawoferte@gmail.com" style={{ color: 'inherit' }}>wystawoferte@gmail.com</a>
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>9. Bezpieczeństwo Danych</Typography>
            <Typography paragraph>
              Stosujemy odpowiednie środki techniczne i organizacyjne zapewniające ochronę danych osobowych:
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <Typography component="li" paragraph>
                <strong>Szyfrowanie SSL/TLS</strong> - wszystkie dane przesyłane są przez bezpieczne połączenie szyfrowane
              </Typography>
              <Typography component="li" paragraph>
                <strong>Haszowanie haseł</strong> - hasła użytkowników są przechowywane w formie zahashowanej
              </Typography>
              <Typography component="li" paragraph>
                <strong>Regularne aktualizacje</strong> - system jest regularnie aktualizowany w celu eliminacji luk bezpieczeństwa
              </Typography>
              <Typography component="li" paragraph>
                <strong>Ograniczony dostęp</strong> - dostęp do danych mają tylko upoważnione osoby
              </Typography>
              <Typography component="li" paragraph>
                <strong>Backup danych</strong> - regularne tworzenie kopii zapasowych
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>10. Przekazywanie Danych do Państw Trzecich</Typography>
            <Typography paragraph>
              Niektóre z wykorzystywanych przez nas usług mogą wiązać się z przekazywaniem danych do państw spoza Europejskiego Obszaru Gospodarczego (np. Google Analytics). W takich przypadkach zapewniamy odpowiednie zabezpieczenia prawne, w tym standardowe klauzule umowne zatwierdzone przez Komisję Europejską.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>11. Zmiany w Polityce Prywatności</Typography>
            <Typography paragraph>
              Zastrzegamy sobie prawo do wprowadzania zmian w Polityce Prywatności. O wszelkich istotnych zmianach będziemy informować użytkowników z odpowiednim wyprzedzeniem poprzez wiadomość e-mail lub komunikat w serwisie.
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>12. Kontakt w Sprawach Ochrony Danych</Typography>
            <Typography paragraph>
              W sprawach związanych z ochroną danych osobowych, realizacją swoich praw lub w przypadku pytań dotyczących Polityki Prywatności, prosimy o kontakt:
            </Typography>
            <Typography paragraph>
              <strong>Email:</strong> <a href="mailto:wystawoferte@gmail.com" style={{ color: 'inherit' }}>wystawoferte@gmail.com</a><br />
              <strong>Telefon:</strong> <a href="tel:+48459256861" style={{ color: 'inherit' }}>+48 459 256 861</a><br />
              <strong>Adres:</strong> KAICOK Marek Zaworski
            </Typography>
            <Typography paragraph sx={{ mt: 2 }}>
              W przypadku wątpliwości dotyczących przetwarzania danych osobowych, masz również prawo wnieść skargę do organu nadzorczego:
            </Typography>
            <Typography paragraph>
              <strong>Prezes Urzędu Ochrony Danych Osobowych</strong><br />
              ul. Stawki 2, 00-193 Warszawa<br />
              Tel: 22 531 03 00<br />
              Email: <a href="mailto:kancelaria@uodo.gov.pl" style={{ color: 'inherit' }}>kancelaria@uodo.gov.pl</a>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default PrivacyPolicy;

