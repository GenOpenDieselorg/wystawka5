import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  Chip,
  Tabs,
  Tab,
  Paper,
  Pagination,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ImageIcon from '@mui/icons-material/Image';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.wystawoferte.pl/api';

function Gallery() {
  const { user } = useAuth();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`${API_URL}/products/gallery`);
      setImages(response.data.images || []);
    } catch (err) {
      console.error('Error fetching gallery images:', err);
      setError('Nie udało się załadować zdjęć. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleCloseDialog = () => {
    setSelectedImage(null);
  };

  const filteredImages = currentTab === 0 
    ? images 
    : currentTab === 1 
    ? images.filter(img => img.type === 'original')
    : images.filter(img => img.type === 'processed');

  const totalPages = Math.ceil(filteredImages.length / perPage);
  const paginatedImages = filteredImages.slice((page - 1) * perPage, page * perPage);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePerPageChange = (event) => {
    setPerPage(event.target.value);
    setPage(1);
  };

  const getImageUrl = (url) => {
    if (url.startsWith('http')) {
      return url;
    }
    return `${API_URL.replace(/\/api\/?$/, '')}${url}`;
  };

  return (
    <Layout title="Galeria">
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={currentTab} 
          onChange={(e, newValue) => { setCurrentTab(newValue); setPage(1); }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Wszystkie (${images.length})`} />
          <Tab label={`Oryginalne (${images.filter(img => img.type === 'original').length})`} />
          <Tab label={`Przetworzone (${images.filter(img => img.type === 'processed').length})`} />
        </Tabs>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      ) : filteredImages.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ImageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Brak zdjęć w galerii
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Dodaj zdjęcia do produktów, aby zobaczyć je tutaj
          </Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Znaleziono {filteredImages.length} zdjęć
              {filteredImages.length > perPage && ` (strona ${page} z ${totalPages})`}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Na stronie:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={perPage}
                  onChange={handlePerPageChange}
                  variant="outlined"
                  sx={{ height: 32, fontSize: '0.875rem' }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          <Grid container spacing={2}>
            {paginatedImages.map((image) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={image.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleImageClick(image)}
                >
                  <CardMedia
                    component="img"
                    image={getImageUrl(image.url)}
                    alt={image.productName || 'Zdjęcie produktu'}
                    sx={{
                      height: 200,
                      objectFit: 'cover',
                      bgcolor: 'grey.200'
                    }}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2RkZCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CcmFrIG9icmF6dTwvdGV4dD48L3N2Zz4=';
                    }}
                  />
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      {image.type === 'processed' && (
                        <Chip
                          icon={<AutoAwesomeIcon />}
                          label="AI"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                      {image.isPrimary && (
                        <Chip
                          label="Główne"
                          size="small"
                          color="secondary"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    {image.productName && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={image.productName}
                      >
                        {image.productName}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, mb: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!selectedImage}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            maxHeight: '90vh'
          }
        }}
      >
        {selectedImage && (
          <>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <IconButton
                onClick={handleCloseDialog}
                sx={{ color: 'white', bgcolor: 'rgba(0, 0, 0, 0.5)' }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
            <DialogContent sx={{ p: 0, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <Box
                component="img"
                src={getImageUrl(selectedImage.url)}
                alt={selectedImage.productName || 'Zdjęcie produktu'}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  width: 'auto',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                  margin: '0 auto'
                }}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5CcmFrIG9icmF6dTwvdGV4dD48L3N2Zz4=';
                }}
              />
              <Box
                sx={{
                  width: '100%',
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  p: 2,
                  color: 'white'
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  {selectedImage.type === 'processed' && (
                    <Chip
                      icon={<AutoAwesomeIcon />}
                      label="Przetworzone przez AI"
                      size="small"
                      color="primary"
                    />
                  )}
                  {selectedImage.isPrimary && (
                    <Chip
                      label="Zdjęcie główne"
                      size="small"
                      color="secondary"
                    />
                  )}
                </Box>
                {selectedImage.productName && (
                  <Typography variant="h6">{selectedImage.productName}</Typography>
                )}
                <Typography variant="body2" color="rgba(255, 255, 255, 0.7)">
                  Dodano: {new Date(selectedImage.createdAt).toLocaleString('pl-PL')}
                </Typography>
              </Box>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Layout>
  );
}

export default Gallery;

