import React, { useEffect } from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import PublicLayout from '../components/PublicLayout';

const TermsOfService = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <PublicLayout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
            Regulamin Serwisu wystawoferte.pl
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>1. Postanowienia ogólne</Typography>
            <Typography paragraph>
              Niniejszy regulamin określa zasady korzystania z serwisu internetowego wystawoferte.pl, dostępnego pod adresem wystawoferte.pl.
            </Typography>
            <Typography paragraph>
              Właścicielem Serwisu i Usługodawcą jest <strong>Marek Zaworski</strong>, osoba fizyczna prowadząca działalność gospodarczą pod firmą <strong>"KAICOK Marek Zaworski"</strong>, wpisaną do Centralnej Ewidencji i Informacji o Działalności Gospodarczej (CEIDG) prowadzonej przez ministra właściwego ds. gospodarki, NIP: 5892083801, REGON: 526052165.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>2. Definicje</Typography>
            <Typography paragraph>
              <strong>Serwis</strong> - platforma internetowa wystawoferte.pl.<br />
              <strong>Użytkownik</strong> - każda osoba fizyczna lub prawna korzystająca z Serwisu.<br />
              <strong>Usługi</strong> - usługi świadczone drogą elektroniczną przez Usługodawcę za pośrednictwem Serwisu.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>3. Rodzaje i zakres usług</Typography>
            <Typography paragraph>
              Serwis umożliwia zarządzanie ofertami sprzedaży, integrację z platformami marketplace (Allegro, OLX) oraz korzystanie z narzędzi wspieranych przez AI do tworzenia opisów produktów.
            </Typography>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>4. Rejestracja i konto</Typography>
            <Typography paragraph>
              Korzystanie z pełnej funkcjonalności Serwisu wymaga rejestracji i utworzenia konta. Użytkownik zobowiązany jest do podania prawdziwych danych podczas rejestracji.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>5. Płatności i Wirtualny Portfel</Typography>
            <Typography paragraph>
              System płatności w Serwisie opiera się na modelu przedpłaconym (pre-paid). Użytkownik dokonuje wpłaty środków na wirtualne konto (Wirtualny Portfel) wewnątrz Serwisu, które są następnie wykorzystywane do opłacania poszczególnych Usług i funkcji.
            </Typography>
            <Typography paragraph>
              Usługodawca korzysta z usług zewnętrznych dostawców usług płatniczych. Dostępnymi formami płatności w serwisie są: <strong>Przelew / Blik, PaySafeCard, DirectBilling, PayPal</strong>.
            </Typography>
            <Typography paragraph>
              Płatności Przelew / Blik oraz inne metody obsługiwane są przez firmę <strong>Krajowy Integrator Płatności S.A. (Tpay)</strong> (NIP: 7773061579, REGON: 300878437, strona: https://tpay.com).
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>6. Odpowiedzialność i blokady kont zewnętrznych</Typography>
            <Typography paragraph>
              Serwis dostarcza narzędzia wspomagające proces sprzedaży i wystawiania ofert, jednak ostateczna decyzja o treści i sposobie publikacji oferty należy do Użytkownika.
            </Typography>
            <Typography paragraph>
              Usługodawca <strong>nie ponosi odpowiedzialności</strong> za blokady kont, ograniczenia dostępu, bany lub inne sankcje nałożone na Użytkownika przez zewnętrzne platformy marketplace (w szczególności Allegro, OLX, eBay, Vinted i inne) w wyniku korzystania z Serwisu. Użytkownik zobowiązany jest do korzystania z narzędzi Serwisu w sposób zgodny z regulaminami zewnętrznych platform, na których publikuje oferty.
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>7. Postanowienia końcowe</Typography>
            <Typography paragraph>
              Usługodawca zastrzega sobie prawo do zmiany Regulaminu. O zmianach Użytkownicy zostaną poinformowani z odpowiednim wyprzedzeniem.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </PublicLayout>
  );
};

export default TermsOfService;