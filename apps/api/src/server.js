const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const app = require('./app');
const { appConfig } = require('./config/env');
const { sequelize } = require('./config/database');
require('./models');
const { seedChatKnowledge } = require('./scripts/seed-chat-knowledge');
const { seedAdmin } = require('./scripts/seed-admin');
const { cleanDuplicateUniqueIndexes } = require('./utils/sequelize-indexes');

const port = process.env.PORT || 4000;

async function startServer() {
  const requireDbOnStart = process.env.REQUIRE_DB_ON_START === 'true';
  const syncDbOnStart = process.env.SYNC_DB_ON_START === 'true';
  const seedAdminOnStart = process.env.SEED_ADMIN_ON_START === 'true';
  const seedChatOnStart = process.env.SEED_CHAT_ON_START === 'true';
  let isDatabaseConnected = false;

  try {
    await sequelize.authenticate();
    isDatabaseConnected = true;
    console.log('Database connection established.');

    if (syncDbOnStart) {
      await sequelize.sync({ alter: true });
      console.log('Database models synced.');

      if (appConfig.sequelizeCleanDupUniqueIndexes) {
        await cleanDuplicateUniqueIndexes();
      }
    }

    if (seedAdminOnStart) {
      await seedAdmin();
    }

    if (seedChatOnStart) {
      await seedChatKnowledge();
    }
  } catch (error) {
    const mustStopForDatabase = requireDbOnStart || syncDbOnStart || seedAdminOnStart || seedChatOnStart;

    console.warn(
      mustStopForDatabase
        ? 'Database connection failed. API startup requires database access.'
        : 'Database connection failed. API will start without database access.'
    );
    console.warn(error.message);

    if (mustStopForDatabase) {
      process.exit(1);
    }
  }

  app.listen(port, () => {
    console.log(`ZeroOne API server listening on port ${port}`);
    if (isDatabaseConnected) require('./utils/quotation-notifications').startQuotationNotificationWorker();
    if (!isDatabaseConnected) {
      console.log('Set DB credentials in apps/api/.env to enable database-backed features.');
    }
  });
}

startServer();
