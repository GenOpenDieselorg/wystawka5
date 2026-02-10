import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Container,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormLabel,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  Stack,
  IconButton
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LinkIcon from '@mui/icons-material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HelpIcon from '@mui/icons-material/Help';
import SchoolIcon from '@mui/icons-material/School';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import QrCodeIcon from '@mui/icons-material/QrCode';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import sanitizeHtml from '../utils/sanitizeHtml';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';
const BASE_OFFER_PRICE = 1.0; // Bazowa cena - koszt utworzenia produktu

const steps = [
  'Dane produktu i zdjęcia'
];

function ProductWizard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editProductId = searchParams.get('edit');
  const [activeStep, setActiveStep] = useState(0);
  const [productName, setProductName] = useState('');
  const [eanCode, setEanCode] = useState('');
  const [catalogCode, setCatalogCode] = useState('');
  const [price, setPrice] = useState('');
  const [vatRate, setVatRate] = useState('23%');
  const [manufacturer, setManufacturer] = useState('');
  const [dimensions, setDimensions] = useState({ width: null, height: null, depth: null, weight: null });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [description, setDescription] = useState('');
  const [processedImages, setProcessedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // Status message for saving process
  const [error, setError] = useState('');
  const [productId, setProductId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [suggestedImages, setSuggestedImages] = useState([]);
  const [selectedSuggestedImages, setSelectedSuggestedImages] = useState([]);
  const [searchingEan, setSearchingEan] = useState(false);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImagesForAi, setSelectedImagesForAi] = useState([]);
  // Map image ID to edit settings: { editType: 'enhance', backgroundImageUrl: null }
  const [imageEditSettings, setImageEditSettings] = useState({});
  const [categoryId, setCategoryId] = useState(null);
  const [categoryParams, setCategoryParams] = useState([]);
  const [productParams, setProductParams] = useState([]);
  const [dataSource, setDataSource] = useState(null);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [generatingDescriptionInBackground, setGeneratingDescriptionInBackground] = useState(false);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [requiredBalance, setRequiredBalance] = useState(BASE_OFFER_PRICE);
  const [editType, setEditType] = useState('enhance');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [defaultBgImageUrl, setDefaultBgImageUrl] = useState(null);
  const [autoPublish, setAutoPublish] = useState(false);
  const [aiTemplates, setAiTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [includeDimensions, setIncludeDimensions] = useState(false);
  const [includeWeight, setIncludeWeight] = useState(false);
  const [customAiInstructions, setCustomAiInstructions] = useState('');
  const [identifier, setIdentifier] = useState(''); // Unified field for EAN or Name
  const [candidates, setCandidates] = useState([]);
  const [candidateModalOpen, setCandidateModalOpen] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [wizardType, setWizardType] = useState('default'); // 'default' or 'image-based'
  const [overwriteDialogOpen, setOverwriteDialogOpen] = useState(false);
  const [pendingEanData, setPendingEanData] = useState(null);
  const [eanSearchTimeout, setEanSearchTimeout] = useState(null);
  const [imageBasedHelpDialogOpen, setImageBasedHelpDialogOpen] = useState(false);
  
  // Tutorial State
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialPage, setTutorialPage] = useState(0);
  
  // AI Image Generation State
  const [aiImageDialogOpen, setAiImageDialogOpen] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState('');
  const [aiImageLoading, setAiImageLoading] = useState(false);

  // Scanner State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerScanning, setScannerScanning] = useState(false);
  // Initialize as null to wait for preferences
  const [scannerEnabled, setScannerEnabled] = useState(null);
  const [scannerType, setScannerType] = useState('advanced');
  const [html5QrCode, setHtml5QrCode] = useState(null);

  // Job Progress State (like in AllegroBulkEdit)
  const [processing, setProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobProgress, setJobProgress] = useState({ progress: 0 });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (droppedFiles.length > 0) {
        setImages(prev => [...prev, ...droppedFiles]);
      }
    }
  }, []);

  // Global paste handler
  useEffect(() => {
    const handlePaste = (e) => {
      // Don't intercept if pasting into a text input, unless it's a file
      if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
        if (!e.clipboardData.files || e.clipboardData.files.length === 0) {
            return;
        }
      }

      if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
        const pastedFiles = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'));
        if (pastedFiles.length > 0) {
          e.preventDefault();
          setImages(prev => [...prev, ...pastedFiles]);
          // Optional: Notify user
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []);

  useEffect(() => {
    fetchAiTemplates();
    fetchScannerPreference();
  }, []);

  // Auto-start scanner when dialog opens
  useEffect(() => {
    // Only start if explicitly enabled (true), not null (loading) or false (disabled)
    if (scannerOpen && !scannerScanning && scannerEnabled === true) {
      // Small delay to ensure dialog is rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, scannerEnabled]);

  // Fetch scanner preference
  const fetchScannerPreference = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/preferences`);
      if (response.data.preferences) {
        setScannerEnabled(response.data.preferences.scanner_enabled !== false);
      }
    } catch (error) {
      console.error('Error fetching scanner preference:', error);
      // Default to enabled if error
      setScannerEnabled(true);
    }
  };

  // Poll for job status (like in AllegroBulkEdit)
  useEffect(() => {
    let interval;
    if (jobId && processing) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/jobs/${jobId}`);
          
          const job = response.data.job;
          setJobProgress({
            progress: job.progress || 0
          });

          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(interval);
            setProcessing(false);
            setJobId(null);
            
            // Navigate to dashboard after completion
            navigate('/dashboard', { 
              state: { 
                message: job.status === 'completed' 
                  ? 'Oferta została pomyślnie wygenerowana!' 
                  : `Błąd: ${job.error_message || 'Nieznany błąd'}`,
                jobId: job.id
              } 
            });
          }
        } catch (err) {
          console.error('Error polling job status:', err);
          if (err.response && err.response.status === 404) {
            // Job lost (server restart?)
            clearInterval(interval);
            setProcessing(false);
            setJobId(null);
            setError('Zadanie przetwarzania wygasło lub zostało usunięte.');
          }
        }
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(interval);
  }, [jobId, processing, navigate]);

  const fetchAiTemplates = async () => {
    try {
      const response = await axios.get(`${API_URL}/ai-templates`);
      setAiTemplates(response.data.templates || []);
      
      // Auto-select first template if available and none selected
      if (response.data.templates && response.data.templates.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(response.data.templates[0].id);
      }
    } catch (err) {
      console.error('Error fetching AI templates:', err);
    }
  };

  // Helper function to reset all state
  const resetAllState = () => {
    setProductId(null);
    setIsEditing(false);
    setIdentifier('');
    setProductName('');
    setEanCode('');
    setCatalogCode('');
    setPrice('');
    setVatRate('23%');
    setDescription('');
    setManufacturer('');
    setDimensions({ width: null, height: null, depth: null, weight: null });
    setImages([]);
    setExistingImages([]);
    setProcessedImages([]);
    setSuggestedImages([]);
    setSelectedSuggestedImages([]);
    setAvailableImages([]);
    setSelectedImagesForAi([]);
    setImageEditSettings({});
    setCategoryId(null);
    setCategoryParams([]);
    setProductParams([]);
    setDataSource(null);
    setGeneratingDescriptionInBackground(false);
    setActiveStep(0);
    setError('');
    // Reset to defaults fetched from preferences
    fetchPreferences(); 
    setBackgroundImage(null);
    setIncludeDimensions(false);
    setIncludeWeight(false);
    setCustomAiInstructions('');
  };

  // Handle initialization and state reset
  // Runs on mount and when location/mode changes
  useEffect(() => {
    console.log('[ProductWizard] Effect triggered. Edit:', editProductId, 'Location:', location.key);
    
    if (!editProductId) {
      // Reset all state when creating new product
      // This ensures no stale data from previous products is shown
      console.log('[ProductWizard] Creating new product - resetting state');
      resetAllState();
      
      // Sprawdź saldo portfela przed wejściem na stronę tworzenia produktu
      // To jest wymagane - użytkownik musi mieć minimum 0.60 PLN
      checkWalletBalance();
    } else {
      // Edit mode - always load product to ensure freshness
      // We check if we are already editing this product to avoid infinite loops if loadProductForEdit updates something triggering this (unlikely as deps are stable)
      console.log('[ProductWizard] Edit mode - loading product', editProductId);
      loadProductForEdit(editProductId);
      fetchWallet();
      // W trybie edycji nie sprawdzamy salda - użytkownik już zapłacił za produkt
      setInsufficientBalance(false);
    }
  }, [editProductId, location.key]); // Depend on location.key to force run on navigation

  useEffect(() => {
    fetchPreferences();
  }, []);

  // Check if user has seen tutorial before
  useEffect(() => {
    if (!editProductId) {
      const hasSeenTutorial = localStorage.getItem('productWizardTutorialSeen');
      if (!hasSeenTutorial) {
        // Show tutorial after a short delay to let the page load
        const timer = setTimeout(() => {
          setTutorialOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [editProductId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (eanSearchTimeout) {
        clearTimeout(eanSearchTimeout);
      }
    };
  }, [eanSearchTimeout]);

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/preferences`);
      const prefs = response.data.preferences;
      if (prefs) {
        setEditType(prefs.default_image_edit_mode || 'enhance');
        setDefaultBgImageUrl(prefs.default_bg_image_url || null);
        setAutoPublish(prefs.auto_publish_offers || false);
      } else {
        // Fallback default if no prefs
        setEditType('enhance');
        setAutoPublish(false);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Fallback default on error
      setEditType('enhance');
    }
  };

  useEffect(() => {
    if (categoryId) {
      fetchCategoryParameters(categoryId);
    }
  }, [categoryId]);

  const fetchCategoryParameters = async (catId) => {
    try {
      const response = await axios.get(`${API_URL}/products/categories/${catId}/parameters`);
      setCategoryParams(response.data.parameters || []);
    } catch (error) {
      console.error('Error fetching category parameters:', error);
    }
  };


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const generateDescriptionInBackground = async (productData) => {
    // Funkcja do generowania opisu w tle na podstawie danych z EAN
    setGeneratingDescriptionInBackground(true);
    try {
      
      const descResponse = await axios.post(
        `${API_URL}/ai/generate-description`,
        {
          productName: productData.name || productName,
          eanCode: eanCode,
          catalogCode: catalogCode,
          manufacturer: productData.manufacturer || manufacturer,
          dimensions: productData.dimensions || dimensions,
          parameters: productData.parameters || productParams,
          categoryName: productData.categoryName || null,
          catalogDescription: productData.description || description,
          templateId: selectedTemplateId || undefined,
          aiOptions: {
            includeDimensions,
            includeWeight,
            customInstructions: customAiInstructions
          }
        }
      );

      if (descResponse.data.description) {
        setDescription(descResponse.data.description);
      }
    } catch (err) {
      console.error('Error generating description in background:', err);
      // Nie pokazujemy błędu użytkownikowi - to jest w tle
      // Opis można wygenerować później ręcznie
    } finally {
      setGeneratingDescriptionInBackground(false);
    }
  };

  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    setIdentifier(val);
    
    // Clear previous timeout
    if (eanSearchTimeout) {
      clearTimeout(eanSearchTimeout);
    }
    
    // Check if input looks like an EAN (digits only)
    if (/^\d+$/.test(val.trim()) && val.trim().length > 0) {
        const trimmedEan = val.trim();
        setEanCode(trimmedEan);
        // Set fallback name to EAN digits so validation passes if search isn't used/fails
        setProductName(trimmedEan);
        
        // Auto-search when EAN is complete (13 digits for standard EAN-13)
        if (trimmedEan.length === 13 && !searchingEan) {
          // Debounce search by 500ms to avoid too many requests
          const timeout = setTimeout(() => {
            handleSearchEan();
          }, 500);
          setEanSearchTimeout(timeout);
        }
    } else {
        setEanCode('');
        setProductName(val);
    }
  };

  // Funkcja sprawdzająca, czy pola formularza są już wypełnione
  const hasFilledFields = () => {
    return !!(
      productName.trim() ||
      manufacturer.trim() ||
      dimensions.width ||
      dimensions.height ||
      dimensions.depth ||
      dimensions.weight ||
      productParams.length > 0 ||
      categoryId ||
      images.length > 0 ||
      existingImages.length > 0
    );
  };

  // Funkcja uzupełniająca tylko puste pola
  const fillEmptyFields = (data) => {
    // Handle multiple candidates
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      setCandidates(data.candidates);
    } else {
      setCandidates([data]);
    }

    // Uzupełnij tylko puste pola
    if (data.name && !productName.trim()) {
      setProductName(data.name);
    }

    if (data.manufacturer && !manufacturer.trim()) {
      setManufacturer(data.manufacturer);
    }
    
    if (data.dimensions) {
      const newDimensions = { ...dimensions };
      if (data.dimensions.width && !dimensions.width) {
        newDimensions.width = data.dimensions.width;
      }
      if (data.dimensions.height && !dimensions.height) {
        newDimensions.height = data.dimensions.height;
      }
      if (data.dimensions.depth && !dimensions.depth) {
        newDimensions.depth = data.dimensions.depth;
      }
      if (data.dimensions.weight && !dimensions.weight) {
        newDimensions.weight = data.dimensions.weight;
      }
      setDimensions(newDimensions);
      
      if ((newDimensions.width || newDimensions.height || newDimensions.depth) && !includeDimensions) {
        setIncludeDimensions(true);
      }
      if (newDimensions.weight && !includeWeight) {
        setIncludeWeight(true);
      }
    }

    if (data.parameters && Array.isArray(data.parameters) && productParams.length === 0) {
      setProductParams(data.parameters);
    }

    if (data.categoryId && !categoryId) {
      setCategoryId(data.categoryId);
    }
    
    if (data.images && data.images.length > 0) {
      setSuggestedImages(data.images);
      // Default: select all suggested images
      setSelectedSuggestedImages(data.images);
    }

    // Zapisz źródło danych
    if (data.source) {
      setDataSource(data.source);
    }

    // Jeśli znaleziono produkt (mamy nazwę), od razu generuj opis w tle
    if (data.name) {
      generateDescriptionInBackground(data);
    }
  };

  // Funkcja nadpisująca wszystkie pola
  const overwriteAllFields = (data) => {
    // Handle multiple candidates
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      setCandidates(data.candidates);
    } else {
      setCandidates([data]);
    }

    // Zawsze nadpisz nazwę produktu, jeśli znaleziono ją w bazie EAN
    if (data.name) {
      setProductName(data.name);
    }

    if (data.manufacturer) {
      setManufacturer(data.manufacturer);
    }
    
    if (data.dimensions) {
      setDimensions(data.dimensions);
      if (data.dimensions.width || data.dimensions.height || data.dimensions.depth) {
        setIncludeDimensions(true);
      }
      if (data.dimensions.weight) {
        setIncludeWeight(true);
      }
    }

    if (data.parameters && Array.isArray(data.parameters)) {
      setProductParams(data.parameters);
    }

    if (data.categoryId) {
      setCategoryId(data.categoryId);
    }
    
    if (data.images && data.images.length > 0) {
      setSuggestedImages(data.images);
      // Default: select all suggested images
      setSelectedSuggestedImages(data.images);
    }

    // Zapisz źródło danych
    if (data.source) {
      setDataSource(data.source);
    }

    // Jeśli znaleziono produkt (mamy nazwę), od razu generuj opis w tle
    if (data.name) {
      generateDescriptionInBackground(data);
    }
  };

  // Scanner functions
  const handleOpenScanner = () => {
    setScannerOpen(true);
    setScannerScanning(false);
  };

  const handleCloseScanner = async () => {
    if (html5QrCode && scannerScanning) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScannerOpen(false);
    setScannerScanning(false);
    setHtml5QrCode(null);
  };

  const startScanner = async () => {
    try {
      const qrCode = new Html5Qrcode("scanner-container");
      setHtml5QrCode(qrCode);
      
      await qrCode.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 280, height: 200 }, // More rectangular for barcodes
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        },
        (decodedText, decodedResult) => {
          // Successfully scanned
          handleScannedCode(decodedText);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent during scanning)
        }
      );
      setScannerScanning(true);
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Nie udało się uruchomić skanera. Sprawdź uprawnienia do kamery.');
      handleCloseScanner();
    }
  };

  const handleScannedCode = async (code) => {
    // Stop scanning
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        await html5QrCode.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    
    // Close scanner dialog
    setScannerOpen(false);
    setScannerScanning(false);
    setHtml5QrCode(null);
    
    // Set the scanned code
    setIdentifier(code);
    setEanCode(code);
    
    // Auto-search if it's a valid EAN
    if (/^\d{8,14}$/.test(code.trim())) {
      setEanCode(code.trim());
      setTimeout(() => {
        handleSearchEan();
      }, 500);
    }
  };

  // Obsługa skanerów sprzętowych (klawiaturowych)
  useEffect(() => {
    if (scannerEnabled === false) return;

    let barcode = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Ignoruj, jeśli użytkownik pisze w polach formularza
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      // Resetuj bufor, jeśli odstęp między znakami jest zbyt duży (ręczne wpisywanie)
      if (currentTime - lastKeyTime > 100) {
        barcode = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcode.length >= 8) { // Minimum EAN-8
           handleScannedCode(barcode);
        }
        barcode = '';
      } else if (e.key.length === 1) {
        // Zbieraj znaki
        barcode += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScannedCode, scannerEnabled]); // Re-bind when handler changes (on renders)

  const handleSearchEan = async () => {
    if (!eanCode) return;
    setSearchingEan(true);
    setError('');
    setDataSource(null);
    setCandidates([]);
    
    try {
      const response = await axios.get(`${API_URL}/products/lookup-ean/${eanCode}`);
      
      const data = response.data;
      if (data) {
        // Sprawdź, czy pola są już wypełnione
        if (hasFilledFields()) {
          // Zapisz dane i pokaż dialog
          setPendingEanData(data);
          setOverwriteDialogOpen(true);
        } else {
          // Brak wypełnionych pól - uzupełnij od razu
          overwriteAllFields(data);
        }
      }
    } catch (err) {
      console.error('EAN lookup error:', err);
      // Pokaż błąd w modalu
      const errorMsg = err.response?.data?.error || 'Nie znaleziono produktu w żadnej bazie danych';
      setErrorModalMessage(errorMsg);
      setErrorModalOpen(true);
      setDataSource(null);
    } finally {
      setSearchingEan(false);
    }
  };

  const handleSelectCandidate = (candidate) => {
    setProductName(candidate.name || '');
    setManufacturer(candidate.manufacturer || '');
    
    // Only overwrite dimensions if they are not manually set or if user hasn't enabled manual input
    // User requested priority for manual input
    if (candidate.dimensions) {
        // If user hasn't manually enabled/filled dimensions, populate them
        if (!includeDimensions && (candidate.dimensions.width || candidate.dimensions.height || candidate.dimensions.depth)) {
             setDimensions(prev => ({ ...prev, width: candidate.dimensions.width, height: candidate.dimensions.height, depth: candidate.dimensions.depth }));
             setIncludeDimensions(true);
        }
        if (!includeWeight && candidate.dimensions.weight) {
             setDimensions(prev => ({ ...prev, weight: candidate.dimensions.weight }));
             setIncludeWeight(true);
        }
    }
    if (candidate.parameters && Array.isArray(candidate.parameters)) {
        setProductParams(candidate.parameters);
    }
    if (candidate.categoryId) {
        setCategoryId(candidate.categoryId);
    }
    if (candidate.images && candidate.images.length > 0) {
        setSuggestedImages(candidate.images);
        setSelectedSuggestedImages(candidate.images);
    }
    if (candidate.source) {
        setDataSource(candidate.source);
    }
    
    // Regenerate description based on selected candidate
    generateDescriptionInBackground(candidate);
    
    setCandidateModalOpen(false);
  };


  const handleNext = async () => {
    if (activeStep === 0) {
      // For image-based mode, product name is optional
      if (wizardType === 'default' && !productName.trim()) {
        setError('Wprowadź nazwę produktu');
        return;
      }
      if (!price || parseFloat(price) <= 0) {
        setError('Wprowadź poprawną cenę produktu');
        return;
      }
      
      // For image-based mode, check if images are provided
      if (wizardType === 'image-based') {
        const hasOwnImages = images.length > 0 || existingImages.length > 0;
        if (!hasOwnImages) {
          setError('Dodaj przynajmniej jedno zdjęcie produktu');
          return;
        }
        
        // Generate description from images immediately
        setLoading(true);
        setSaveStatus('Generowanie opisu na podstawie zdjęć...');
        setError('');
        
        try {
          
          // First, save product if not saved yet
          let targetId = productId;
          if (!productId) {
            const formData = new FormData();
            if (productName) formData.append('productName', productName);
            formData.append('price', price);
            formData.append('vatRate', vatRate);
            if (dimensions.width) formData.append('width', dimensions.width);
            if (dimensions.height) formData.append('height', dimensions.height);
            if (dimensions.depth) formData.append('depth', dimensions.depth);
            if (dimensions.weight) formData.append('weight', dimensions.weight);
            
            images.forEach((img) => {
              formData.append('images', img);
            });
            
            const createResponse = await axios.post(`${API_URL}/products`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            });
            targetId = createResponse.data.product.id;
            setProductId(targetId);
          }
          
          // Generate description from images
          const descFormData = new FormData();
          images.forEach((img) => {
            descFormData.append('images', img);
          });
          descFormData.append('productName', productName || '');
          descFormData.append('price', price);
          if (dimensions.width || dimensions.height || dimensions.depth || dimensions.weight) {
            descFormData.append('dimensions', JSON.stringify(dimensions));
          }
          if (selectedTemplateId) {
            descFormData.append('templateId', selectedTemplateId);
          }
          
          const descResponse = await axios.post(
            `${API_URL}/ai/generate-description-from-images`,
            descFormData,
            {
              headers: {
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          
          if (descResponse.data.description) {
            setDescription(descResponse.data.description);
            
            // Update product with generated description
            await axios.put(
              `${API_URL}/products/${targetId}`,
              { description: descResponse.data.description }
            );
          }
          
          // Fetch updated product
          const productResponse = await axios.get(`${API_URL}/products/${targetId}`);
          
          const fetchedProduct = productResponse.data.product;
          const currentImages = fetchedProduct.images || [];
          setAvailableImages(currentImages);
          const selectedIds = currentImages.map(img => img.id);
          setSelectedImagesForAi(selectedIds);
          
          // Initialize edit settings for selected images with default from preferences
          const initialSettings = {};
          selectedIds.forEach(imgId => {
            initialSettings[imgId] = {
              editType: editType || 'enhance',
              backgroundImageUrl: null
            };
          });
          setImageEditSettings(initialSettings);
          
          setLoading(false);
          setActiveStep(3); // Skip to processing step
          return;
        } catch (err) {
          setError(err.response?.data?.error || 'Błąd podczas generowania opisu na podstawie zdjęć');
          setLoading(false);
          return;
        }
      }
    }
    // Krok 1: nie wymagamy zdjęć - można je dodać w kroku 0, 1 lub użyć z EAN w kroku 2
    
    // Krok 2 → 3: Musimy zapisać produkt z zdjęciami zanim przejdziemy do przetwarzania
    if (activeStep === 2) {
      // Sprawdź czy są jakieś zdjęcia (własne lub z EAN)
      const hasOwnImages = images.length > 0 || existingImages.length > 0;
      const hasEanImages = selectedSuggestedImages.length > 0;
      
      if (!hasOwnImages && !hasEanImages) {
        setError('Dodaj przynajmniej jedno zdjęcie (własne lub z bazy EAN)');
        return;
      }
      
      if (!productId || availableImages.length === 0) {
        // Zawsze zapisz i przejdź dalej, nie generuj automatycznie opisu
        // Użytkownik ma dedykowany przycisk do generowania opisu
        await saveProductAndProceed();
        return; // Funkcja sama przejdzie do kroku 3
      }
    }
    
    setError('');
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const isStep0Valid = () => {
    // For image-based mode, product name is optional
    if (wizardType === 'image-based') {
      return price && parseFloat(price) > 0;
    }
    return productName.trim() !== '' && price && parseFloat(price) > 0;
  };

  const handleBack = () => {
    if (activeStep === 0) {
      navigate('/dashboard');
      return;
    }
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError('');
  };

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/wallet`);
      setWalletBalance(response.data.wallet?.balance || 0);
      return response.data.wallet?.balance || 0;
    } catch (error) {
      console.error('Error fetching wallet:', error);
      return 0;
    }
  };

  const checkWalletBalance = async () => {
    try {
      const response = await axios.get(`${API_URL}/wallet/check-balance`);
      
      const { hasBalance, balance, required } = response.data;
      
      // Zapisz wymaganą kwotę do wyświetlenia w komunikacie
      if (required) {
        setRequiredBalance(required);
      }
      
      if (!hasBalance) {
        setInsufficientBalance(true);
        setError(`Niewystarczające saldo portfela. Wymagane minimum: ${(required || BASE_OFFER_PRICE).toFixed(2)} PLN. Aktualne saldo: ${balance.toFixed(2)} PLN.`);
        setWalletBalance(balance);
      } else {
        setInsufficientBalance(false);
        setWalletBalance(balance);
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      // W przypadku błędu, pozwól użytkownikowi kontynuować (może być problem z połączeniem)
      setInsufficientBalance(false);
    }
  };

  const loadProductForEdit = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/products/${id}`);

      const product = response.data.product;
      setProductId(product.id);
      setIsEditing(true);
      setProductName(product.product_name || '');
      setEanCode(product.ean_code || '');
      setIdentifier(product.ean_code || product.product_name || '');
      setCatalogCode(product.catalog_code || '');
      setPrice(product.price || '');
      setVatRate(product.vat_rate || '23%');
      setDescription(product.description || '');
      setManufacturer(product.manufacturer || '');
      setDimensions({
        width: product.width,
        height: product.height,
        depth: product.depth,
        weight: product.weight
      });
      
      // Auto-enable checkboxes if dimensions/weight exist
      if (product.width || product.height || product.depth) {
        setIncludeDimensions(true);
      }
      if (product.weight) {
        setIncludeWeight(true);
      }

      if (product.parameters) {
        try {
          const params = typeof product.parameters === 'string' 
            ? JSON.parse(product.parameters) 
            : product.parameters;
          setProductParams(params || []);
        } catch (e) {
          console.error('Error parsing product parameters:', e);
        }
      }
      
      if (product.images && product.images.length > 0) {
        console.log('[ProductWizard] Loading product', product.id, 'with', product.images.length, 'images');
        setExistingImages(product.images);
        // Also set available images for consistency
        setAvailableImages(product.images);
        // If product has description, we can skip to step 4
        if (product.description) {
          setActiveStep(4);
          // Load processed images if they exist - preserve imageId!
          // IMPORTANT: Only load processed images that belong to THIS product
          const processed = product.images
            .filter(img => img.processedUrl)
            .map((img, idx) => ({
              originalIndex: idx,
              imageId: img.id,  // Store the actual image ID
              processedUrl: `${API_URL.replace(/\/api\/?$/, '')}${img.processedUrl}`,
              processedUrlRelative: img.processedUrl
            }));
          setProcessedImages(processed);
          console.log('[ProductWizard] Loaded', processed.length, 'processed images for product', product.id);
        } else if (product.images.length > 0) {
          // If images exist but no description, go to step 2
          setActiveStep(2);
        }
      } else {
        // No images - ensure state is clean
        setExistingImages([]);
        setAvailableImages([]);
        setProcessedImages([]);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setError('Błąd podczas ładowania produktu');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages([...images, ...files]);
  };

  const toggleSuggestedImage = (url) => {
    if (selectedSuggestedImages.includes(url)) {
      setSelectedSuggestedImages(selectedSuggestedImages.filter(u => u !== url));
    } else {
      setSelectedSuggestedImages([...selectedSuggestedImages, url]);
    }
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removeExistingImage = async (imageId) => {
    if (!productId) {
      // If product not saved yet, just remove from state
      setExistingImages(existingImages.filter(img => img.id !== imageId));
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/products/${productId}/images/${imageId}`);
      setExistingImages(existingImages.filter(img => img.id !== imageId));
    } catch (err) {
      console.error('Error deleting image:', err);
      setError('Błąd podczas usuwania zdjęcia: ' + (err.response?.data?.error || err.message));
    }
  };

  const removeSuggestedImage = (url) => {
    setSuggestedImages(suggestedImages.filter(u => u !== url));
    setSelectedSuggestedImages(selectedSuggestedImages.filter(u => u !== url));
  };

  // Funkcja do zapisywania produktu bez generowania opisu (gdy opis już istnieje)
  const saveProductAndProceed = async () => {
    setLoading(true);
    setSaveStatus('Zapisywanie danych produktu...');
    setError('');

    try {
      let targetId = productId;

      if (!productId) {
        // Tworzenie nowego produktu z istniejącym opisem
        const formData = new FormData();
        formData.append('productName', productName);
        formData.append('eanCode', eanCode);
        formData.append('catalogCode', catalogCode);
        formData.append('price', price);
        formData.append('vatRate', vatRate);
        formData.append('description', description); // Zapisz istniejący opis
        
        // Add dimensions
        if (dimensions.width) formData.append('width', dimensions.width);
        if (dimensions.height) formData.append('height', dimensions.height);
        if (dimensions.depth) formData.append('depth', dimensions.depth);
        if (dimensions.weight) formData.append('weight', dimensions.weight);

        if (productParams.length > 0) {
          formData.append('parameters', JSON.stringify(productParams));
        }
        images.forEach((img) => {
          formData.append('images', img);
        });
        selectedSuggestedImages.forEach((url) => {
          formData.append('remoteImages', url);
        });

        const createResponse = await axios.post(`${API_URL}/products`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const createdProduct = createResponse.data.product;
        targetId = createdProduct.id;
        setProductId(targetId);

        if (createdProduct.product_name) {
          setProductName(createdProduct.product_name);
        }
      } else {
        // Aktualizacja istniejącego produktu z opisem
        await axios.put(`${API_URL}/products/${productId}`, {
          productName,
          eanCode,
          catalogCode,
          price,
          vatRate,
          description,
          parameters: productParams,
          width: dimensions.width,
          height: dimensions.height,
          depth: dimensions.depth,
          weight: dimensions.weight
        });

        // Upload new images if any
        const hasNewLocalImages = images.length > 0;
        const hasNewRemoteImages = selectedSuggestedImages.length > 0;
        
        if (hasNewLocalImages || hasNewRemoteImages) {
          const formData = new FormData();
          images.forEach((img) => {
            formData.append('images', img);
          });
          selectedSuggestedImages.forEach((url) => {
            formData.append('remoteImages', url);
          });
          
          await axios.post(`${API_URL}/products/${productId}/images`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      // Fetch updated product to get current images for Step 3 selection
      console.log('[ProductWizard] saveProductAndProceed: Fetching images for product ID:', targetId);
      setSaveStatus('Pobieranie zaktualizowanych danych...');
      const productResponse = await axios.get(`${API_URL}/products/${targetId}`);
      
      const fetchedProduct = productResponse.data.product;
      
      // Update local state with any data enriched by backend (e.g. AI description from EAN)
      if (fetchedProduct.description && !description) {
        setDescription(fetchedProduct.description);
      }
      // If backend updated the name (e.g. via EAN lookup), update local state
      if (fetchedProduct.product_name && (!productName || productName !== fetchedProduct.product_name)) {
        setProductName(fetchedProduct.product_name);
      }
      
      if (!fetchedProduct || fetchedProduct.id !== targetId) {
        console.error('[ProductWizard] Product ID mismatch! Expected:', targetId, 'Got:', fetchedProduct?.id);
        setError('Błąd podczas pobierania zdjęć produktu. Spróbuj ponownie.');
        return;
      }
      
      const currentImages = fetchedProduct.images || [];
      setProcessedImages([]);
      setAvailableImages(currentImages);
      
      const existingIds = existingImages.map(img => img.id);
      const newImages = currentImages.filter(img => !existingIds.includes(img.id));
      
      const selectedIds = newImages.length > 0
        ? newImages.map(img => img.id)
        : currentImages.map(img => img.id);
      
      setSelectedImagesForAi(selectedIds);
      
      // Initialize edit settings for selected images with default from preferences
      const initialSettings = {};
      selectedIds.forEach(imgId => {
        initialSettings[imgId] = {
          editType: editType || 'enhance',
          backgroundImageUrl: null
        };
      });
      setImageEditSettings(initialSettings);
      
      console.log('[ProductWizard] saveProductAndProceed: Set availableImages:', currentImages.length, 'images for product', targetId);
      
      setActiveStep(3); // Move to processing step
    } catch (err) {
      setError(err.response?.data?.error || 'Błąd podczas zapisywania produktu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDescription = async () => {
    setLoading(true);
    setSaveStatus('Przygotowywanie danych do generowania opisu...');
    setError('');

    try {
      
      // First, create or update product draft if not already created
      let currentProductName = productName;
      let currentEanCode = eanCode;
      let currentCatalogCode = catalogCode;
      let targetId = productId;

      if (!productId) {
        const formData = new FormData();
        formData.append('productName', productName);
        formData.append('eanCode', eanCode);
        formData.append('catalogCode', catalogCode);
        formData.append('price', price);
        formData.append('vatRate', vatRate);
        if (dimensions.width) formData.append('width', dimensions.width);
        if (dimensions.height) formData.append('height', dimensions.height);
        if (dimensions.depth) formData.append('depth', dimensions.depth);
        if (dimensions.weight) formData.append('weight', dimensions.weight);
        if (productParams.length > 0) {
          formData.append('parameters', JSON.stringify(productParams));
        }
        images.forEach((img) => {
          formData.append('images', img);
        });
        selectedSuggestedImages.forEach((url) => {
          formData.append('remoteImages', url);
        });

        const createResponse = await axios.post(`${API_URL}/products`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        const createdProduct = createResponse.data.product;
        targetId = createdProduct.id;
        setProductId(targetId);

        // Update local state with data potentially fetched from backend (e.g. EAN-DB)
        if (createdProduct.product_name) {
          setProductName(createdProduct.product_name);
          currentProductName = createdProduct.product_name;
        }
      } else if (isEditing) {
        // Update existing product info if editing
        await axios.put(`${API_URL}/products/${productId}`, {
          productName,
          eanCode,
          catalogCode,
          price,
          vatRate,
          parameters: productParams,
          width: dimensions.width,
          height: dimensions.height,
          depth: dimensions.depth,
          weight: dimensions.weight
        });

        // Upload new images if any (local files or remote EAN/Allegro images)
        const hasNewLocalImages = images.length > 0;
        const hasNewRemoteImages = selectedSuggestedImages.length > 0;
        
        if (hasNewLocalImages || hasNewRemoteImages) {
          const formData = new FormData();
          
          // Add local images
          images.forEach((img) => {
            formData.append('images', img);
          });
          
          // Add remote images from EAN/Allegro
          selectedSuggestedImages.forEach((url) => {
            formData.append('remoteImages', url);
          });
          
          // Upload new images to existing product
          await axios.post(`${API_URL}/products/${productId}/images`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      // WAŻNE: Przed generowaniem opisu, jeśli mamy kod EAN, pobierz aktualną nazwę z bazy EAN
      // To zapewnia, że używamy poprawnej nazwy z bazy EAN, a nie starej nazwy wpisanej przez użytkownika
      if (currentEanCode) {
        try {
          const eanResponse = await axios.get(`${API_URL}/products/lookup-ean/${currentEanCode}`);
          if (eanResponse.data && eanResponse.data.name) {
            // Użyj nazwy z bazy EAN do generowania opisu
            currentProductName = eanResponse.data.name;
            // Zaktualizuj też state, aby użytkownik widział poprawną nazwę
            setProductName(eanResponse.data.name);
          }
        } catch (err) {
          console.error('Error fetching EAN data for product name:', err);
          // Kontynuuj z obecną nazwą, jeśli nie udało się pobrać z bazy EAN
        }
      }

      // Generate description - use existing images if editing, otherwise use new images
      const imagesToUse = isEditing && existingImages.length > 0 
        ? existingImages.map((_, i) => i)
        : images.map((_, i) => i);

      setSaveStatus('Generowanie opisu przez AI (może to chwilę potrwać)...');
      const descResponse = await axios.post(
        `${API_URL}/ai/generate-description`,
        {
          productName: currentProductName,
          eanCode,
          catalogCode,
          manufacturer,
          dimensions,
          parameters: productParams,
          images: imagesToUse,
          templateId: selectedTemplateId || undefined,
          aiOptions: {
            includeDimensions,
            includeWeight,
            customInstructions: customAiInstructions
          }
        }
      );

      setDescription(descResponse.data.description);
      
      // Fetch updated product to get current images for Step 3 selection
      // IMPORTANT: Use targetId (local variable) to ensure we get the correct product's images
      console.log('[ProductWizard] Fetching images for product ID:', targetId);
      const productResponse = await axios.get(`${API_URL}/products/${targetId}`);
      
      const fetchedProduct = productResponse.data.product;
      console.log('[ProductWizard] Fetched product:', fetchedProduct?.id, 'with', fetchedProduct?.images?.length, 'images');
      
      // Verify we got the correct product
      if (!fetchedProduct || fetchedProduct.id !== targetId) {
        console.error('[ProductWizard] Product ID mismatch! Expected:', targetId, 'Got:', fetchedProduct?.id);
        setError('Błąd podczas pobierania zdjęć produktu. Spróbuj ponownie.');
        return;
      }
      
      const currentImages = fetchedProduct.images || [];
      
      // Clear any previous processed images to avoid showing images from other products
      setProcessedImages([]);
      
      // Set available images from the current product ONLY
      setAvailableImages(currentImages);
      
      // Default selection: select images that were NOT in existingImages
      // Identify new images by checking if their ID is not in existingImages
      const existingIds = existingImages.map(img => img.id);
      const newImages = currentImages.filter(img => !existingIds.includes(img.id));
      
      // If we added new images, select them. If only existing images, select all.
      // This ensures user sees which images will be processed
      const selectedIds = newImages.length > 0 
        ? newImages.map(img => img.id)
        : currentImages.map(img => img.id);
      
      setSelectedImagesForAi(selectedIds);
      
      // Initialize edit settings for selected images with default from preferences
      const initialSettings = {};
      selectedIds.forEach(imgId => {
        initialSettings[imgId] = {
          editType: editType || 'enhance',
          backgroundImageUrl: null
        };
      });
      setImageEditSettings(initialSettings);
      
      console.log('[ProductWizard] Set availableImages:', currentImages.length, 'images for product', targetId);
      
      setActiveStep(3); // Move to processing step
    } catch (err) {
      setError(err.response?.data?.error || 'Błąd podczas generowania opisu');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessImages = async () => {
    // Krok 3: Konfiguracja przetwarzania zdjęć - teraz tylko zatwierdzamy ustawienia
    // Przetwarzanie odbędzie się w tle po zakończeniu kreatora
    
    if (availableImages.length === 0) {
        setError('Brak dostępnych zdjęć. Wróć i dodaj zdjęcia.');
        return;
    }

    if (selectedImagesForAi.length === 0) {
        setError('Wybierz przynajmniej jedno zdjęcie do przetworzenia.');
        return;
    }

    // Walidacja dla zmiany tła - sprawdź wszystkie wybrane zdjęcia
    for (const imgId of selectedImagesForAi) {
      const settings = imageEditSettings[imgId] || { editType: editType || 'enhance', backgroundImageUrl: null };
      if (settings.editType === 'replace_bg' && !settings.backgroundImageUrl && !defaultBgImageUrl) {
        setError(`Wybierz tło dla zdjęcia, które ma typ edycji "Zmień tło"`);
        return;
      }
    }

    // Zapisz ustawienia edycji (wystarczy, że są w state, zostaną użyte w handleFinish)
    setActiveStep(4);
  };

  const handleFinish = async () => {
    setLoading(true);
    setSaveStatus('Zapisywanie produktu...');
    setError('');

    try {
      let targetId = productId;
      let finalProductName = productName;

      // 1. Create or Update Product
      if (!productId) {
         // Create new
        const formData = new FormData();
        formData.append('productName', productName);
        formData.append('eanCode', eanCode);
        formData.append('catalogCode', catalogCode);
        formData.append('price', price);
        formData.append('vatRate', vatRate);
        if (dimensions.width) formData.append('width', dimensions.width);
        if (dimensions.height) formData.append('height', dimensions.height);
        if (dimensions.depth) formData.append('depth', dimensions.depth);
        if (dimensions.weight) formData.append('weight', dimensions.weight);
        if (productParams.length > 0) {
          formData.append('parameters', JSON.stringify(productParams));
        }
        images.forEach((img) => {
          formData.append('images', img);
        });
        selectedSuggestedImages.forEach((url) => {
          formData.append('remoteImages', url);
        });

        const createResponse = await axios.post(`${API_URL}/products`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        targetId = createResponse.data.product.id;
        finalProductName = createResponse.data.product.product_name;
        setProductId(targetId);
      } else {
        // Update existing
        await axios.put(
            `${API_URL}/products/${productId}`,
            {
              productName,
              eanCode,
              catalogCode,
              description: description || '',
              price,
              vatRate,
              parameters: productParams,
              width: dimensions.width,
              height: dimensions.height,
              depth: dimensions.depth,
              weight: dimensions.weight
            }
        );

        // Upload new images
        const hasNewLocalImages = images.length > 0;
        const hasNewRemoteImages = selectedSuggestedImages.length > 0;
        
        if (hasNewLocalImages || hasNewRemoteImages) {
          const formData = new FormData();
          images.forEach((img) => {
            formData.append('images', img);
          });
          selectedSuggestedImages.forEach((url) => {
            formData.append('remoteImages', url);
          });
          
          await axios.post(`${API_URL}/products/${productId}/images`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
        targetId = productId;
      }

      // 2. Fetch all images to include in job
      setSaveStatus('Weryfikacja zdjęć...');
      const productResponse = await axios.get(`${API_URL}/products/${targetId}`);
      const allImages = productResponse.data.product.images || [];
      const allImageIds = allImages.map(img => img.id);

      // Determine which image IDs to use for processing
      // If selectedImagesForAi has valid IDs that exist in current product images, use them
      // Otherwise fall back to ALL product images (handles cases where IDs changed)
      let finalSelectedImageIds = selectedImagesForAi.filter(id => allImageIds.includes(id));
      if (finalSelectedImageIds.length === 0 && allImageIds.length > 0) {
        console.warn('[ProductWizard] selectedImagesForAi IDs not found in current images, falling back to all images');
        finalSelectedImageIds = allImageIds;
      }

      // 3. Create Background Job
      setSaveStatus('Tworzenie zadania przetwarzania w tle...');
      
      // Prepare individual image edit settings
      // Upload background images for replace_bg if needed
      const processedImageSettings = {};
      for (const imgId of finalSelectedImageIds) {
        const settings = imageEditSettings[imgId] || { editType: editType || 'enhance', backgroundImageUrl: null };
        let bgUrl = settings.backgroundImageUrl || defaultBgImageUrl;
        
        // If replace_bg and has backgroundImageFile, upload it
        if (settings.editType === 'replace_bg' && settings.backgroundImageFile) {
          setSaveStatus(`Przesyłanie tła dla zdjęcia ${imgId}...`);
          const formData = new FormData();
          formData.append('images', settings.backgroundImageFile);
          const upRes = await axios.post(`${API_URL}/products/${targetId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (upRes.data.addedImages && upRes.data.addedImages.length > 0) {
            bgUrl = upRes.data.addedImages[0].url;
          }
        }
        
        processedImageSettings[imgId] = {
          editType: settings.editType || editType || 'enhance',
          backgroundImageUrl: bgUrl
        };
      }

      // Always generate description in background job
      // For image-based mode: backend uses Vision AI on product images
      // For default mode: backend uses text-based generation (EAN/name/params)
      const shouldGenerateDescription = !description;
      
      const jobData = {
          productId: targetId,
          productName: finalProductName,
          selectedImageIds: finalSelectedImageIds, // Validated against current DB images
          imageEditSettings: processedImageSettings, // Individual settings per image
          editType, // Fallback default (for backward compatibility)
          backgroundImageUrl: defaultBgImageUrl, // Fallback default
          publish: autoPublish,
          generateDescription: shouldGenerateDescription,
          wizardType: wizardType, // 'default' or 'image-based'
          templateId: selectedTemplateId || null,
          customInstructions: customAiInstructions || null
      };

      const jobResponse = await axios.post(
          `${API_URL}/jobs`,
          {
              type: 'process_images_and_publish',
              data: jobData
          }
      );

      // Start tracking job progress (like in AllegroBulkEdit)
      // setJobId(jobResponse.data.jobId);
      // setProcessing(true);
      // setLoading(false); // Close the loading dialog, show progressbar instead
      
      // Navigate to dashboard immediately
      navigate('/dashboard', { 
        state: { 
          message: 'Rozpoczęto generowanie oferty w tle. Możesz kontynuować pracę.',
          newJobId: jobResponse.data.jobId,
          newProductId: targetId
        } 
      });

    } catch (err) {
      setError(err.response?.data?.error || 'Błąd podczas tworzenia zadania');
      console.error(err);
      setLoading(false);
    } 
    // removed finally block to avoid setting state on unmounted component if navigated
  };

  const handleGenerateAiImage = async () => {
    if (!aiImagePrompt) return;
    setAiImageLoading(true);
    try {
        const response = await axios.post(`${API_URL}/ai/generate-image`, {
            prompt: aiImagePrompt,
            aspectRatio: '1:1' // Default square
        });

        if (response.data.success && response.data.images) {
            const newImages = response.data.images.map(img => `${API_URL.replace(/\/api\/?$/, '')}${img}`);
            setSuggestedImages([...suggestedImages, ...newImages]);
            setSelectedSuggestedImages([...selectedSuggestedImages, ...newImages]);
            setAiImageDialogOpen(false);
            setAiImagePrompt('');
        }
    } catch (err) {
        console.error('Error generating image:', err);
        setError('Błąd podczas generowania zdjęcia: ' + (err.response?.data?.error || err.message));
    } finally {
        setAiImageLoading(false);
    }
  };

  const renderStepContent = (step) => {
    // Step 3: Image processing configuration
    if (step === 3) {
      return (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
            Konfiguracja przetwarzania zdjęć
          </Typography>
          <Typography variant="body2" sx={{ color: '#666', mb: 4 }}>
            Wybierz zdjęcia do przetworzenia i ustaw sposób edycji dla każdego zdjęcia.
            Domyślnie używane są ustawienia z szablonów AI, ale możesz je nadpisać dla każdego zdjęcia.
          </Typography>
          
          {availableImages.length === 0 ? (
            <Alert 
              severity="info" 
              sx={{ 
                mt: 2,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
              }}
            >
              Brak dostępnych zdjęć. Wróć i dodaj zdjęcia.
            </Alert>
          ) : (
            <Box sx={{ mt: 3 }}>
              {availableImages.map((img) => {
                const isSelected = selectedImagesForAi.includes(img.id);
                const settings = imageEditSettings[img.id] || { editType: editType || 'enhance', backgroundImageUrl: null };
                
                return (
                  <Paper 
                    key={img.id} 
                    elevation={isSelected ? 2 : 1}
                    sx={{ 
                      p: 3, 
                      mb: 3,
                      border: isSelected ? '2px solid' : '1px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      bgcolor: isSelected ? 'action.selected' : 'background.paper',
                      '&:hover': {
                        boxShadow: 3
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 3 }}>
                      <Box sx={{ flexShrink: 0 }}>
                        <Box sx={{
                          borderRadius: 3,
                          overflow: 'hidden',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}>
                          <img
                            src={`${API_URL.replace(/\/api\/?$/, '')}${img.url}`}
                            alt={`Image ${img.id}`}
                            style={{ width: '150px', height: '150px', objectFit: 'cover', display: 'block' }}
                          />
                        </Box>
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedImagesForAi([...selectedImagesForAi, img.id]);
                                  // Initialize settings if not exists
                                  if (!imageEditSettings[img.id]) {
                                    setImageEditSettings({
                                      ...imageEditSettings,
                                      [img.id]: {
                                        editType: editType || 'enhance',
                                        backgroundImageUrl: null
                                      }
                                    });
                                  }
                                } else {
                                  setSelectedImagesForAi(selectedImagesForAi.filter(id => id !== img.id));
                                }
                              }}
                            />
                          }
                          label="Przetwarzaj to zdjęcie"
                        />
                        
                        {isSelected && (
                          <Box sx={{ mt: 2 }}>
                            <FormControl 
                              fullWidth 
                              size="small"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            >
                              <InputLabel>Typ edycji</InputLabel>
                              <Select
                                value={settings.editType || editType || 'enhance'}
                                label="Typ edycji"
                                onChange={(e) => {
                                  setImageEditSettings({
                                    ...imageEditSettings,
                                    [img.id]: {
                                      ...settings,
                                      editType: e.target.value
                                    }
                                  });
                                }}
                                sx={{
                                  borderRadius: 2
                                }}
                              >
                                <MenuItem value="enhance">🤖 Poprawa jakości (Ikea style)</MenuItem>
                                <MenuItem value="remove_bg">🤖 Usuń tło (Przezroczyste)</MenuItem>
                                <MenuItem value="replace_bg">🤖 Zmień tło</MenuItem>
                                <MenuItem value="blur_background">🤖 Rozmyj tło</MenuItem>
                                <MenuItem value="ai_square">🤖 Format kwadratowy</MenuItem>
                                <MenuItem value="crop_center">🤖 Przycięcie do centrum</MenuItem>
                                <MenuItem value="resize_square">🤖 Zmiana rozmiaru do kwadratu</MenuItem>
                                <MenuItem value="adjust_brightness">🤖 Regulacja jasności</MenuItem>
                                <MenuItem value="adjust_contrast">🤖 Regulacja kontrastu</MenuItem>
                                <MenuItem value="sharpen">🤖 Wyostrzenie</MenuItem>
                                <MenuItem value="saturate">🤖 Zwiększenie nasycenia</MenuItem>
                                <MenuItem value="grayscale">🤖 Czarno-białe</MenuItem>
                                <MenuItem value="vintage">🤖 Efekt vintage</MenuItem>
                              </Select>
                            </FormControl>
                            
                            {settings.editType === 'replace_bg' && (
                              <Box sx={{ mt: 2 }}>
                                <input
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  id={`bg-upload-${img.id}`}
                                  type="file"
                                  onChange={(e) => {
                                    if (e.target.files[0]) {
                                      const file = e.target.files[0];
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setImageEditSettings({
                                          ...imageEditSettings,
                                          [img.id]: {
                                            ...settings,
                                            backgroundImageFile: file,
                                            backgroundImageUrl: reader.result
                                          }
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                                <label htmlFor={`bg-upload-${img.id}`}>
                                  <Button 
                                    variant="outlined" 
                                    component="span" 
                                    size="small" 
                                    startIcon={<PhotoCameraIcon />}
                                    sx={{
                                      textTransform: 'none'
                                    }}
                                  >
                                    {settings.backgroundImageUrl ? 'Zmień tło' : 'Wgraj tło dla tego zdjęcia'}
                                  </Button>
                                </label>
                                {settings.backgroundImageUrl && (
                                  <Box sx={{ mt: 1 }}>
                                    <img 
                                      src={settings.backgroundImageUrl} 
                                      alt="Background" 
                                      style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 4 }} 
                                    />
                                  </Box>
                                )}
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      );
    }
    
    // Step 0: Main form
    const renderDropzone = (large) => (
      <Box
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        sx={{
          border: dragActive ? '3px dashed' : '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: large ? 8 : 4,
          textAlign: 'center',
          bgcolor: dragActive ? 'action.selected' : 'background.paper',
          cursor: 'pointer',
          transition: 'all 0.3s',
          mb: 3,
          mt: 2,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input
          accept="image/*"
          style={{ display: 'none' }}
          id={`image-upload-dropzone-${large ? 'large' : 'normal'}`}
          multiple
          type="file"
          onChange={handleImageUpload}
        />
        <label htmlFor={`image-upload-dropzone-${large ? 'large' : 'normal'}`} style={{ width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}>
          <Stack spacing={2} alignItems="center">
            <Box sx={{ 
              p: 2, 
              borderRadius: '50%', 
              bgcolor: dragActive ? 'primary.light' : 'action.hover',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CloudUploadIcon sx={{ 
                fontSize: large ? 64 : 48, 
                color: 'primary.main',
                transition: 'all 0.3s',
                transform: dragActive ? 'scale(1.1)' : 'scale(1)'
              }} />
            </Box>
            <Typography variant={large ? "h5" : "h6"} fontWeight={600} sx={{ color: '#1a1a1a' }}>
              {large ? "Przeciągnij i upuść zdjęcia tutaj" : "Dodaj zdjęcia produktu"}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', fontWeight: 500 }}>
              lub kliknij, aby wybrać z dysku
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mt: 1,
              p: 1,
              borderRadius: 2,
              bgcolor: 'action.hover'
            }}>
                <ContentPasteIcon fontSize="small" sx={{ color: 'primary.main' }} />
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 500 }}>
                  Możesz też wkleić zdjęcie (Ctrl+V)
                </Typography>
            </Box>
          </Stack>
        </label>
      </Box>
    );

    return (
        <Box sx={{ mt: 3 }}>
        {/* Wizard Type Selection - Modern Cards */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6}>
                <Card 
                    elevation={wizardType === 'default' ? 3 : 1}
                    sx={{ 
                        border: wizardType === 'default' ? '2px solid' : '1px solid', 
                        borderColor: wizardType === 'default' ? 'primary.main' : 'divider',
                        bgcolor: wizardType === 'default' ? 'primary.main' : 'background.paper',
                        color: wizardType === 'default' ? 'primary.contrastText' : 'text.primary',
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: 4
                        },
                        cursor: 'pointer'
                    }}
                >
                    <CardActionArea onClick={() => setWizardType('default')} sx={{ p: 3, height: '100%' }}>
                        <Stack alignItems="center" spacing={2}>
                            <Box sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: wizardType === 'default' ? 'rgba(255, 255, 255, 0.2)' : 'action.hover',
                              transition: 'all 0.3s'
                            }}>
                              <SearchIcon sx={{ fontSize: 40, color: wizardType === 'default' ? 'white' : 'primary.main' }} />
                            </Box>
                            <Typography variant="h6" align="center" fontWeight={600}>
                              Domyślny
                            </Typography>
                            <Typography variant="body2" align="center" sx={{ opacity: 0.9 }}>
                              Wyszukiwanie EAN / Perplexity
                            </Typography>
                        </Stack>
                    </CardActionArea>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Card 
                    elevation={wizardType === 'image-based' ? 3 : 1}
                    sx={{ 
                        border: wizardType === 'image-based' ? '2px solid' : '1px solid', 
                        borderColor: wizardType === 'image-based' ? 'primary.main' : 'divider',
                        bgcolor: wizardType === 'image-based' ? 'primary.main' : 'background.paper',
                        color: wizardType === 'image-based' ? 'primary.contrastText' : 'text.primary',
                        transition: 'all 0.3s',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: 4
                        },
                        cursor: 'pointer'
                    }}
                >
                    <CardActionArea onClick={() => setWizardType('image-based')} sx={{ p: 3, height: '100%' }}>
                         <Stack alignItems="center" spacing={2}>
                            <Box sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              bgcolor: wizardType === 'image-based' ? 'rgba(255, 255, 255, 0.2)' : 'action.hover',
                              transition: 'all 0.3s'
                            }}>
                              <PhotoCameraIcon sx={{ fontSize: 40, color: wizardType === 'image-based' ? 'white' : 'primary.main' }} />
                            </Box>
                            <Typography variant="h6" align="center" fontWeight={600}>
                              Na podstawie zdjęcia
                            </Typography>
                            <Typography variant="body2" align="center" sx={{ opacity: 0.9 }}>
                              Analiza obrazu przez AI
                            </Typography>
                        </Stack>
                    </CardActionArea>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageBasedHelpDialogOpen(true);
                      }}
                    >
                      <HelpIcon 
                        sx={{ 
                          fontSize: 24, 
                          color: wizardType === 'image-based' ? 'rgba(255, 255, 255, 0.9)' : 'primary.main',
                          cursor: 'pointer',
                          '&:hover': {
                            color: wizardType === 'image-based' ? 'white' : 'primary.dark',
                            transform: 'scale(1.1)'
                          },
                          transition: 'all 0.2s'
                        }} 
                      />
                    </Box>
                </Card>
            </Grid>
        </Grid>

        {/* IMAGE BASED MODE: Dropzone FIRST and LARGE */}
        {wizardType === 'image-based' && renderDropzone(true)}

        {wizardType === 'default' ? (
            <Box>
                <TextField
                    fullWidth
                    label="Kod EAN lub Nazwa produktu"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    margin="normal"
                    required
                    placeholder="Wpisz kod EAN lub nazwę produktu"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        transition: 'all 0.3s',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                        }
                      }
                    }}
                    helperText={
                    <Box component="span">
                        {eanCode.length === 13 && !searchingEan && !dataSource && (
                        <Typography variant="caption" display="block" sx={{ color: 'primary.main', fontWeight: 500, mt: 0.5 }}>
                            Wyszukiwanie automatyczne po wpisaniu pełnego kodu EAN (13 cyfr)
                        </Typography>
                        )}
                        {dataSource && (
                        <Typography variant="caption" display="block" sx={{ color: '#666', mt: 0.5 }}>
                            Źródło: {dataSource === 'ai' ? 'AI (wyszukiwanie internetowe)' : dataSource === 'ean-db' ? 'EAN-DB' : dataSource === 'allegro' ? 'Allegro' : dataSource}
                        </Typography>
                        )}
                        {eanCode && productName && productName !== identifier && (
                        <Typography variant="caption" display="block" sx={{ color: '#10b981', fontWeight: 600, mt: 0.5 }}>
                            ✓ Znaleziono: {productName}
                        </Typography>
                        )}
                    </Box>
                    }
                    InputProps={{
                    endAdornment: (
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {scannerEnabled && (
                                <IconButton
                                    onClick={handleOpenScanner}
                                    color="primary"
                                    size="small"
                                    title="Skanuj kod kreskowy"
                                    sx={{ mr: 0.5 }}
                                >
                                    <CameraAltIcon />
                                </IconButton>
                            )}
                            <Button
                                onClick={handleSearchEan}
                                disabled={!eanCode.trim() || searchingEan || !/^\d+$/.test(identifier)}
                                startIcon={searchingEan ? <CircularProgress size={20} /> : <SearchIcon />}
                                variant="contained"
                                size="small"
                                sx={{
                                  textTransform: 'none'
                                }}
                                title={eanCode.length === 13 ? "Wyszukiwanie automatyczne..." : "Kliknij, aby wyszukać"}
                            >
                                {eanCode.length === 13 && searchingEan ? "Szukam..." : "Szukaj EAN"}
                            </Button>
                        </Box>
                    )
                    }}
                />
            </Box>
        ) : (
            <TextField
                fullWidth
                label="Nazwa produktu"
                value={productName}
                onChange={(e) => {
                    setProductName(e.target.value);
                    setIdentifier(e.target.value);
                }}
                margin="normal"
                placeholder="Wpisz nazwę produktu (opcjonalnie)"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
                    },
                    '&.Mui-focused': {
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
                    }
                  }
                }}
            />
        )}

        {/* Candidates List */}
        {candidates.length > 1 && (
            <Box sx={{ 
              mt: 2, 
              mb: 3, 
              p: 3, 
              bgcolor: 'action.selected',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                    Znaleziono {candidates.length} ofert. Wybierz najlepszą:
                </Typography>
                <Box sx={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {candidates.map((candidate, idx) => (
                        <Paper 
                          key={idx} 
                          elevation={0}
                          sx={{ 
                            p: 2, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            borderRadius: 2,
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            transition: 'all 0.3s',
                            '&:hover': {
                              boxShadow: 2,
                              borderColor: 'primary.main'
                            }
                          }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'hidden', flex: 1 }}>
                                {candidate.images && candidate.images.length > 0 && (
                                    <Box sx={{ 
                                      width: 50, 
                                      height: 50, 
                                      borderRadius: 2, 
                                      overflow: 'hidden',
                                      mr: 2,
                                      border: '1px solid rgba(0, 0, 0, 0.08)',
                                      flexShrink: 0
                                    }}>
                                      <img 
                                          src={candidate.images[0]} 
                                          alt="" 
                                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                      />
                                    </Box>
                                )}
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" noWrap title={candidate.name} sx={{ fontWeight: 500 }}>
                                        {candidate.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#666', fontWeight: 500 }}>
                                        {candidate.source === 'allegro' ? 'Allegro' : candidate.source}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{ flexShrink: 0, ml: 2, display: 'flex', gap: 1 }}>
                                <Button 
                                    size="small" 
                                    onClick={() => {
                                        setViewingCandidate(candidate);
                                        setCandidateModalOpen(true);
                                    }}
                                    sx={{ 
                                      minWidth: 'auto',
                                      borderRadius: 2,
                                      textTransform: 'none',
                                      fontWeight: 500
                                    }}
                                >
                                    Szczegóły
                                </Button>
                                <Button 
                                    size="small" 
                                    variant="contained" 
                                    onClick={() => handleSelectCandidate(candidate)}
                                    sx={{ 
                                      minWidth: 'auto',
                                      textTransform: 'none'
                                    }}
                                >
                                    Wybierz
                                </Button>
                            </Box>
                        </Paper>
                    ))}
                </Box>
            </Box>
        )}
        <TextField
            fullWidth
            label="Cena (PLN)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            margin="normal"
            type="number"
            required
            inputProps={{ min: 0, step: 0.01 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2
              }
            }}
        />
        <FormControl 
          fullWidth 
          margin="normal"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              transition: 'all 0.3s',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
              },
              '&.Mui-focused': {
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.25)',
              }
            }
          }}
        >
            <InputLabel>Stawka VAT</InputLabel>
            <Select
            value={vatRate}
            onChange={(e) => setVatRate(e.target.value)}
            label="Stawka VAT"
            >
            <MenuItem value="23%">23%</MenuItem>
            <MenuItem value="5%">5%</MenuItem>
            <MenuItem value="0%">0%</MenuItem>
            <MenuItem value="zw">Zwolniony</MenuItem>
            <MenuItem value="np">Nie podlega</MenuItem>
            <MenuItem value="off">Wyłączony</MenuItem>
            </Select>
        </FormControl>

        {/* DEFAULT MODE: Dropzone here (Normal size) */}
        {wizardType === 'default' && (
             <Box sx={{ mt: 3 }}>
                 <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Zdjęcia produktu
                </Typography>
                {renderDropzone(false)}
             </Box>
        )}

        {/* EAN Images Selection (if available) - only in default mode */}
        {wizardType === 'default' && suggestedImages.length > 0 && (
            <Box sx={{ mt: 3, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Zdjęcia sugerowane (EAN / AI)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {suggestedImages.map((url, index) => (
                <Box 
                    key={`suggested-${index}`} 
                    sx={{ 
                    position: 'relative', 
                    cursor: 'pointer',
                    border: selectedSuggestedImages.includes(url) ? '3px solid' : '2px solid',
                    borderColor: selectedSuggestedImages.includes(url) ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 3
                    }
                    }}
                >
                    <img
                    src={url}
                    alt={`Suggested ${index + 1}`}
                    style={{ width: '150px', height: '150px', objectFit: 'cover', display: 'block' }}
                    onClick={() => toggleSuggestedImage(url)}
                    />
                    {selectedSuggestedImages.includes(url) && (
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      left: 8, 
                      bgcolor: 'primary.main', 
                      color: 'primary.contrastText',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 2
                    }}>
                        <Checkbox checked={true} size="small" sx={{ color: 'white', p: 0 }} />
                    </Box>
                    )}
                    <Button
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        removeSuggestedImage(url);
                    }}
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      minWidth: 'auto',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 1)',
                      },
                      p: 0,
                      fontSize: 18,
                      fontWeight: 'bold'
                    }}
                    >
                    ×
                    </Button>
                </Box>
                ))}
            </Box>
            </Box>
        )}

        <Box sx={{ mt: 2 }}>
             {/* Existing and New Images Previews */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
            {/* Existing Images */}
            {existingImages.map((img, index) => (
                <Box 
                  key={`existing-${index}`} 
                  sx={{ 
                    position: 'relative',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                <img
                    src={`${API_URL.replace(/\/api\/?$/, '')}${img.url}`}
                    alt={`Existing ${index + 1}`}
                    style={{ width: '150px', height: '150px', objectFit: 'cover', display: 'block' }}
                />
                <Button
                    size="small"
                    onClick={() => removeExistingImage(img.id)}
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      minWidth: 'auto',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 1)',
                      },
                      p: 0,
                      fontSize: 18,
                      fontWeight: 'bold'
                    }}
                >
                    ×
                </Button>
                </Box>
            ))}
            {/* New Images */}
            {images.map((img, index) => (
                <Box 
                  key={`new-${index}`} 
                  sx={{ 
                    position: 'relative',
                    borderRadius: 3,
                    overflow: 'hidden',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    }
                  }}
                >
                <img
                    src={URL.createObjectURL(img)}
                    alt={`Preview ${index + 1}`}
                    style={{ width: '150px', height: '150px', objectFit: 'cover', display: 'block' }}
                />
                <Button
                    size="small"
                    onClick={() => removeImage(index)}
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      minWidth: 'auto',
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(239, 68, 68, 1)',
                      },
                      p: 0,
                      fontSize: 18,
                      fontWeight: 'bold'
                    }}
                >
                    ×
                </Button>
                </Box>
            ))}
            </Box>
             <Button
                variant="outlined"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => setAiImageDialogOpen(true)}
                sx={{ 
                  mt: 2,
                  textTransform: 'none'
                }}
            >
                Generuj zdjęcie z AI
            </Button>
        </Box>

        {/* Optional Dimensions & Weight */}
        <Accordion 
          elevation={0}
          sx={{ 
            mt: 2, 
            mb: 2,
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.08)',
            '&:before': {
              display: 'none'
            },
            '&.Mui-expanded': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            }
          }} 
          expanded={includeDimensions || includeWeight} 
          onChange={(e, expanded) => {
             // Just toggle visual expansion if needed, but we control individual checkboxes inside
             if (!expanded && !dimensions.width && !dimensions.height && !dimensions.depth && !dimensions.weight) {
                 setIncludeDimensions(false);
                 setIncludeWeight(false);
             } else if (expanded) {
                 // Open both by default if opening
                 if (!includeDimensions) setIncludeDimensions(true);
                 if (!includeWeight) setIncludeWeight(true);
             }
        }}>
            <AccordionSummary 
              expandIcon={<ExpandMoreIcon />}
              sx={{
                borderRadius: 2,
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
                <Typography sx={{ fontWeight: 500 }}>Wymiary i waga (opcjonalne)</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={includeDimensions}
                                onChange={(e) => setIncludeDimensions(e.target.checked)}
                            />
                        }
                        label="Wymiary produktu (cm)"
                    />
                    {includeDimensions && (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Szerokość"
                                type="number"
                                size="small"
                                value={dimensions.width || ''}
                                onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                                InputProps={{ inputProps: { min: 0 } }}
                                fullWidth
                            />
                            <TextField
                                label="Wysokość"
                                type="number"
                                size="small"
                                value={dimensions.height || ''}
                                onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                                InputProps={{ inputProps: { min: 0 } }}
                                fullWidth
                            />
                            <TextField
                                label="Głębokość"
                                type="number"
                                size="small"
                                value={dimensions.depth || ''}
                                onChange={(e) => setDimensions({ ...dimensions, depth: e.target.value })}
                                InputProps={{ inputProps: { min: 0 } }}
                                fullWidth
                            />
                        </Box>
                    )}

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={includeWeight}
                                onChange={(e) => setIncludeWeight(e.target.checked)}
                            />
                        }
                        label="Waga produktu (kg)"
                    />
                    {includeWeight && (
                        <TextField
                            label="Waga"
                            type="number"
                            size="small"
                            value={dimensions.weight || ''}
                            onChange={(e) => setDimensions({ ...dimensions, weight: e.target.value })}
                            InputProps={{ inputProps: { min: 0, step: 0.001 } }}
                            fullWidth
                        />
                    )}
                </Box>
            </AccordionDetails>
        </Accordion>

        {/* Template Selection - Moved to BOTTOM */}
        <Box sx={{ 
          mb: 3, 
          mt: 4, 
          p: 3, 
          bgcolor: 'action.selected',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1a1a1a', mb: 2 }}>
              Opcje AI (opcjonalne)
            </Typography>
            
            {aiTemplates.length > 0 && (
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Wybierz szablon AI</InputLabel>
                    <Select
                    value={selectedTemplateId}
                    label="Wybierz szablon AI"
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                    {aiTemplates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                    </Select>
                </FormControl>
            )}
            
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Rodzaj edycji zdjęć</InputLabel>
                <Select
                    value={editType}
                    label="Rodzaj edycji zdjęć"
                    onChange={(e) => setEditType(e.target.value)}
                >
                    <MenuItem value="enhance">🤖 Poprawa jakości (Ikea style)</MenuItem>
                    <MenuItem value="remove_bg">🤖 Usuń tło (Przezroczyste)</MenuItem>
                    <MenuItem value="replace_bg">🤖 Zmień tło</MenuItem>
                    <MenuItem value="blur_background">🤖 Rozmyj tło</MenuItem>
                    <MenuItem value="ai_square">🤖 Format kwadratowy</MenuItem>
                    <MenuItem value="crop_center">🤖 Przycięcie do centrum</MenuItem>
                    <MenuItem value="resize_square">🤖 Zmiana rozmiaru do kwadratu</MenuItem>
                    <MenuItem value="adjust_brightness">🤖 Regulacja jasności</MenuItem>
                    <MenuItem value="adjust_contrast">🤖 Regulacja kontrastu</MenuItem>
                    <MenuItem value="sharpen">🤖 Wyostrzenie</MenuItem>
                    <MenuItem value="saturate">🤖 Zwiększenie nasycenia</MenuItem>
                    <MenuItem value="grayscale">🤖 Czarno-białe</MenuItem>
                    <MenuItem value="vintage">🤖 Efekt vintage</MenuItem>
                </Select>
            </FormControl>
            
            {editType === 'replace_bg' && (
                <Box sx={{ mb: 2 }}>
                    <input
                        accept="image/*"
                        style={{ display: 'none' }}
                        id="bg-upload-wizard"
                        type="file"
                        onChange={(e) => {
                            if (e.target.files[0]) {
                                setBackgroundImage(e.target.files[0]);
                            }
                        }}
                    />
                    <label htmlFor="bg-upload-wizard">
                        <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />} size="small" fullWidth>
                            {backgroundImage ? 'Zmień tło' : 'Wgraj tło'}
                        </Button>
                    </label>
                    {backgroundImage && (
                        <Box sx={{ mt: 1 }}>
                            <img 
                                src={URL.createObjectURL(backgroundImage)} 
                                alt="Tło" 
                                style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 4 }} 
                            />
                        </Box>
                    )}
                </Box>
            )}
            
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              label="Dodatkowe instrukcje / dane dla AI"
              placeholder="Np. Podkreśl, że produkt jest ekologiczny. Nie wspominaj o..."
              value={customAiInstructions}
              onChange={(e) => setCustomAiInstructions(e.target.value)}
              sx={{ mt: 2 }}
            />
        </Box>

        </Box>
    );
  };

  return (
    <Layout title="Kreator produktu" maxWidth="md">
        {/* Progress Bar - Always Visible when Processing (like in AllegroBulkEdit) */}
        {processing && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              mb: 3, 
              bgcolor: 'primary.main',
              borderRadius: 2,
              position: 'sticky', 
              top: 80, 
              zIndex: 1000,
              boxShadow: 4
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ color: 'primary.contrastText' }}>
                Trwa generowanie oferty (Opis + Zdjęcia)...
              </Typography>
              <Typography variant="h6" sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>
                {Math.round(jobProgress.progress || 0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={jobProgress.progress || 0} 
              sx={{ 
                height: 12, 
                borderRadius: 6,
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 6,
                  bgcolor: 'primary.contrastText'
                }
              }} 
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'primary.contrastText', opacity: 0.9 }}>
                Oferta jest generowana w tle. Zostaniesz przekierowany po zakończeniu.
              </Typography>
            </Box>
          </Paper>
        )}

        <Paper 
          elevation={2} 
          sx={{ 
            p: { xs: 3, sm: 5 }, 
            borderRadius: 2
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Stepper 
              activeStep={activeStep}
              sx={{
                flexGrow: 1
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Button
              onClick={() => {
                setTutorialPage(0);
                setTutorialOpen(true);
              }}
              startIcon={<SchoolIcon />}
              variant="outlined"
              size="small"
              sx={{ ml: 2, textTransform: 'none' }}
            >
              Samouczek
            </Button>
          </Box>

          {insufficientBalance && !editProductId && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 3,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                '& .MuiAlert-icon': {
                  fontSize: 28
                }
              }}
              action={
              <Button 
                variant="contained"
                size="small" 
                onClick={() => navigate('/wallet')}
                sx={{
                  textTransform: 'none'
                }}
              >
                  Przejdź do portfela
                </Button>
              }
            >
              {error || 'Niewystarczające saldo portfela. Doładuj portfel, aby móc tworzyć produkty.'}
            </Alert>
          )}

          {error && !insufficientBalance && (
            <Alert 
              severity="error" 
              sx={{ 
                mt: 3,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                '& .MuiAlert-icon': {
                  fontSize: 28
                }
              }}
            >
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4, minHeight: '400px' }}>
            {insufficientBalance && !editProductId ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Niewystarczające saldo portfela
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
                  Aby utworzyć produkt, potrzebujesz minimum {requiredBalance.toFixed(2)} PLN na koncie.
                  <br />
                  Aktualne saldo: {walletBalance.toFixed(2)} PLN
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/wallet')}
                  sx={{ mr: 2 }}
                >
                  Doładuj portfel
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/dashboard')}
                >
                  Wróć do dashboardu
                </Button>
              </Box>
            ) : (
              renderStepContent(activeStep)
            )}
          </Box>

          {!insufficientBalance && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 5, gap: 2 }}>
              <Button
                onClick={handleBack}
                sx={{
                  textTransform: 'none'
                }}
              >
                Wstecz
              </Button>
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={handleFinish}
                    disabled={loading}
                    sx={{
                      textTransform: 'none'
                    }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Zakończ'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={loading || (activeStep === 0 && !isStep0Valid())}
                    sx={{
                      textTransform: 'none'
                    }}
                  >
                    Dalej
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>

      {/* Modal błędu wyszukiwania */}
      <Dialog open={errorModalOpen} onClose={() => setErrorModalOpen(false)}>
        <DialogTitle>Nie znaleziono produktu</DialogTitle>
        <DialogContent>
          <Typography>{errorModalMessage}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorModalOpen(false)} variant="contained">
            Zamknij
          </Button>
        </DialogActions>
      </Dialog>

      {/* Candidate Details Modal */}
      <Dialog open={candidateModalOpen} onClose={() => setCandidateModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{viewingCandidate?.name || 'Szczegóły oferty'}</DialogTitle>
        <DialogContent dividers>
            {viewingCandidate && (
                <Box>
                    <Typography variant="subtitle1" gutterBottom>Producent: {viewingCandidate.manufacturer || 'Brak danych'}</Typography>
                    
                    {viewingCandidate.images && viewingCandidate.images.length > 0 && (
                        <Box sx={{ my: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Zdjęcia:</Typography>
                            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                                {viewingCandidate.images.map((img, i) => (
                                    <img 
                                        key={i} 
                                        src={img} 
                                        alt={`Product ${i}`} 
                                        style={{ height: 100, borderRadius: 4, border: '1px solid #ddd' }} 
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Parametry:</Typography>
                        {viewingCandidate.parameters && Array.isArray(viewingCandidate.parameters) ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1 }}>
                                {viewingCandidate.parameters.map((p, i) => (
                                    <Box key={i} sx={{ p: 1, bgcolor: '#f9f9f9', borderRadius: 1 }}>
                                        <Typography variant="caption" color="textSecondary">{p.name}</Typography>
                                        <Typography variant="body2">{Array.isArray(p.values) ? p.values.join(', ') : p.values}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="textSecondary">Brak szczegółowych parametrów</Typography>
                        )}
                    </Box>
                    
                    {viewingCandidate.description && (
                         <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Opis:</Typography>
                            <Paper variant="outlined" sx={{ p: 2, mt: 1, bgcolor: 'background.default' }}>
                                {(() => {
                                    const description = viewingCandidate.description;
                                    const images = viewingCandidate.images || [];
                                    
                                    // Check if description contains placeholders
                                    const hasPlaceholders = /\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i.test(description);
                                    
                                    if (hasPlaceholders && images.length > 0) {
                                        // Replace placeholders with images
                                        let imageIndex = 0;
                                        const parts = description.split(/(\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\])/gi);
                                        
                                        return (
                                            <Box sx={{ '& img': { maxWidth: '100%', height: 'auto', margin: '10px 0', borderRadius: '4px', display: 'block', border: '1px solid #ddd' } }}>
                                                {parts.map((part, idx) => {
                                                    if (/\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i.test(part)) {
                                                        if (imageIndex < images.length) {
                                                            const imgUrl = images[imageIndex];
                                                            imageIndex++;
                                                            return (
                                                                <Box key={idx} sx={{ my: 2 }}>
                                                                    <img 
                                                                        src={imgUrl} 
                                                                        alt="Product" 
                                                                        style={{ 
                                                                            maxWidth: '100%', 
                                                                            height: 'auto', 
                                                                            borderRadius: '4px',
                                                                            display: 'block',
                                                                            border: '1px solid #ddd'
                                                                        }} 
                                                                    />
                                                                </Box>
                                                            );
                                                        }
                                                        return null;
                                                    }
                                                    return (
                                                        <Box 
                                                            key={idx} 
                                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(part) }}
                                                            sx={{
                                                                '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0', lineHeight: 1.2 },
                                                                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0', lineHeight: 1.3 },
                                                                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0', lineHeight: 1.4 },
                                                                '& p': { margin: '0.5rem 0', lineHeight: 1.6 },
                                                                '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                                                                '& li': { margin: '0.25rem 0', lineHeight: 1.6 },
                                                                '& b, & strong': { fontWeight: 'bold' },
                                                                '& i, & em': { fontStyle: 'italic' },
                                                                '& a': { color: 'primary.main', textDecoration: 'underline' }
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        );
                                    }
                                    
                                    // No placeholders or no images - render as HTML
                                    const displayText = description.length > 500 
                                        ? description.substring(0, 500) + '...' 
                                        : description;
                                    return (
                                        <Box 
                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(displayText) }}
                                            sx={{
                                                '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0', lineHeight: 1.2 },
                                                '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0', lineHeight: 1.3 },
                                                '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0', lineHeight: 1.4 },
                                                '& p': { margin: '0.5rem 0', lineHeight: 1.6 },
                                                '& ul, & ol': { margin: '0.5rem 0', paddingLeft: '1.5rem' },
                                                '& li': { margin: '0.25rem 0', lineHeight: 1.6 },
                                                '& b, & strong': { fontWeight: 'bold' },
                                                '& i, & em': { fontStyle: 'italic' },
                                                '& a': { color: 'primary.main', textDecoration: 'underline' }
                                            }}
                                        />
                                    );
                                })()}
                            </Paper>
                        </Box>
                    )}
                </Box>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setCandidateModalOpen(false)}>Zamknij</Button>
            <Button variant="contained" onClick={() => handleSelectCandidate(viewingCandidate)}>
                Wybierz tę ofertę
            </Button>
        </DialogActions>
      </Dialog>

      {/* AI Image Generation Dialog */}
      <Dialog open={aiImageDialogOpen} onClose={() => !aiImageLoading && setAiImageDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Generuj zdjęcie produktu z AI (Gemini 3 Pro)</DialogTitle>
        <DialogContent>
            <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Opisz dokładnie zdjęcie, które chcesz wygenerować. Np. "Elegancki czarny kubek ceramiczny na drewnianym stole, profesjonalne oświetlenie studyjne".
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={3}
                    autoFocus
                    label="Opis zdjęcia (Prompt)"
                    value={aiImagePrompt}
                    onChange={(e) => setAiImagePrompt(e.target.value)}
                    disabled={aiImageLoading}
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setAiImageDialogOpen(false)} disabled={aiImageLoading}>
                Anuluj
            </Button>
            <Button 
                onClick={handleGenerateAiImage} 
                variant="contained" 
                startIcon={aiImageLoading ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                disabled={!aiImagePrompt.trim() || aiImageLoading}
            >
                {aiImageLoading ? 'Generowanie...' : 'Generuj'}
            </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pomocy dla analizy na podstawie zdjęć */}
      <Dialog open={imageBasedHelpDialogOpen} onClose={() => setImageBasedHelpDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCameraIcon color="primary" />
          <Typography variant="h6">Analiza produktu na podstawie zdjęć - Wskazówki</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                ✅ Produkty, które AI analizuje bardzo dobrze:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li><strong>Meble</strong> - krzesła, stoły, sofy, szafy, regały</li>
                  <li><strong>Produkty spożywcze</strong> - opakowania, butelki, puszki, słoiki</li>
                  <li><strong>Elektronika użytkowa</strong> - telefony, tablety, laptopy, słuchawki</li>
                  <li><strong>Odzież i akcesoria</strong> - ubrania, buty, torby, biżuteria</li>
                  <li><strong>Artykuły gospodarstwa domowego</strong> - naczynia, sztućce, dekoracje</li>
                  <li><strong>Książki i media</strong> - okładki, płyty, gry</li>
                  <li><strong>Zabawki i gry</strong> - figurki, puzzle, gry planszowe</li>
                </ul>
              </Typography>
            </Alert>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                ⚠️ Produkty, które mogą sprawiać trudności:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li><strong>Części samochodowe</strong> - AI może mieć problem z identyfikacją konkretnych części, modeli i specyfikacji technicznych</li>
                  <li><strong>Elementy techniczne bez kontekstu</strong> - małe części, śruby, łożyska bez opakowania</li>
                  <li><strong>Produkty wymagające szczegółowej specyfikacji</strong> - komponenty elektroniczne, części zamienne</li>
                  <li><strong>Produkty z bardzo podobnym wyglądem</strong> - różniące się tylko parametrami technicznymi</li>
                </ul>
              </Typography>
            </Alert>

            <Alert severity="info">
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                💡 Wskazówki:
              </Typography>
              <Typography variant="body2" component="div">
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>Dodaj <strong>wiele zdjęć</strong> z różnych kątów - to poprawia jakość analizy</li>
                  <li>Upewnij się, że zdjęcia są <strong>czytelne i dobrze oświetlone</strong></li>
                  <li>Dla części samochodowych i technicznych lepiej użyć <strong>trybu domyślnego</strong> z kodem EAN lub wyszukiwaniem</li>
                  <li>Jeśli masz kod EAN produktu, użyj go w trybie domyślnym dla lepszej dokładności</li>
                </ul>
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageBasedHelpDialogOpen(false)} variant="contained">
            Rozumiem
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading Dialog with Status */}
      <Dialog open={loading && !processing} disableEscapeKeyDown>
        <DialogTitle>Przetwarzanie</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '300px', p: 4 }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography variant="body1" align="center">{saveStatus || 'Proszę czekać...'}</Typography>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia nadpisania pól */}
      <Dialog open={overwriteDialogOpen} onClose={() => setOverwriteDialogOpen(false)}>
        <DialogTitle>Znaleziono dane dla tego EAN</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Formularz zawiera już wypełnione pola. Jak chcesz postąpić z danymi z bazy EAN?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {pendingEanData?.name && (
              <Box component="span" display="block" sx={{ mb: 1 }}>
                Znaleziony produkt: <strong>{pendingEanData.name}</strong>
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverwriteDialogOpen(false)}>
            Anuluj
          </Button>
          <Button 
            onClick={() => {
              if (pendingEanData) {
                fillEmptyFields(pendingEanData);
              }
              setOverwriteDialogOpen(false);
              setPendingEanData(null);
            }}
            variant="outlined"
          >
            Uzupełnij tylko puste pola
          </Button>
          <Button 
            onClick={() => {
              if (pendingEanData) {
                overwriteAllFields(pendingEanData);
              }
              setOverwriteDialogOpen(false);
              setPendingEanData(null);
            }}
            variant="contained"
          >
            Nadpisz wszystkie pola
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tutorial Dialog - 3 pages */}
      <Dialog 
        open={tutorialOpen} 
        onClose={() => {}} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 2,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Samouczek kreatora produktu
            </Typography>
          </Box>
          <IconButton 
            onClick={() => {
              localStorage.setItem('productWizardTutorialSeen', 'true');
              setTutorialOpen(false);
            }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ p: 4, minHeight: '450px' }}>
          {/* Page 1: Wprowadzenie */}
          {tutorialPage === 0 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              textAlign: 'center',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <Box sx={{ 
                mb: 4,
                p: 3,
                borderRadius: 3,
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                width: '100%'
              }}>
                <AutoAwesomeIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                  Witaj w kreatorze produktu! 🎉
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, mt: 2 }}>
                  Stwórz profesjonalne oferty w kilka minut
                </Typography>
              </Box>
              
              <Box sx={{ mt: 4, width: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                  Co możesz zrobić?
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: 'action.selected' }}>
                      <QrCodeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        Kod EAN
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Wpisz kod kreskowy - automatycznie znajdziemy dane produktu
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: 'action.selected' }}>
                      <ImageIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        Zdjęcia produktu
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Przeciągnij zdjęcia - AI przeanalizuje i stworzy opis
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, textAlign: 'center', height: '100%', bgcolor: 'action.selected' }}>
                      <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        AI wszystko zrobi
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Opis, zdjęcia, parametry - wszystko automatycznie
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          )}

          {/* Page 2: Kiedy używać zdjęć vs domyślnych */}
          {tutorialPage === 1 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                📸 Kiedy używać zdjęć?
              </Typography>
              
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  ✅ Użyj zdjęć gdy:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  <li><strong>Masz fizyczny produkt</strong> - zrób zdjęcia z różnych kątów</li>
                  <li><strong>Produkt jest unikalny</strong> - meble, dekoracje, ręcznie robione</li>
                  <li><strong>Chcesz pokazać szczegóły</strong> - jakość, kolory, faktury</li>
                  <li><strong>Produkt ma charakterystyczny wygląd</strong> - odzież, buty, akcesoria</li>
                  <li><strong>Nie masz kodu EAN</strong> - zdjęcia pomogą AI zidentyfikować produkt</li>
                </Box>
              </Alert>

              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  💡 Tryb domyślny (bez zdjęć) gdy:
                </Typography>
                <Box component="ul" sx={{ m: 0, pl: 3 }}>
                  <li><strong>Masz kod EAN</strong> - system znajdzie wszystko automatycznie</li>
                  <li><strong>Produkt jest standardowy</strong> - książki, płyty, standardowa elektronika</li>
                  <li><strong>Chcesz szybko</strong> - wystarczy kod, reszta się wypełni</li>
                  <li><strong>Produkt wymaga dokładnych specyfikacji</strong> - części samochodowe, komponenty</li>
                  <li><strong>Masz już gotowe dane</strong> - po prostu je wprowadź</li>
                </Box>
              </Alert>

              <Box sx={{ 
                mt: 3, 
                p: 3, 
                bgcolor: 'action.selected', 
                borderRadius: 2,
                border: '2px dashed',
                borderColor: 'primary.main'
              }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  🎯 Pro Tip:
                </Typography>
                <Typography variant="body2">
                  Możesz łączyć oba podejścia! Wpisz kod EAN dla podstawowych danych, 
                  a potem dodaj zdjęcia, żeby AI stworzyło jeszcze lepszy opis i przetworzyło zdjęcia.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Page 3: Najlepsze praktyki */}
          {tutorialPage === 2 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                🚀 Najlepsze praktyki
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%', bgcolor: 'action.selected' }}>
                    <CardContent>
                      <TipsAndUpdatesIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Zdjęcia produktu
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        <li>Minimum 3-5 zdjęć z różnych kątów</li>
                        <li>Dobre oświetlenie - naturalne światło najlepsze</li>
                        <li>Usuń tło lub użyj neutralnego</li>
                        <li>Pokaż szczegóły i etykiety</li>
                        <li>Możesz wkleić zdjęcia (Ctrl+V)</li>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%', bgcolor: 'action.selected' }}>
                    <CardContent>
                      <SearchIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Kod EAN
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        <li>Sprawdź kod na produkcie lub opakowaniu</li>
                        <li>Możesz też wpisać nazwę produktu</li>
                        <li>System automatycznie znajdzie dane</li>
                        <li>Zawsze sprawdź czy dane są poprawne</li>
                        <li>Możesz edytować wszystko później</li>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                    <CardContent>
                      <AutoAwesomeIcon sx={{ fontSize: 40, mb: 2 }} />
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Funkcje AI
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2 }}>
                        <li><strong>Przetwarzanie zdjęć</strong> - poprawa jakości, usuwanie tła, zmiana tła</li>
                        <li><strong>Generowanie opisu</strong> - profesjonalny opis na podstawie zdjęć lub danych</li>
                        <li><strong>Szablony AI</strong> - wybierz styl opisu (krótki, szczegółowy, marketingowy)</li>
                        <li><strong>Dodatkowe instrukcje</strong> - powiedz AI, co ma podkreślić lub pominąć</li>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Pamiętaj:</strong> Koszt utworzenia produktu to {BASE_OFFER_PRICE.toFixed(2)} PLN. 
                  Upewnij się, że masz wystarczające saldo w portfelu przed rozpoczęciem.
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 3, 
          borderTop: '1px solid',
          borderColor: 'divider',
          justifyContent: 'space-between'
        }}>
          <Box>
            {tutorialPage > 0 && (
              <Button
                onClick={() => setTutorialPage(tutorialPage - 1)}
                startIcon={<ArrowBackIcon />}
                variant="outlined"
              >
                Wstecz
              </Button>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {[0, 1, 2].map((page) => (
              <Box
                key={page}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: tutorialPage === page ? 'primary.main' : 'action.disabled',
                  transition: 'all 0.3s'
                }}
              />
            ))}
          </Box>
          
          <Box>
            {tutorialPage < 2 ? (
              <Button
                onClick={() => setTutorialPage(tutorialPage + 1)}
                endIcon={<ArrowForwardIcon />}
                variant="contained"
              >
                Dalej
              </Button>
            ) : (
              <Button
                onClick={() => {
                  localStorage.setItem('productWizardTutorialSeen', 'true');
                  setTutorialOpen(false);
                }}
                variant="contained"
                endIcon={<AutoAwesomeIcon />}
                sx={{ minWidth: 150 }}
              >
                Zacznijmy!
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>

      {/* Scanner Dialog */}
      <Dialog 
        open={scannerOpen} 
        onClose={handleCloseScanner}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Skaner kodów kreskowych</Typography>
          <IconButton onClick={handleCloseScanner} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Box 
              id="scanner-container" 
              sx={{ 
                width: '100%', 
                maxWidth: 400,
                minHeight: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'grey.100',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            />
            {!scannerScanning && (
              <Button
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={startScanner}
                size="large"
                fullWidth
                sx={{ mt: 2 }}
              >
                Uruchom skaner
              </Button>
            )}
            {scannerScanning && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Skieruj kamerę na kod kreskowy...
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScanner}>Zamknij</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}

export default ProductWizard;

