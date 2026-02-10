const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const dns = require('dns').promises;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const { callGeminiWithRetry } = require('../utils/geminiRetry');

/**
 * Validate that a remote image URL is safe to request, to mitigate SSRF.
 * - Only allows http/https.
 * - Blocks localhost, private, link-local, and other non-public IP ranges.
 */
async function validateRemoteImageUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (e) {
    throw new Error('Invalid image URL format');
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('Only HTTP/HTTPS image URLs are allowed');
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('Image URL must include a hostname');
  }

  // Optional allow-list of hostnames or domains; keep empty to allow all public hosts.
  const allowedHosts = []; // e.g. ['images.example.com']
  if (allowedHosts.length > 0) {
    const lowerHost = hostname.toLowerCase();
    const isAllowed = allowedHosts.some(allowed => {
      return lowerHost === allowed || lowerHost.endsWith('.' + allowed);
    });
    if (!isAllowed) {
      throw new Error('Image host is not allowed');
    }
  }

  // Resolve hostname to IPs and block private/internal ranges.
  let addresses = [];
  try {
    const aRecords = await dns.lookup(hostname, { all: true });
    addresses = aRecords.map(r => r.address);
  } catch (e) {
    throw new Error('Unable to resolve image host');
  }

  const isPrivateIp = (ip) => {
    // IPv4 checks
    const v4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (v4Match) {
      const [ , a, b, c, d ] = v4Match.map(Number);
      const addr = (a << 24) | (b << 16) | (c << 8) | d;
      const inRange = (start, end) => addr >= start && addr <= end;

      // 10.0.0.0/8
      if (inRange(0x0A000000, 0x0AFFFFFF)) return true;
      // 172.16.0.0/12
      if (inRange(0xAC100000, 0xAC1FFFFF)) return true;
      // 192.168.0.0/16
      if (inRange(0xC0A80000, 0xC0A8FFFF)) return true;
      // 127.0.0.0/8 (loopback)
      if (inRange(0x7F000000, 0x7FFFFFFF)) return true;
      // 169.254.0.0/16 (link-local)
      if (inRange(0xA9FE0000, 0xA9FEFFFF)) return true;
      // 0.0.0.0/8 (current network)
      if (inRange(0x00000000, 0x00FFFFFF)) return true;
      // 100.64.0.0/10 (carrier-grade NAT)
      if (inRange(0x64400000, 0x647FFFFF)) return true;
      // 192.0.0.0/24, 192.0.2.0/24, 198.18.0.0/15, 198.51.100.0/24, 203.0.113.0/24 (special-use/testing)
      if (inRange(0xC0000000, 0xC00000FF)) return true;
      if (inRange(0xC0000200, 0xC00002FF)) return true;
      if (inRange(0xC6120000, 0xC613FFFF)) return true;
      if (inRange(0xC6336400, 0xC63364FF)) return true;
      if (inRange(0xCB007100, 0xCB0071FF)) return true;
    }

   // Basic IPv6 checks
    const ipv6 = ip.toLowerCase();
    if (ipv6 === '::1') return true; // loopback
    if (ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true; // unique local
    if (ipv6.startsWith('fe80')) return true; // link-local

    return false;
  };

  const hasPrivate = addresses.some(isPrivateIp);
  if (hasPrivate) {
    throw new Error('Image URL points to a private or disallowed network address');
  }
}

/**
 * Downloads an image from a URL to a temporary path
 */
async function downloadImage(url, tempDir) {
  // Validate remote URL to prevent SSRF attacks
  await validateRemoteImageUrl(url);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const uuid = crypto.randomUUID();
  const tempFilename = `downloaded-${uuid}.png`;
  const tempPath = path.join(tempDir, tempFilename);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 60000,
    maxContentLength: 50 * 1024 * 1024,
  });

  const writer = fs.createWriteStream(tempPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  return tempPath;
}

/**
 * Resolves an image path (local or remote) to a local file path
 */
async function resolveImagePath(imageUrl) {
  let localPath;
  let isTemp = false;

  if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
    const filePath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
    localPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(localPath)) {
      throw new Error(`Image file not found: ${localPath}`);
    }
  } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    localPath = await downloadImage(imageUrl, 'uploads/temp');
    isTemp = true;
  } else {
    throw new Error('Invalid image URL');
  }

  return { path: localPath, isTemp };
}

/**
 * Process image using Gemini AI (Imagen 3 / Nano Banana Pro)
 * Handles removal, replacement, and professional enhancement (Ikea style).
 */
