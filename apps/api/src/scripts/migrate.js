const path = require('path');
const { DataTypes } = require('sequelize');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

const { sequelize } = require('../config/database');

async function ensureColumn(queryInterface, tableName, columns, columnName, definition) {
  if (columns[columnName]) {
    return;
  }

  await queryInterface.addColumn(tableName, columnName, definition);
  console.log(`Added ${tableName}.${columnName} column.`);
}

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  const normalizedTables = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

  await require('../models/Client').sync();
  const clientColumns = await queryInterface.describeTable('clients');
  await ensureColumn(queryInterface, 'clients', clientColumns, 'is_active', { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true });

  if (!normalizedTables.includes('users')) {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(180),
        allowNull: false,
        unique: true
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      password_salt: {
        type: DataTypes.STRING(64),
        allowNull: false
      },
      role: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 1
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      show_in_faq: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('Created users table.');
  } else {
    console.log('Users table already exists.');
  }

  if (!normalizedTables.includes('mail_configs')) {
    await queryInterface.createTable('mail_configs', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      tenant_id: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      client_id: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      client_secret: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      sender_email: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      recipient_email: {
        type: DataTypes.STRING(180),
        allowNull: false
      },
      secret_expires_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('Created mail_configs table.');
  } else {
    console.log('Mail configs table already exists.');
  }

  if (!normalizedTables.includes('chat_knowledge')) {
    await queryInterface.createTable('chat_knowledge', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      question: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING(160),
        allowNull: false
      },
      answer: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      keywords: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      priority: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('Created chat_knowledge table.');
  } else {
    const chatKnowledgeColumns = await queryInterface.describeTable('chat_knowledge');

    await ensureColumn(queryInterface, 'chat_knowledge', chatKnowledgeColumns, 'priority', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10
    });
    await ensureColumn(queryInterface, 'chat_knowledge', chatKnowledgeColumns, 'is_active', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await ensureColumn(queryInterface, 'chat_knowledge', chatKnowledgeColumns, 'show_in_faq', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    console.log('Chat knowledge table already exists.');
  }

  if (!normalizedTables.includes('page_visits')) {
    await queryInterface.createTable('page_visits', {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ip_address: {
        type: DataTypes.STRING(80),
        allowNull: false
      },
      path: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      country_code: {
        type: DataTypes.STRING(8),
        allowNull: true
      },
      country_name: {
        type: DataTypes.STRING(120),
        allowNull: true
      },
      device: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'Desktop'
      },
      browser: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'Unknown'
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    console.log('Created page_visits table.');
  } else {
    console.log('Page visits table already exists.');
  }

  await require('../models/Quotation').sync();
  const quotationColumns = await queryInterface.describeTable('quotations');
  await ensureColumn(queryInterface, 'quotations', quotationColumns, 'deleted_at', { type: DataTypes.DATE, allowNull: true });
  if (!quotationColumns.share_token) {
    await queryInterface.addColumn('quotations', 'share_token', {
      type: DataTypes.STRING(64), allowNull: true, unique: true
    });
  }
  console.log('Quotations table is ready.');
  if (!quotationColumns.client_response) {
    await queryInterface.addColumn('quotations', 'client_response', { type: DataTypes.JSON, allowNull: true });
  }
  await require('../models/QuotationVerification').sync();
  await require('../models/QuotationNotification').sync();
  await require('../models/QuotationResponseHistory').sync();
  await require('../models/QuotationNotificationRead').sync();
  await require('../models/QuotationPaymentProof').sync();
  await require('../models/ContractFile').sync();
  await require('../models/ContractTemplate').sync();
  const contractColumns = await queryInterface.describeTable('contract_templates');
  if (!contractColumns.source) await queryInterface.addColumn('contract_templates', 'source', { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'default' });
  if (!contractColumns.pdf_id) await queryInterface.addColumn('contract_templates', 'pdf_id', { type: DataTypes.UUID, allowNull: true });
  if (!contractColumns.format) await queryInterface.addColumn('contract_templates', 'format', { type: DataTypes.JSON, allowNull: true });
  if (contractColumns.terms.type.toUpperCase() !== 'MEDIUMTEXT') await queryInterface.changeColumn('contract_templates', 'terms', { type: DataTypes.TEXT('medium'), allowNull: false });
  await require('../models/BillingDeletionVerification').sync({ logging: false });
  await require('../models/BillingStatement').sync({ logging: false });
  const billingColumns = await queryInterface.describeTable('billing_statements');
  await ensureColumn(queryInterface, 'billing_statements', billingColumns, 'share_token', { type: DataTypes.STRING(64), allowNull: true, unique: true });
  await ensureColumn(queryInterface, 'billing_statements', billingColumns, 'email_sent_at', { type: DataTypes.DATE(3), allowNull: true });
  await ensureColumn(queryInterface, 'billing_statements', billingColumns, 'email_sent_to', { type: DataTypes.STRING(180), allowNull: true });
  if (!billingColumns.quotation_id.allowNull) await queryInterface.changeColumn('billing_statements', 'quotation_id', { type: DataTypes.INTEGER.UNSIGNED, allowNull: true });

}

if (require.main === module) {
  migrate()
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await sequelize.close().catch(() => {});
    });
}

module.exports = {
  migrate
};
