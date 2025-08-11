const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { createOpenAIClient, uploadAndExtractPdfToJson } = require('../../openai');

const router = express.Router();

// Ensure upload directory exists (backend/DATABASE/UPLOADS)
const uploadsDir = path.join(__dirname, '..', '..', 'DATABASE', 'UPLOADS');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// POST /upload-report
router.post('/upload-report', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const pdfPath = req.file.path;
    const pdfFilename = path.basename(pdfPath);

    // Build public URL reference to the stored PDF
    const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(pdfFilename)}`;

    // Initialize OpenAI client and process PDF
    const openai = createOpenAIClient();
    const modelJson = await uploadAndExtractPdfToJson(openai, pdfPath);

    const id = uuidv4();

    // Ensure "name" (for filename reference) is the first field
    const responseJson = {
      name: `${id}.json`,
      id,
      createdAt: new Date().toISOString(),
      pdf: {
        filename: pdfFilename,
        url: pdfUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
      data: modelJson, // dynamic fields from model
    };

    // Optionally: persist JSON alongside the PDF for future history
    const jsonDir = path.join(__dirname, '..', '..', 'DATABASE', 'JSON');
    fs.mkdirSync(jsonDir, { recursive: true });
    fs.writeFileSync(path.join(jsonDir, `${id}.json`), JSON.stringify(responseJson, null, 2));

    res.status(200).json(responseJson);
  } catch (error) {
    console.error('Error processing PDF upload:', error);
    res.status(500).json({ message: 'Failed to process upload', error: error.message });
  }
});

// GET /upload-report/test-existing?file=sample_lab_report_part2.pdf
// Convenience route to process an existing PDF already placed in DATABASE/UPLOADS
router.get('/upload-report/test-existing', async (req, res) => {
  try {
    const filename = req.query.file;
    if (!filename) return res.status(400).json({ message: 'Provide ?file=FILENAME.pdf' });
    const pdfPath = path.join(uploadsDir, filename);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ message: 'File not found in UPLOADS' });

    const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(filename)}`;
    const openai = createOpenAIClient();
    const modelJson = await uploadAndExtractPdfToJson(openai, pdfPath);
    const id = uuidv4();
    const responseJson = {
      name: `${id}.json`,
      id,
      createdAt: new Date().toISOString(),
      pdf: { filename, url: pdfUrl },
      data: modelJson,
    };
    const jsonDir = path.join(__dirname, '..', '..', 'DATABASE', 'JSON');
    fs.mkdirSync(jsonDir, { recursive: true });
    fs.writeFileSync(path.join(jsonDir, `${id}.json`), JSON.stringify(responseJson, null, 2));
    res.json(responseJson);
  } catch (err) {
    console.error('Error processing existing PDF:', err);
    res.status(500).json({ message: 'Failed to process existing PDF', error: err.message });
  }
});

module.exports = router;


