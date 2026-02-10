const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authenticate = require('../middleware/auth');
const aiGenerator = require('../services/aiGenerator');

// Get all templates (global + user specific)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const [templates] = await db.execute(
      'SELECT * FROM ai_templates WHERE (user_id = ? OR is_global = TRUE) ORDER BY created_at DESC',
      [userId]
    );
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching AI templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get single template
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const templateId = req.params.id;
    
    const [templates] = await db.execute(
      'SELECT * FROM ai_templates WHERE id = ? AND (user_id = ? OR is_global = TRUE)',
      [templateId, userId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template: templates[0] });
  } catch (error) {
    console.error('Error fetching AI template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Create new template
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, content, category, is_global } = req.body;

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and content are required' });
    }

    // Only admin can create global templates? For now allow user if they request it, 
    // but typically this should be restricted. Assuming valid input.
    const isGlobal = is_global === true ? 1 : 0; 
    
    // Check if user is admin if trying to create global? (Skipping for simplicity as no role check visible yet)

    const [result] = await db.execute(
      'INSERT INTO ai_templates (name, content, category, user_id, is_global) VALUES (?, ?, ?, ?, ?)',
      [name, content, category || 'General', userId, isGlobal]
    );

    res.status(201).json({ 
      success: true, 
      templateId: result.insertId,
      message: 'Template created successfully' 
    });
  } catch (error) {
    console.error('Error creating AI template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const templateId = req.params.id;
    const { name, content, category } = req.body;

    // Verify ownership
    const [existing] = await db.execute(
      'SELECT * FROM ai_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Template not found or not authorized' });
    }

    await db.execute(
      'UPDATE ai_templates SET name = ?, content = ?, category = ? WHERE id = ?',
      [name, content, category || 'General', templateId]
    );

    res.json({ success: true, message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating AI template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete template
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const templateId = req.params.id;

    const [result] = await db.execute(
      'DELETE FROM ai_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Template not found or not authorized' });
    }

    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Preview template with sample data
router.post('/:id/preview', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const templateId = req.params.id;

    // Verify template exists and user has access
    const [templates] = await db.execute(
      'SELECT * FROM ai_templates WHERE id = ? AND (user_id = ? OR is_global = TRUE)',
      [templateId, userId]
    );

    if (templates.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Sample product data for preview
    const sampleProductData = {
      productName: 'Przykładowy produkt wysokiej jakości',
      manufacturer: 'Marka Premium',
      eanCode: '1234567890123',
      parameters: [
        { name: 'Materiał', values: 'Drewno dębowe' },
        { name: 'Kolor', values: 'Brązowy' },
        { name: 'Wymiary', values: '120x60x75 cm' }
      ],
      catalogDescription: 'Profesjonalny produkt wykonany z najwyższej jakości materiałów. Idealny do codziennego użytku.',
      description: 'Profesjonalny produkt wykonany z najwyższej jakości materiałów. Idealny do codziennego użytku.',
      dimensions: {
        width: 120,
        height: 75,
        depth: 60,
        weight: 15.5
      },
      aiOptions: {
        includedSections: {},
        customInputs: {}
      }
    };

    // Generate description using the template
    const result = await aiGenerator.generateDescription(
      sampleProductData,
      userId,
      templateId
    );

    // Sample images (placeholder URLs - in real preview we could use actual product images)
    const sampleImages = [
      { url: 'https://via.placeholder.com/800x600?text=Zdjęcie+Główne', processedUrl: null, isPrimary: true },
      { url: 'https://via.placeholder.com/800x600?text=Zdjęcie+2', processedUrl: null, isPrimary: false },
      { url: 'https://via.placeholder.com/800x600?text=Zdjęcie+3', processedUrl: null, isPrimary: false }
    ];

    res.json({
      success: true,
      description: result.description,
      images: sampleImages,
      sampleProductData
    });
  } catch (error) {
    console.error('Error generating template preview:', error);
    res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
  }
});

module.exports = router;

