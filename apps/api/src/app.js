const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');

const { appConfig } = require('./config/env');
const aboutContentRoutes = require('./routes/about-content.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const authRoutes = require('./routes/auth.routes');
const chatKnowledgeRoutes = require('./routes/chat-knowledge.routes');
const chatRoutes = require('./routes/chat.routes');
const contactRoutes = require('./routes/contact.routes');
const healthRoutes = require('./routes/health.routes');
const mailConfigRoutes = require('./routes/mail-config.routes');

const quotationRoutes = require('./routes/quotations.routes');

const app = express();

app.set('trust proxy', true);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  })
);
app.use(cors());
app.use(express.json({ limit: '512kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  // Client link tokens are credentials; omit their URLs from access logs.
  skip: (req) => req.originalUrl.startsWith('/api/quotations/') || req.originalUrl.startsWith('/api/billing/')
}));
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/about-content', aboutContentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin/chat-knowledge', chatKnowledgeRoutes);
app.use('/api/admin/mail-config', mailConfigRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/admin/quotations', quotationRoutes);
app.use('/api/admin/quotation-notifications', require('./routes/quotation-activity.routes'));
app.use('/api/admin/clients', require('./routes/client-records.routes'));
app.use('/api/billing', require('./routes/public-billing.routes'));
app.use('/api/admin/billing', require('./routes/billing.routes'));
app.use('/api/admin/contracts', require('./routes/contracts.routes'));
app.use('/api/quotations', require('./routes/public-quotations.routes'));

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found.'
  });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `Image is too large. Please upload an image up to ${appConfig.teamPhotoUploadMaxMb} MB.`
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: err.message || 'Something went wrong.'
  });
});

module.exports = app;