async function processImage(options) {
  const { imageUrl, editType = 'enhance', backgroundImageUrl, backgroundImageFile } = options;

  let sourceImage = null;
  let bgImage = null;
  const tempFiles = [];

  try {
    // Resolve source image
    sourceImage = await resolveImagePath(imageUrl);
    if (sourceImage.isTemp) tempFiles.push(sourceImage.path);

    const uploadDir = 'uploads/processed';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const uuid = crypto.randomUUID();
    const outputFilename = `processed-${uuid}.png`;
    const outputPath = path.join(uploadDir, outputFilename);

    let processedImageBuffer;

    // ALL edit types now use AI (Gemini) for processing
    if (GEMINI_API_KEY) {
      
      // Dynamic import for Google GenAI SDK
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const imageBuffer = fs.readFileSync(sourceImage.path);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = 'image/png'; 

      let contents = [];
      let modelName = "gemini-3-pro-image-preview"; // Default to best quality

      // AI prompts for each edit type
      const AI_PROMPTS = {
        remove_bg: "Remove the background from this image. The background must be completely transparent. Ensure perfect edge detection around the subject, handling fine details precisely.",
        enhance: "Transform this image into a high-end, professional e-commerce photograph styled like an Ikea or Castorama catalog. Isolate the main product and place it in a clean, minimalist, beautifully lit studio environment that suits the product type. Ensure soft, professional studio lighting and realistic ground shadows. The result should be photorealistic and highlight the product's quality.",
        blur_background: "Keep the main subject in focus and sharp, but blur the background significantly to create a professional depth-of-field effect. The background should be softly blurred (bokeh effect) while the subject remains crystal clear.",
        ai_square: "Transform this image into a perfect square format (1:1 aspect ratio). If the image is not already square, extend the canvas by intelligently generating matching background content to fill the missing areas. Keep the main product/subject centered and fully visible. The extended areas should seamlessly blend with the existing image - use a clean, professional background that matches the style of the original image. The result must be a perfectly square image.",
        crop_center: "Crop this image to a perfect square by centering on the main subject/product. Remove excess background from the longer side while keeping the product fully visible and centered. The result must be a perfectly square image.",
        resize_square: "Resize this image to a perfect square format. Keep the main product/subject centered and fully visible. If needed, extend or fill the background naturally to make the image square. The result should look professional and natural.",
        adjust_brightness: "Increase the brightness of this image to make it look brighter, more vibrant, and well-lit. The product should be clearly visible with professional lighting. Keep the image natural-looking - do not overexpose.",
        adjust_contrast: "Increase the contrast of this image to make the product stand out more. Darks should be deeper and lights should be brighter, creating a more dynamic and professional look. Keep it natural-looking.",
        sharpen: "Sharpen this image to make the product details crisper and more defined. Enhance fine textures and edges while keeping the image natural-looking without artifacts or over-sharpening.",
        saturate: "Increase the color saturation of this image to make the colors more vivid and vibrant. The product colors should pop and look more appealing for e-commerce. Keep it natural-looking without being unrealistic.",
        grayscale: "Convert this image to a professional black and white (grayscale) photograph. Maintain good contrast and tonal range to keep the product details visible and the image looking professional and artistic.",
        vintage: "Apply a professional vintage/retro effect to this image. Add warm, slightly desaturated tones with a subtle sepia tint. The result should look like a stylish retro photograph while keeping the product clearly visible."
      };

      if (editType === 'replace_bg') {
         // === Replacing Background with specific image (needs 2 images) ===
         if (backgroundImageFile) {
            bgImage = { path: backgroundImageFile.path, isTemp: false };
         } else if (backgroundImageUrl) {
            bgImage = await resolveImagePath(backgroundImageUrl);
            if (bgImage.isTemp) tempFiles.push(bgImage.path);
         } else {
            throw new Error('Background image required for replace_bg');
         }

         const bgBuffer = fs.readFileSync(bgImage.path);
         const base64Bg = bgBuffer.toString('base64');

         contents = [
            { text: "Create a professional e-commerce photo. Take the product from the first image and place it realistically onto the background from the second image. Ensure the lighting on the product is adjusted reasonably to match the environment of the background image, creating realistic shadows and reflections on the surface." },
            { inlineData: { mimeType: "image/png", data: base64Image } },
            { inlineData: { mimeType: "image/png", data: base64Bg } }
         ];
      } else {
         // All other edit types use a single image + prompt
         const prompt = AI_PROMPTS[editType] || AI_PROMPTS['enhance'];
         contents = [
            { text: prompt },
            { inlineData: { mimeType: mimeType, data: base64Image } }
         ];
      }

      let success = false;

      try {
          console.log(`[ImageProcessor] Sending request to Gemini (${modelName}) for type: ${editType}`);
          const response = await callGeminiWithRetry(ai, {
            model: modelName,
            contents: contents,
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
              imageConfig: {
                 imageSize: "1K"
              }
            }
          }, { label: `ImageProcessor ${editType}` });

          if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
               // Filter out thought parts and find the LAST non-thought image part
               // Gemini 3 Pro Image is a thinking model - it returns interim "thought" images
               // that should be skipped. The final output image has no thought:true flag.
               const nonThoughtImageParts = response.candidates[0].content.parts.filter(
                 p => p.inlineData && !p.thought
               );
               const part = nonThoughtImageParts.length > 0 
                 ? nonThoughtImageParts[nonThoughtImageParts.length - 1] 
                 : null;
               if (part && part.inlineData) {
                   const b64Json = part.inlineData.data;
                   processedImageBuffer = Buffer.from(b64Json, 'base64');
                   success = true;
               } else {
                   throw new Error('Gemini did not return an image part (all parts were thought images or no inlineData)');
               }
          } else {
               throw new Error('Invalid response from Gemini API');
          }

      } catch (error) {
          console.error('Gemini API error during image processing:', error);
      }

      if (!success) {
        // Fallback to basic sharp optimization if AI fails, rather than failing completely
        console.log('Falling back to basic image optimization due to AI error.');
        processedImageBuffer = await sharp(sourceImage.path)
          .png({ quality: 90, compressionLevel: 9 })
          .toBuffer();
      }

    } else {
      // Fallback: no API key - just optimize with sharp
      console.log(`[ImageProcessor] No Gemini API key, falling back to Sharp optimization for type: ${editType}`);
      processedImageBuffer = await sharp(sourceImage.path)
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
    }

    // Save final image
    fs.writeFileSync(outputPath, processedImageBuffer);

    return {
      processedUrl: `/uploads/processed/${outputFilename}`,
      localPath: outputPath
    };

  } finally {
    // Cleanup temp files
    tempFiles.forEach(file => {
      if (fs.existsSync(file)) {
        try { fs.unlinkSync(file); } catch (e) { console.error('Error cleaning temp file:', e); }
      }
    });
  }
}

module.exports = {
  processImage
};