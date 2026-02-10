import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  Autocomplete,
  Switch
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Layout from '../components/Layout';
import axios from 'axios';
import sanitizeHtml from '../utils/sanitizeHtml';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function AiTemplates() {
  const [activeTab, setActiveTab] = useState(0);
  
  // Templates State
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  // Template Form Data (now with sections)
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    sections: [] // Array of { type: 'text' | 'image', content: '' }
  });

  // AI Preferences State (Moved from Settings.js)
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMessage, setPrefMessage] = useState({ type: '', text: '' });
  
  const [aiProvider, setAiProvider] = useState('chatgpt');
  const [descriptionCategory, setDescriptionCategory] = useState('');
  
  // Image Processing Preferences
  const [defaultImageEditMode, setDefaultImageEditMode] = useState('enhance');
  const [defaultBgImageUrl, setDefaultBgImageUrl] = useState(null);
  
  // Photo angle processing modes
  const DEFAULT_PHOTO_ANGLES = [
    { id: 'front', label: 'Zdjęcie z przodu', mode: 'enhance', isDefault: true },
    { id: 'left', label: 'Zdjęcie z lewej', mode: 'enhance', isDefault: true },
    { id: 'right', label: 'Zdjęcie z prawej', mode: 'enhance', isDefault: true },
    { id: 'back', label: 'Zdjęcie z tyłu', mode: 'enhance', isDefault: true },
    { id: 'top', label: 'Zdjęcie z góry', mode: 'enhance', isDefault: true },
    { id: 'bottom', label: 'Zdjęcie z dołu', mode: 'enhance', isDefault: true },
  ];

  const IMAGE_EDIT_OPTIONS = [
    { value: 'none', label: '🚫 Nic nie rób (oryginalne)' },
    { value: 'enhance', label: '🤖 Poprawa jakości (Ikea style)' },
    { value: 'remove_bg', label: '🤖 Usuń tło (Przezroczyste)' },
    { value: 'replace_bg', label: '🤖 Zmień tło' },
    { value: 'blur_background', label: '🤖 Rozmyj tło' },
    { value: 'ai_square', label: '🤖 Format kwadratowy' },
    { value: 'crop_center', label: '🤖 Przycięcie do centrum' },
    { value: 'resize_square', label: '🤖 Zmiana rozmiaru do kwadratu' },
    { value: 'adjust_brightness', label: '🤖 Regulacja jasności' },
    { value: 'adjust_contrast', label: '🤖 Regulacja kontrastu' },
    { value: 'sharpen', label: '🤖 Wyostrzenie' },
    { value: 'saturate', label: '🤖 Zwiększenie nasycenia' },
    { value: 'grayscale', label: '🤖 Czarno-białe' },
    { value: 'vintage', label: '🤖 Efekt vintage' },
  ];

  const [photoAngleModes, setPhotoAngleModes] = useState(DEFAULT_PHOTO_ANGLES);
  const [newAngleLabel, setNewAngleLabel] = useState('');

  // Product lookup preferences
  const [useAllegroEanLookup, setUseAllegroEanLookup] = useState(false);
  const [allegroEanLookupDialogOpen, setAllegroEanLookupDialogOpen] = useState(false);
  const [pendingAllegroEanLookup, setPendingAllegroEanLookup] = useState(false);

  // Preview state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState('');

  const PREDEFINED_CATEGORIES = [
    'Elektronika',
    'Moda',
    'Dom i Ogród',
    'Dziecko',
    'Motoryzacja',
    'Sport i Turystyka',
    'Zdrowie i Uroda'
  ];

  const PLACEHOLDERS = [
    { label: 'Nazwa produktu', value: '{productName}' },
    { label: 'Producent', value: '{manufacturer}' },
    { label: 'Kod EAN', value: '{eanCode}' },
    { label: 'Parametry (lista)', value: '{parameters}' },
    { label: 'Opis', value: '{description}' }
  ];

  useEffect(() => {
    fetchTemplates();
    fetchPreferences();
  }, []);

  // --- Templates Logic ---

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/ai-templates`);
      setTemplates(response.data.templates);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template = null, isPreview = false) => {
    setIsViewOnly(isPreview);
    if (template) {
      setCurrentTemplate(template);
      
      // Try to parse content as JSON sections
      let sections = [];
      try {
        const parsed = JSON.parse(template.content);
        if (Array.isArray(parsed)) {
          sections = parsed;
        } else {
          // Fallback if JSON but not array (unlikely but safe)
          sections = [{ type: 'text', content: template.content }];
        }
      } catch (e) {
        // Not JSON, treat as legacy text string
        sections = [{ type: 'text', content: template.content }];
      }

      setFormData({
        name: template.name,
        category: template.category,
        sections: sections
      });
    } else {
      setCurrentTemplate(null);
      setIsViewOnly(false);
      // Default structure: 5 sections as requested (example)
      setFormData({
        name: '',
        category: 'General',
        sections: [
          { type: 'text', content: 'Wprowadzenie o produkcie {productName}...' },
          { type: 'image', content: 'main' },
          { type: 'text', content: 'Zalety produktu...' },
          { type: 'text', content: 'Dlaczego warto kupić?' },
          { type: 'text', content: 'Podsumowanie' }
        ]
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentTemplate(null);
    setIsViewOnly(false);
  };

    const handleSectionChange = (index, field, value) => {
    const newSections = [...formData.sections];
    newSections[index][field] = value;
    // If turning off input requirement, clear inputs definition
    if (field === 'requires_input' && value === false) {
       delete newSections[index].input_fields;
    }
    setFormData({ ...formData, sections: newSections });
  };

  const handleAddInputField = (sectionIndex) => {
    const newSections = [...formData.sections];
    if (!newSections[sectionIndex].input_fields) {
      newSections[sectionIndex].input_fields = [];
    }
    newSections[sectionIndex].input_fields.push({ name: '', label: '' });
    setFormData({ ...formData, sections: newSections });
  };

  const handleInputFieldChange = (sectionIndex, inputIndex, field, value) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].input_fields[inputIndex][field] = value;
    setFormData({ ...formData, sections: newSections });
  };

  const handleRemoveInputField = (sectionIndex, inputIndex) => {
    const newSections = [...formData.sections];
    newSections[sectionIndex].input_fields.splice(inputIndex, 1);
    setFormData({ ...formData, sections: newSections });
  };

  const handleAddSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { type: 'text', content: '' }]
    });
  };

  const handleRemoveSection = (index) => {
    const newSections = [...formData.sections];
    newSections.splice(index, 1);
    setFormData({ ...formData, sections: newSections });
  };

  const handleMoveSection = (index, direction) => {
    const newSections = [...formData.sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    setFormData({ ...formData, sections: newSections });
  };

  const handleCopyTemplate = () => {
    setIsViewOnly(false);
    setCurrentTemplate(null);
    setFormData({
      ...formData,
      name: `${formData.name} (Kopia)`
    });
  };

  const handleDuplicate = (template) => {
    let sections = [];
    try {
      const parsed = JSON.parse(template.content);
      if (Array.isArray(parsed)) {
        sections = parsed;
      } else {
        sections = [{ type: 'text', content: template.content }];
      }
    } catch (e) {
      sections = [{ type: 'text', content: template.content }];
    }

    setFormData({
      name: `${template.name} (Kopia)`,
      category: template.category,
      sections: sections
    });
    
    setCurrentTemplate(null);
    setIsViewOnly(false);
    setOpenDialog(true);
  };

  const handleInsertPlaceholder = (index, placeholder) => {
    const newSections = [...formData.sections];
    // Append placeholder with a space if needed
    const currentContent = newSections[index].content || '';
    const separator = currentContent.length > 0 && !currentContent.endsWith(' ') ? ' ' : '';
    newSections[index].content = currentContent + separator + placeholder;
    setFormData({ ...formData, sections: newSections });
  };

  const handleSave = async () => {
    try {
      // Serialize sections to JSON string
      const content = JSON.stringify(formData.sections);
      
      const payload = {
        name: formData.name,
        category: formData.category,
        content: content
      };

      if (currentTemplate) {
        await axios.put(`${API_URL}/ai-templates/${currentTemplate.id}`, payload);
      } else {
        await axios.post(`${API_URL}/ai-templates`, payload);
      }
      handleCloseDialog();
      fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await axios.delete(`${API_URL}/ai-templates/${id}`);
      fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template');
    }
  };

  // --- Preferences Logic ---

  const fetchPreferences = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/preferences`);
      const prefs = response.data.preferences;
      if (prefs?.ai_provider) {
        setAiProvider(prefs.ai_provider);
      }
      setDescriptionCategory(prefs?.description_category || '');
      
      // Image preferences
      setDefaultImageEditMode(prefs?.default_image_edit_mode || 'enhance');
      setDefaultBgImageUrl(prefs?.default_bg_image_url || null);

      // Handle both boolean and numeric (0/1) values from database
      setUseAllegroEanLookup(prefs?.use_allegro_ean_lookup === true || prefs?.use_allegro_ean_lookup === 1);

      // Photo angle modes
      if (prefs?.photo_angle_modes) {
        try {
          const angles = typeof prefs.photo_angle_modes === 'string' 
            ? JSON.parse(prefs.photo_angle_modes) 
            : prefs.photo_angle_modes;
          if (Array.isArray(angles) && angles.length > 0) {
            setPhotoAngleModes(angles);
          }
        } catch (e) {
          console.error('Error parsing photo_angle_modes:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const handleSavePreferences = async () => {
    setPrefLoading(true);
    setPrefMessage({ type: '', text: '' });
    try {
      await axios.put(
        `${API_URL}/user/preferences`,
        { 
          ai_provider: aiProvider,
          description_category: descriptionCategory,
          use_allegro_ean_lookup: useAllegroEanLookup,
          default_image_edit_mode: defaultImageEditMode,
          default_bg_image_url: defaultBgImageUrl,
          photo_angle_modes: JSON.stringify(photoAngleModes)
        }
      );
      setPrefMessage({ type: 'success', text: 'Preferencje zostały zapisane' });
    } catch (error) {
      setPrefMessage({ type: 'error', text: error.response?.data?.error || 'Błąd podczas zapisywania preferencji' });
    } finally {
      setPrefLoading(false);
    }
  };

  const handleBackgroundUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setPrefLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/user/preferences/background`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setDefaultBgImageUrl(response.data.imageUrl);
      setPrefMessage({ type: 'success', text: 'Tło zostało wgrane' });
    } catch (error) {
      setPrefMessage({ type: 'error', text: 'Błąd podczas wgrywania tła' });
    } finally {
      setPrefLoading(false);
    }
  };
  
  // Photo angle mode handlers
  const handleAngleModeChange = (angleId, newMode) => {
    setPhotoAngleModes(prev => prev.map(a => 
      a.id === angleId ? { ...a, mode: newMode } : a
    ));
  };

  const handleAngleLabelChange = (angleId, newLabel) => {
    setPhotoAngleModes(prev => prev.map(a => 
      a.id === angleId ? { ...a, label: newLabel } : a
    ));
  };

  const handleAddCustomAngle = () => {
    if (!newAngleLabel.trim()) return;
    const newId = `custom_${Date.now()}`;
    setPhotoAngleModes(prev => [...prev, {
      id: newId,
      label: newAngleLabel.trim(),
      mode: 'enhance',
      isDefault: false
    }]);
    setNewAngleLabel('');
  };

  const handleRemoveAngle = (angleId) => {
    setPhotoAngleModes(prev => prev.filter(a => a.id !== angleId));
  };

  const handleAllegroEanLookupChange = (event) => {
    const newValue = event.target.checked;
    if (newValue && !useAllegroEanLookup) {
      setPendingAllegroEanLookup(true);
      setAllegroEanLookupDialogOpen(true);
    } else {
      setUseAllegroEanLookup(false);
    }
  };

  const handleConfirmAllegroEanLookup = () => {
    setUseAllegroEanLookup(true);
    setAllegroEanLookupDialogOpen(false);
    setPendingAllegroEanLookup(false);
  };

  const handleCancelAllegroEanLookup = () => {
    setAllegroEanLookupDialogOpen(false);
    setPendingAllegroEanLookup(false);
  };

  // Preview functions
  const handlePreviewTemplate = async () => {
    if (!currentTemplate) return;
    
    setPreviewLoading(true);
    setPreviewError('');
    setPreviewData(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/ai-templates/${currentTemplate.id}/preview`,
        {}
      );
      
      setPreviewData(response.data);
      setPreviewDialogOpen(true);
    } catch (err) {
      console.error('Error generating preview:', err);
      setPreviewError(err.response?.data?.error || 'Nie udało się wygenerować podglądu');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
    setPreviewData(null);
    setPreviewError('');
  };

  return (
    <Layout title="Szablony AI">
      <Container maxWidth="lg">
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label="Twoje Szablony" />
            <Tab label="Ustawienia AI" />
          </Tabs>
        </Paper>

        {activeTab === 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">Zarządzaj szablonami</Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                Dodaj szablon
              </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
              <CircularProgress />
            ) : (
              <Paper elevation={2}>
                <List>
                  {templates.map((template, index) => (
                    <ListItem key={template.id} divider={index < templates.length - 1}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {template.name}
                            </Typography>
                            <Chip label={template.category} size="small" variant="outlined" />
                            {template.is_global && <Chip label="Global" size="small" color="secondary" />}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {/* Display preview of content - tricky if JSON */}
                            {template.content.startsWith('[') ? '(Szablon wielosekcyjny)' : template.content.substring(0, 100) + '...'}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
                        {template.is_global ? (
                          <>
                            <IconButton edge="end" aria-label="duplicate" onClick={() => handleDuplicate(template)} title="Duplikuj szablon" sx={{ mr: 1 }}>
                              <ContentCopyIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="preview" onClick={() => handleOpenDialog(template, true)} title="Podgląd / Utwórz kopię">
                              <VisibilityIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton edge="end" aria-label="edit" onClick={() => handleOpenDialog(template)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(template.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                  {templates.length === 0 && (
                    <ListItem>
                      <ListItemText primary="Brak szablonów. Utwórz pierwszy szablon!" />
                    </ListItem>
                  )}
                </List>
              </Paper>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Card>
            <CardContent>
              {prefMessage.text && (
                <Alert severity={prefMessage.type} sx={{ mb: 3 }} onClose={() => setPrefMessage({ type: '', text: '' })}>
                  {prefMessage.text}
                </Alert>
              )}

              <Typography variant="h6" gutterBottom>
                Preferencje AI
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
                Wybierz dostawcę AI do generowania opisów produktów:
              </Typography>
              <Box sx={{ mt: 2, mb: 3 }}>
                <Button
                  variant={aiProvider === 'chatgpt' ? 'contained' : 'outlined'}
                  onClick={() => setAiProvider('chatgpt')}
                  sx={{ mr: 2 }}
                >
                  ChatGPT
                </Button>
                <Button
                  variant={aiProvider === 'gemini' ? 'contained' : 'outlined'}
                  onClick={() => setAiProvider('gemini')}
                >
                  Gemini
                </Button>
              </Box>
              
              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Domyślna edycja zdjęć
              </Typography>
              
              <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mt: 1, mb: 2 }}>
                Wybierz domyślny sposób przetwarzania zdjęć produktów:
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Domyślna edycja zdjęć</InputLabel>
                <Select
                  value={defaultImageEditMode}
                  label="Domyślna edycja zdjęć"
                  onChange={(e) => setDefaultImageEditMode(e.target.value)}
                >
                  <MenuItem value="none">🚫 Nic nie rób (oryginalne zdjęcia)</MenuItem>
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

              {defaultImageEditMode === 'replace_bg' && (
                 <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                   <Typography variant="body2" gutterBottom>
                     Domyślne tło:
                   </Typography>
                   {defaultBgImageUrl && (
                     <Box sx={{ mb: 2 }}>
                       <img 
                         src={`${API_URL.replace(/\/api\/?$/, '')}${defaultBgImageUrl}`} 
                         alt="Domyślne tło" 
                         style={{ maxHeight: 150, maxWidth: '100%', borderRadius: 4 }} 
                       />
                     </Box>
                   )}
                   <input
                     accept="image/*"
                     style={{ display: 'none' }}
                     id="bg-upload-settings"
                     type="file"
                     onChange={handleBackgroundUpload}
                   />
                   <label htmlFor="bg-upload-settings">
                     <Button variant="outlined" component="span" startIcon={<PhotoCameraIcon />}>
                       {defaultBgImageUrl ? 'Zmień tło' : 'Wgraj tło'}
                     </Button>
                   </label>
                 </Box>
              )}

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                📸 Przetwarzanie zdjęć wg kąta / perspektywy
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Ustaw domyślny tryb przetwarzania AI dla każdego zdjęcia w zależności od jego kąta/perspektywy.
                Każde zdjęcie może być przetwarzane w innym formacie.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {photoAngleModes.map((angle) => (
                  <Paper 
                    key={angle.id} 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      bgcolor: angle.isDefault ? '#f8f9fa' : '#fff8e1',
                      borderColor: angle.isDefault ? '#e0e0e0' : '#ffe082'
                    }}
                  >
                    <Box sx={{ 
                      minWidth: 40, 
                      height: 40, 
                      borderRadius: '50%', 
                      bgcolor: angle.isDefault ? 'primary.main' : 'warning.main', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 18
                    }}>
                      {angle.id === 'front' && '👤'}
                      {angle.id === 'left' && '👈'}
                      {angle.id === 'right' && '👉'}
                      {angle.id === 'back' && '🔙'}
                      {angle.id === 'top' && '⬆️'}
                      {angle.id === 'bottom' && '⬇️'}
                      {!angle.isDefault && '✨'}
                    </Box>

                    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {angle.isDefault ? (
                        <Typography variant="subtitle2" fontWeight="bold">
                          {angle.label}
                        </Typography>
                      ) : (
                        <TextField
                          size="small"
                          value={angle.label}
                          onChange={(e) => handleAngleLabelChange(angle.id, e.target.value)}
                          variant="outlined"
                          label="Nazwa perspektywy"
                          sx={{ maxWidth: 300 }}
                        />
                      )}

                      <FormControl size="small" sx={{ maxWidth: 350 }}>
                        <InputLabel>Tryb przetwarzania</InputLabel>
                        <Select
                          value={angle.mode}
                          label="Tryb przetwarzania"
                          onChange={(e) => handleAngleModeChange(angle.id, e.target.value)}
                        >
                          {IMAGE_EDIT_OPTIONS.map(opt => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {!angle.isDefault && (
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemoveAngle(angle.id)}
                        title="Usuń tę perspektywę"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Paper>
                ))}
              </Box>

              <Paper 
                variant="outlined" 
                sx={{ 
                  mt: 2, 
                  p: 2, 
                  border: '2px dashed #bdbdbd', 
                  bgcolor: '#fafafa',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <AddIcon color="action" />
                <TextField
                  size="small"
                  value={newAngleLabel}
                  onChange={(e) => setNewAngleLabel(e.target.value)}
                  placeholder="np. Zdjęcie detalu, Zdjęcie opakowania..."
                  label="Nazwa własnej perspektywy"
                  sx={{ flexGrow: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomAngle();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomAngle}
                  disabled={!newAngleLabel.trim()}
                  size="small"
                >
                  Dodaj
                </Button>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <TextField
                fullWidth
                label="Kategoria w której działasz"
                value={descriptionCategory}
                onChange={(e) => setDescriptionCategory(e.target.value)}
                margin="normal"
                placeholder="np. Elektronika, Odzież, Meble, itp."
                helperText="Wpisz kategorię produktów, w której działasz (opcjonalne)"
              />
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Wyszukiwanie produktów
              </Typography>
              
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Ostrzeżenie dotyczące wyszukiwania w Allegro
                </Typography>
                <Typography variant="body2">
                  Włączenie tej opcji może spowodować zbanowanie Twojego API Allegro z powodu nadmiernego wykorzystania. 
                  Wykorzystuj na własną odpowiedzialność. Zalecamy używanie tej funkcji tylko wtedy, gdy jest to absolutnie konieczne.
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 2, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useAllegroEanLookup}
                      onChange={handleAllegroEanLookupChange}
                      color="primary"
                    />
                  }
                  label="Wyszukuj dane produktu w Allegro po EAN"
                />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1, ml: 6 }}>
                  Gdy włączone, system będzie próbował pobrać dane produktu z katalogu Allegro, 
                  jeśli nie znajdzie ich w bazie EAN-DB. Wymaga aktywnej integracji z Allegro.
                </Typography>
              </Box>

              <Dialog
                open={allegroEanLookupDialogOpen}
                onClose={handleCancelAllegroEanLookup}
                aria-labelledby="allegro-ean-lookup-dialog-title"
                aria-describedby="allegro-ean-lookup-dialog-description"
              >
                <DialogTitle id="allegro-ean-lookup-dialog-title">
                  ⚠️ Ostrzeżenie - Wykorzystanie na własną odpowiedzialność
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="allegro-ean-lookup-dialog-description">
                    <Typography variant="body1" paragraph>
                      <strong>Włączenie tej opcji może zbanować Twoje API Allegro.</strong>
                    </Typography>
                    <Typography variant="body2" paragraph>
                      Wyszukiwanie produktów w Allegro po kodzie EAN może spowodować nadmierne wykorzystanie API, 
                      co może prowadzić do zablokowania Twojego konta API przez Allegro.
                    </Typography>
                    <Typography variant="body2" paragraph>
                      <strong>Wykorzystuj tę funkcję na własną odpowiedzialność.</strong>
                    </Typography>
                    <Typography variant="body2">
                      Czy na pewno chcesz włączyć tę opcję?
                    </Typography>
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCancelAllegroEanLookup} color="primary">
                    Anuluj
                  </Button>
                  <Button onClick={handleConfirmAllegroEanLookup} color="warning" variant="contained" autoFocus>
                    Tak, włączam na własną odpowiedzialność
                  </Button>
                </DialogActions>
              </Dialog>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSavePreferences}
                  disabled={prefLoading}
                >
                  Zapisz preferencje
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{isViewOnly ? 'Podgląd szablonu' : (currentTemplate ? 'Edytuj szablon' : 'Nowy szablon')}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus={!isViewOnly}
              margin="dense"
              label="Nazwa szablonu"
              fullWidth
              disabled={isViewOnly}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              freeSolo
              options={PREDEFINED_CATEGORIES}
              value={formData.category}
              onChange={(event, newValue) => {
                setFormData({ ...formData, category: newValue || 'General' });
              }}
              onInputChange={(event, newInputValue) => {
                setFormData({ ...formData, category: newInputValue });
              }}
              disabled={isViewOnly}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Kategoria" 
                  fullWidth 
                  sx={{ mb: 3 }}
                  helperText="Wybierz z listy lub wpisz własną"
                />
              )}
            />

            <Typography variant="h6" gutterBottom>Struktura opisu</Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Zdefiniuj sekcje opisu. Możesz mieszać tekst (prompty dla AI) oraz zdjęcia.
            </Typography>

            {formData.sections.map((section, index) => (
              <Box key={index} sx={{ 
                display: 'flex', 
                gap: 2, 
                mb: 2, 
                p: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                bgcolor: '#fafafa',
                alignItems: 'flex-start'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                   <IconButton size="small" onClick={() => handleMoveSection(index, 'up')} disabled={index === 0 || isViewOnly}>
                     <ArrowUpwardIcon fontSize="small" />
                   </IconButton>
                   <Chip label={index + 1} size="small" />
                   <IconButton size="small" onClick={() => handleMoveSection(index, 'down')} disabled={index === formData.sections.length - 1 || isViewOnly}>
                     <ArrowDownwardIcon fontSize="small" />
                   </IconButton>
                </Box>

                <FormControl sx={{ minWidth: 120 }}>
                  <InputLabel>Typ sekcji</InputLabel>
                  <Select
                    value={section.type}
                    label="Typ sekcji"
                    disabled={isViewOnly}
                    onChange={(e) => handleSectionChange(index, 'type', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="text">Tekst (AI)</MenuItem>
                    <MenuItem value="image">Zdjęcie</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }}>
                  {section.type === 'text' ? (
                    <Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        disabled={isViewOnly}
                        label="Prompt dla AI / Treść sekcji"
                        value={section.content}
                        onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                        size="small"
                        placeholder="np. Napisz zalety tego produktu..."
                        helperText={isViewOnly ? null : "Wpisz instrukcje dla AI. Użyj placeholderów poniżej."}
                      />
                      {!isViewOnly && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {PLACEHOLDERS.map((p) => (
                            <Chip
                              key={p.value}
                              label={p.label}
                              size="small"
                              variant="outlined"
                              onClick={() => handleInsertPlaceholder(index, p.value)}
                              sx={{ cursor: 'pointer' }}
                              title={`Wstaw ${p.value}`}
                            />
                          ))}
                        </Box>
                      )}
                      
                      {!isViewOnly && (
                        <Box sx={{ mt: 2, p: 1, border: '1px dashed #ccc', borderRadius: 1 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={section.is_optional || false}
                                        onChange={(e) => handleSectionChange(index, 'is_optional', e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Sekcja opcjonalna (użytkownik może ją wyłączyć)"
                            />
                             <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={section.requires_input || false}
                                        onChange={(e) => handleSectionChange(index, 'requires_input', e.target.checked)}
                                        size="small"
                                    />
                                }
                                label="Wymaga danych od użytkownika"
                            />

                            {section.requires_input && (
                                <Box sx={{ mt: 1, pl: 2 }}>
                                    <Typography variant="caption" display="block" gutterBottom>
                                        Zdefiniuj pola, o które system zapyta użytkownika:
                                    </Typography>
                                    {section.input_fields && section.input_fields.map((field, fIdx) => (
                                        <Box key={fIdx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
                                            <TextField
                                                label="Zmienna (np. user_waga)"
                                                size="small"
                                                value={field.name}
                                                onChange={(e) => handleInputFieldChange(index, fIdx, 'name', e.target.value)}
                                                sx={{ width: 150 }}
                                            />
                                            <TextField
                                                label="Etykieta pytania"
                                                size="small"
                                                value={field.label}
                                                onChange={(e) => handleInputFieldChange(index, fIdx, 'label', e.target.value)}
                                                fullWidth
                                            />
                                            <IconButton size="small" color="error" onClick={() => handleRemoveInputField(index, fIdx)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddInputField(index)}>
                                        Dodaj pole
                                    </Button>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                        Użyj nazwy zmiennej w nawiasach klamrowych w polu treści (np. &#123;user_waga&#125;).
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                      )}

                    </Box>
                  ) : (
                    <FormControl fullWidth size="small">
                      <InputLabel>Wybierz zdjęcie</InputLabel>
                      <Select
                        value={section.content}
                        label="Wybierz zdjęcie"
                        disabled={isViewOnly}
                        onChange={(e) => handleSectionChange(index, 'content', e.target.value)}
                      >
                        <MenuItem value="main">Zdjęcie główne (1)</MenuItem>
                        <MenuItem value="img2">Zdjęcie 2</MenuItem>
                        <MenuItem value="img3">Zdjęcie 3</MenuItem>
                        <MenuItem value="img4">Zdjęcie 4</MenuItem>
                        <MenuItem value="img5">Zdjęcie 5</MenuItem>
                        <MenuItem value="img6">Zdjęcie 6</MenuItem>
                        <MenuItem value="img7">Zdjęcie 7</MenuItem>
                        <MenuItem value="img8">Zdjęcie 8</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Box>

                <IconButton color="error" onClick={() => handleRemoveSection(index)} disabled={isViewOnly}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            {!isViewOnly && (
              <Button startIcon={<AddIcon />} onClick={handleAddSection} variant="outlined" sx={{ mt: 1 }}>
                Dodaj sekcję
              </Button>
            )}

          </DialogContent>
          <DialogActions>
            {currentTemplate && (
              <Button 
                onClick={handlePreviewTemplate} 
                variant="outlined" 
                startIcon={<VisibilityIcon />}
                disabled={previewLoading}
                sx={{ mr: 'auto' }}
              >
                {previewLoading ? 'Generowanie...' : 'Podgląd w praktyce'}
              </Button>
            )}
            {isViewOnly && (
              <Button onClick={handleCopyTemplate} variant="contained" color="secondary" sx={{ mr: 1 }}>
                Skopiuj i edytuj
              </Button>
            )}
            <Button onClick={handleCloseDialog}>{isViewOnly ? 'Zamknij' : 'Anuluj'}</Button>
            {!isViewOnly && (
              <Button onClick={handleSave} variant="contained" disabled={!formData.name || formData.sections.length === 0}>
                Zapisz
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog 
          open={previewDialogOpen} 
          onClose={handleClosePreview} 
          maxWidth="lg" 
          fullWidth
          PaperProps={{
            sx: { minHeight: '80vh' }
          }}
        >
          <DialogTitle>
            Podgląd szablonu w praktyce
            {previewError && (
              <Alert severity="error" sx={{ mt: 1 }}>{previewError}</Alert>
            )}
          </DialogTitle>
          <DialogContent>
            {previewLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
              </Box>
            ) : previewData ? (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                  Przykładowy produkt: {previewData.sampleProductData?.productName}
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
                  {(() => {
                    const description = previewData.description || '';
                    const images = previewData.images || [];
                    
                    if (!description) {
                      return <Typography color="textSecondary">Brak opisu</Typography>;
                    }
                    
                    // Check if description contains placeholders
                    const hasPlaceholders = /\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/i.test(description);
                    
                    if (hasPlaceholders && images.length > 0) {
                      // Replace placeholders with image tags
                      let imageIndex = 0;
                      let processedDescription = description.replace(
                        /\[ZDJĘCIE(?::.*?)?\]|<zdjecie>|\[IMAGE\]/gi,
                        () => {
                          if (imageIndex < images.length) {
                            const img = images[imageIndex];
                            const imgUrl = typeof img === 'string' ? img : (img.processedUrl || img.url);
                            const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${API_URL.replace(/\/api\/?$/, '')}${imgUrl}`;
                            imageIndex++;
                            return `<img src="${fullUrl}" alt="Product ${imageIndex}" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px; display: block; border: 1px solid #ddd; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`;
                          }
                          return '';
                        }
                      );
                      
                      return (
                        <Box 
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(processedDescription) }}
                          sx={{ 
                            '& h1': { fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '1rem' },
                            '& h2': { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem', marginTop: '1rem' },
                            '& h3': { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', marginTop: '0.75rem' },
                            '& p': { marginBottom: '1rem', lineHeight: 1.6 },
                            '& ul, & ol': { marginBottom: '1rem', paddingLeft: '2rem' },
                            '& li': { marginBottom: '0.5rem', lineHeight: 1.6 },
                            '& b, & strong': { fontWeight: 'bold' },
                            '& img': { 
                              maxWidth: '100%', 
                              height: 'auto', 
                              margin: '20px 0', 
                              borderRadius: '8px', 
                              display: 'block', 
                              border: '1px solid #ddd',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            },
                            '& *': { 
                              maxWidth: '100%',
                              wordWrap: 'break-word'
                            }
                          }}
                        />
                      );
                    }
                    
                    // No placeholders or no images - show as HTML
                    return (
                      <Box 
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                        sx={{ 
                          '& h1': { fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', marginTop: '1rem' },
                          '& h2': { fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.75rem', marginTop: '1rem' },
                          '& h3': { fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', marginTop: '0.75rem' },
                          '& p': { marginBottom: '1rem', lineHeight: 1.6 },
                          '& ul, & ol': { marginBottom: '1rem', paddingLeft: '2rem' },
                          '& li': { marginBottom: '0.5rem', lineHeight: 1.6 },
                          '& b, & strong': { fontWeight: 'bold' },
                          '& *': { 
                            maxWidth: '100%',
                            wordWrap: 'break-word'
                          }
                        }}
                      />
                    );
                  })()}
                </Paper>
              </Box>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreview}>Zamknij</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
}

export default AiTemplates;
