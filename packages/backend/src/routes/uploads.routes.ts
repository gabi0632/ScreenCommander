import { Router } from 'express';
import multer from 'multer';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = file.originalname.split('.').pop() ?? 'png';
    cb(null, `${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

export const uploadsRouter = Router();

// POST /api/uploads — upload an image, returns URL
uploadsRouter.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No image file provided' });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// GET /api/uploads/:filename — serve uploaded file
uploadsRouter.get('/:filename', (req, res) => {
  const filename = req.params['filename']!;

  // Reject path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  res.sendFile(filename, { root: UPLOADS_DIR }, (err) => {
    if (err) {
      res.status(404).json({ error: 'File not found' });
    }
  });
});
