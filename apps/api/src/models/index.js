const AboutContent = require('./AboutContent');
const ChatKnowledge = require('./ChatKnowledge');
const ChatMessage = require('./ChatMessage');
const MailConfig = require('./MailConfig');
const PageVisit = require('./PageVisit');
const Quotation = require('./Quotation');
const QuotationVerification = require('./QuotationVerification');
const QuotationNotification = require('./QuotationNotification');
const QuotationResponseHistory = require('./QuotationResponseHistory');
const User = require('./User');
const ContractTemplate = require('./ContractTemplate');

module.exports = {
  QuotationContract: require('./QuotationContract'),
  PosSubscription: require('./PosSubscription'),
  QuotationPaymentProof: require('./QuotationPaymentProof'),
  QuotationPayment: require('./QuotationPayment'),
  QuotationNotificationRead: require('./QuotationNotificationRead'),
  Client: require('./Client'),
  BillingDeletionVerification: require('./BillingDeletionVerification'),
  BillingStatement: require('./BillingStatement'),
  ContractFile: require('./ContractFile'),
  ContractTemplate,
  AboutContent,
  ChatKnowledge,
  ChatMessage,
  MailConfig,
  PageVisit,
  Quotation,
  QuotationVerification,
  QuotationNotification,
  QuotationResponseHistory,
  User
};
