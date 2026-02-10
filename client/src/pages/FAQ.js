import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAuth } from '../context/AuthContext';
import PublicLayout from '../components/PublicLayout';
import Layout from '../components/Layout';

function FAQ() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const faqItems = [
    {
      question: 'Dlaczego moje ogłoszenie nie zostało opublikowane na Allegro?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Najczęstszym powodem nieudanej publikacji ogłoszenia na Allegro jest brak ustawionych parametrów w konfiguracji integracji.
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              WAŻNE: Przed publikacją upewnij się, że wszystkie parametry są ustawione!
            </Typography>
          </Alert>
          <Typography variant="body1" paragraph>
            <strong>Kroki do wykonania:</strong>
          </Typography>
          <ol>
            <li>Przejdź do sekcji <strong>Integracje</strong> w menu</li>
            <li>Wybierz <strong>Allegro</strong></li>
            <li>Kliknij przycisk <strong>Ustawienia</strong></li>
            <li>Przejdź do zakładki <strong>Dostawa i zwroty</strong></li>
            <li>Ustaw wszystkie wymagane parametry:
              <ul>
                <li>Forma faktury</li>
                <li>ID taryfy wysyłkowej</li>
                <li>ID polityki zwrotów</li>
                <li>ID gwarancji domniemanej</li>
                <li>ID gwarancji</li>
                <li>ID odpowiedzialnego producenta</li>
              </ul>
            </li>
            <li>Zapisz ustawienia</li>
          </ol>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Uwaga:</strong> Bez ustawienia wszystkich parametrów ogłoszenie nie zostanie opublikowane, nawet jeśli inne dane produktu są poprawne.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Jak sprawdzić czy mam ochronę marek w Allegro?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Ochrona marek w Allegro jest wymagana do publikacji niektórych produktów. Aby sprawdzić status ochrony marek:
          </Typography>
          <ol>
            <li>Zaloguj się do swojego konta Allegro</li>
            <li>Przejdź do sekcji <strong>Moje konto</strong> → <strong>Ustawienia</strong></li>
            <li>Sprawdź sekcję <strong>Ochrona marek</strong> lub <strong>Brand Protection</strong></li>
            <li>Upewnij się, że masz aktywną ochronę marek dla produktów, które chcesz publikować</li>
          </ol>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Uwaga:</strong> Jeśli nie masz ochrony marek, niektóre produkty mogą nie zostać opublikowane. Skontaktuj się z Allegro w celu aktywacji ochrony marek.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Allegro publish failed: Product name is too short. It must be at least 12 characters long',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Ten błąd oznacza, że nazwa produktu jest zbyt krótka. Allegro wymaga, aby nazwa produktu miała minimum <strong>12 znaków</strong>.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Rozwiązanie:</strong> Edytuj produkt i wydłuż jego nazwę, dodając więcej szczegółów (np. markę, model, kolor, rozmiar). Nazwa powinna zawierać co najmniej 12 znaków.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Przykład: zamiast "Telefon" użyj "Telefon Samsung Galaxy A54 5G 128GB Czarny"
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Kiedy pobierane są opłaty za publikację ogłoszeń?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Opłaty za publikację ogłoszeń są pobierane <strong>tylko w przypadku pomyślnej publikacji</strong> ogłoszenia.
          </Typography>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Płatność jest pobierana TYLKO za poprawnie opublikowane ogłoszenia!
            </Typography>
          </Alert>
          <Typography variant="body1" paragraph>
            <strong>Jak to działa:</strong>
          </Typography>
          <ul>
            <li>Jeśli ogłoszenie zostało <strong>poprawnie opublikowane</strong> → opłata zostaje pobrana z Twojego portfela</li>
            <li>Jeśli wystąpił <strong>błąd podczas publikacji</strong> → opłata <strong>NIE</strong> zostaje pobrana</li>
            <li>Jeśli ogłoszenie nie spełnia wymagań marketplace → opłata <strong>NIE</strong> zostaje pobrana</li>
          </ul>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            Dzięki temu płacisz tylko za udane publikacje. Jeśli coś pójdzie nie tak, Twoje środki pozostają na koncie.
          </Typography>
        </Box>
      )
    },
    {
      question: 'Jak otrzymać fakturę za usługi?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Faktury za usługi są wystawiane <strong>na początku miesiąca</strong>. Jest to <strong>faktura zbiorcza</strong> za wpłaty dokonane w całym poprzednim miesiącu.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Faktura jest wystawiana automatycznie na początku każdego miesiąca za wszystkie udane publikacje z poprzedniego miesiąca.
            </Typography>
          </Alert>
          <Typography variant="body1" paragraph>
            <strong>Dane do faktury:</strong>
          </Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Dane do faktury trzeba ustawić w ustawieniach!
            </Typography>
          </Alert>
          <Typography variant="body1" paragraph>
            Przejdź do sekcji <strong>Ustawienia</strong> i uzupełnij dane do faktury. Bez ustawionych danych faktura nie może zostać wystawiona.
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
            <Typography variant="body2">
              <strong>Administrator danych:</strong><br />
              <strong>Nazwa:</strong> Kacper Marek Zaworski<br />
              <strong>NIP:</strong> 5892083801
            </Typography>
          </Paper>
        </Box>
      )
    },
    {
      question: 'Co zrobić gdy ogłoszenie nie zostało opublikowane mimo poprawnej konfiguracji?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Jeśli ogłoszenie nie zostało opublikowane mimo poprawnej konfiguracji, sprawdź:
          </Typography>
          <ol>
            <li><strong>Saldo portfela</strong> - upewnij się, że masz wystarczające środki na publikację</li>
            <li><strong>Status konta Allegro</strong> - sprawdź czy Twoje konto nie jest zablokowane lub zawieszone</li>
            <li><strong>Ochrona marek</strong> - upewnij się, że masz aktywną ochronę marek dla danego produktu</li>
            <li><strong>Wszystkie parametry w ustawieniach</strong> - sprawdź czy wszystkie pola są wypełnione</li>
            <li><strong>Szczegóły błędu</strong> - w sekcji Dashboard sprawdź szczegóły błędu dla danego produktu</li>
          </ol>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Większość błędów publikacji jest szczegółowo opisana w sekcji Dashboard przy każdym produkcie. Sprawdź komunikaty błędów, aby zidentyfikować problem.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Jak doładować portfel?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Aby doładować portfel:
          </Typography>
          <ol>
            <li>Przejdź do sekcji <strong>Portfel</strong> w menu</li>
            <li>Kliknij przycisk <strong>Doładuj portfel</strong></li>
            <li>Wybierz kwotę doładowania</li>
            <li>Wybierz metodę płatności</li>
            <li>Dokończ proces płatności</li>
          </ol>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            Po zakończeniu płatności środki zostaną automatycznie dodane do Twojego portfela.
          </Typography>
        </Box>
      )
    },
    {
      question: 'Jak działa AI w aplikacji?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Nasze AI automatycznie generuje opis produktu i modyfikuje zdjęcia na podstawie kodu EAN (kodu kreskowego) produktu lub nazwy produktu.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Funkcje AI:</strong>
          </Typography>
          <ul>
            <li><strong>Generowanie opisu</strong> - AI automatycznie tworzy profesjonalny opis produktu na podstawie EAN lub nazwy</li>
            <li><strong>Modyfikacja zdjęć</strong> - AI usuwa tło ze zdjęć produktów, przygotowując je do publikacji</li>
          </ul>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Wystarczy podać kod EAN lub nazwę produktu, a AI automatycznie przygotuje gotowe ogłoszenie z opisem i przetworzonymi zdjęciami.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Czy aplikacja działa na telefonie i tablecie?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Tak! Strona jest w pełni responsywna i działa na wszystkich urządzeniach:
          </Typography>
          <ul>
            <li><strong>Telefonie</strong> - aplikacja jest w pełni zoptymalizowana do korzystania na smartfonach</li>
            <li><strong>Tablecie</strong> - wygodne korzystanie z aplikacji na tabletach</li>
            <li><strong>Komputerze</strong> - pełna funkcjonalność na desktopach i laptopach</li>
          </ul>
          <Alert severity="success" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Możesz korzystać z aplikacji wystawoferte.pl na dowolnym urządzeniu - interfejs automatycznie dostosowuje się do rozmiaru ekranu.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Z jakimi platformami jest zintegrowana aplikacja?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Aktualnie aplikacja wystawoferte.pl jest zintegrowana z <strong>3 integratorami</strong>:
          </Typography>
          <ul>
            <li><strong>Allegro</strong> - automatyczna publikacja ogłoszeń</li>
            <li><strong>OLX</strong> - automatyczna publikacja ogłoszeń</li>
            <li>Inne platformy (sprawdź sekcję Integracje)</li>
          </ul>
          <Typography variant="body1" paragraph sx={{ mt: 2 }}>
            Wszystkie integracje można skonfigurować w sekcji <strong>Integracje</strong> w menu aplikacji.
          </Typography>
        </Box>
      )
    },
    {
      question: 'Ile kosztuje publikacja ogłoszenia?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Bazowa cena za udane ogłoszenie oraz edycję opisu AI wynosi <strong>1.0 zł</strong>.
          </Typography>
          <Typography variant="body2" paragraph>
            Dla stałych klientów oferujemy automatyczne rabaty:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <li>Powyżej 100 ofert: <strong>0.90 zł</strong> (10% rabatu)</li>
            <li>Powyżej 200 ofert: <strong>0.80 zł</strong> (20% rabatu)</li>
            <li>Powyżej 300 ofert: <strong>0.70 zł</strong> (30% rabatu)</li>
            <li>Powyżej 400 ofert: <strong>0.65 zł</strong> (35% rabatu)</li>
            <li>Powyżej 500 ofert: <strong>0.60 zł</strong> (40% rabatu)</li>
          </Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Płatność jest pobierana TYLKO za poprawnie opublikowane ogłoszenia!
            </Typography>
          </Alert>
          <Typography variant="body1" paragraph>
            <strong>Rabaty za większą ilość:</strong>
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Im więcej ogłoszeń wrzucisz, tym taniej!</strong> System automatycznie nalicza rabaty przy większych wolumenach publikacji.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Szczegóły dotyczące rabatów i aktualnych cen znajdziesz w sekcji <strong>Portfel</strong> lub <strong>Ustawienia</strong>.
            </Typography>
          </Alert>
        </Box>
      )
    },
    {
      question: 'Czy mogę anulować publikację ogłoszenia?',
      answer: (
        <Box>
          <Typography variant="body1" paragraph>
            Tak, możesz anulować publikację ogłoszenia, ale tylko jeśli jeszcze nie została zakończona. Jeśli ogłoszenie zostało już opublikowane, musisz je usunąć bezpośrednio w panelu Allegro lub OLX.
          </Typography>
          <Typography variant="body1" paragraph>
            <strong>Uwaga:</strong> Jeśli publikacja zakończyła się sukcesem, opłata została już pobrana i nie podlega zwrotowi.
          </Typography>
        </Box>
      )
    }
  ];

  // Use PublicLayout if not logged in, Layout if logged in
  const LayoutComponent = user ? Layout : PublicLayout;
  
  return (
    <LayoutComponent title="FAQ">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
            Najczęściej zadawane pytania (FAQ)
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" paragraph>
            Znajdź odpowiedzi na najczęstsze pytania dotyczące korzystania z aplikacji wystawoferte.pl
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          {faqItems.map((item, index) => (
            <Accordion 
              key={index} 
              sx={{ 
                mb: 2,
                '&:before': {
                  display: 'none',
                },
                boxShadow: 2,
                borderRadius: 2,
                '&.Mui-expanded': {
                  margin: '16px 0',
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${index}-content`}
                id={`panel${index}-header`}
                sx={{
                  px: 3,
                  py: 2,
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  '&.Mui-expanded': {
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 500, pr: 2 }}>
                  {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, py: 3 }}>
                {item.answer}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Card 
          sx={{ 
            mt: 6, 
            mb: 4,
            boxShadow: 3,
            borderRadius: 2,
            bgcolor: 'primary.50'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              Potrzebujesz dodatkowej pomocy?
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
              Jeśli nie znalazłeś odpowiedzi na swoje pytanie, skontaktuj się z nami bezpośrednio:
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" paragraph>
                <strong>Email:</strong>{' '}
                <a 
                  href="mailto:wystawoferte@gmail.com" 
                  style={{ 
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontWeight: 500
                  }}
                >
                  wystawoferte@gmail.com
                </a>
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Telefon:</strong>{' '}
                <a 
                  href="tel:+48459256861" 
                  style={{ 
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontWeight: 500
                  }}
                >
                  +48 459 256 861
                </a>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {user && (
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => navigate('/settings')}
                  size="large"
                >
                  Przejdź do ustawień
                </Button>
              )}
              {!user && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  size="large"
                >
                  Zarejestruj się
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </LayoutComponent>
  );
}

export default FAQ;

