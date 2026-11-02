const express = require('express');

const { requireAuth, requireRole, roles } = require('../middleware/auth');
const { MailConfig } = require('../models');

const router = express.Router();

function serializeConfig(config) {
  if (!config) {
    return {
      tenantId: process.env.MS_TENANT_ID || '',
      clientId: process.env.MS_CLIENT_ID || '',
      senderEmail: process.env.MS_SENDER_EMAIL || '',
      recipientEmail: process.env.MS_RECIPIENT_EMAIL || 'info@zerooneitinc.com',
      secretExpiresAt: '',
      hasClientSecret: Boolean(process.env.MS_CLIENT_SECRET)
    };
  }

  return {
    tenantId: config.tenantId,
    clientId: config.clientId,
    senderEmail: config.senderEmail,
    recipientEmail: config.recipientEmail,
    secretExpiresAt: config.secretExpiresAt ? config.secretExpiresAt.toISOString().slice(0, 10) : '',
    hasClientSecret: Boolean(config.clientSecret)
  };
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

router.use(requireAuth, requireRole([roles.SUPERADMIN, roles.ADMIN]));

router.get('/', async (req, res, next) => {
  try {
    const config = await MailConfig.findOne({
      order: [['id', 'ASC']]
    });

    return res.json({
      config: serializeConfig(config)
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const tenantId = cleanString(req.body?.tenantId);
    const clientId = cleanString(req.body?.clientId);
    const clientSecret = cleanString(req.body?.clientSecret);
    const senderEmail = cleanString(req.body?.senderEmail);
    const recipientEmail = cleanString(req.body?.recipientEmail);
    const secretExpiresAt = cleanString(req.body?.secretExpiresAt);

    if (!tenantId || !clientId || !senderEmail || !recipientEmail) {
      return res.status(400).json({
        message: 'Tenant ID, client ID, sender email, and recipient email are required.'
      });
    }

    const existingConfig = await MailConfig.findOne({
      order: [['id', 'ASC']]
    });

    const savedSecret = existingConfig?.clientSecret || process.env.MS_CLIENT_SECRET;
    if (!clientSecret && !savedSecret) {
      return res.status(400).json({
        message: 'Client secret is required the first time you save mail config.'
      });
    }

    const nextValues = {
      tenantId,
      clientId,
      clientSecret: clientSecret || savedSecret,
      senderEmail,
      recipientEmail,
      secretExpiresAt: secretExpiresAt ? new Date(`${secretExpiresAt}T00:00:00.000Z`) : null
    };

    const config = existingConfig
      ? await existingConfig.update(nextValues)
      : await MailConfig.create(nextValues);

    return res.json({
      message: 'Mail configuration saved.',
      config: serializeConfig(config)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
