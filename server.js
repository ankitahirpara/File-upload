const express = require('express');
const multer = require('multer');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const rateLimit = require('express-rate-limit');


const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, base + '-' + Date.now() + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Invalid file type'), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter
});

const downloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 1
});


// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Download route
app.get('/files/:filename', downloadLimiter,(req, res) => {
  const filename = req.params.filename;

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!filePath.startsWith(UPLOADS_DIR)) return res.status(400).json({ error: 'Invalid path' });

  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  res.download(filePath, err => {
    if (err) res.status(500).json({ error: 'Failed to download file' });
  });
});

app.get('/', (req, res) => {
  res.send('File Upload Service Running');
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
