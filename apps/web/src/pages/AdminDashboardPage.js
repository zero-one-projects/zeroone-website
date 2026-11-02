import QuotationNotifications from '../components/QuotationNotifications';
import BillingPanel from '../components/BillingPanel';
import ClientRecordsPanel from '../components/ClientRecordsPanel';
import { useEffect, useRef, useState } from 'react';
import QuotationsPanel from '../components/QuotationsPanel';
import ContractsPanel from '../components/ContractsPanel';
import ProcessContentEditor from '../components/ProcessContentEditor';
import { getVisibleAboutSections } from '../content/aboutSections';
import ConfirmModal from '../components/ConfirmModal';
import LoadingOverlay from '../components/LoadingOverlay';
import Pagination from '../components/Pagination';
import Seo from '../components/Seo';
import Toast from '../components/Toast';
import { companyProfile } from '../content/companyProfile';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import '../admin-theme.css';

const apiBaseUrl = getApiBaseUrl();

const emptyConfig = {
  tenantId: '',
  clientId: '',
  clientSecret: '',
  senderEmail: '',
  recipientEmail: '',
  secretExpiresAt: '',
  hasClientSecret: false
};
const emptyKnowledgeDraft = {
  id: '',
  question: '',
  answer: '',
  keywords: '',
  priority: 0,
  isActive: true,
  showInFaq: false
};
const emptyTrafficData = {
  summary: {
    uniqueVisits: 0,
    pageViews: 0,
    uniqueVisitsChange: 0,
    pageViewsChange: 0
  },
  days: [],
  visits: []
};
const knowledgeEntriesPageSize = 10;
const recentVisitorsPageSize = 10;
const entraClientSecretUrl =
  'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Credentials/appId/f8c08f17-5427-4722-a943-fa6ed8a912f1/isMSAApp~/false';

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  return Boolean(value);
}

function normalizeKnowledgeEntry(entry) {
  return {
    ...entry,
    isActive: normalizeBoolean(entry.isActive),
    showInFaq: normalizeBoolean(entry.showInFaq)
  };
}

function stripRuntimeFields(section) {
  const { image, ...sectionContent } = section;

  if (Array.isArray(section.members)) {
    sectionContent.members = section.members.map((member) => {
      const { image: memberImage, previewImage, ...memberContent } = member;
      if (typeof memberImage === 'string' && memberImage.startsWith('/api/uploads/')) {
        memberContent.image = memberImage;
      }
      return memberContent;
    });
  }

  return sectionContent;
}

function getEditableMembers(defaultMembers = [], overrideMembers) {
  const sourceMembers = Array.isArray(overrideMembers) ? overrideMembers : defaultMembers;

  return sourceMembers.map((member, index) => {
    const defaultMember =
      defaultMembers.find((current) => current.name === member.name) ||
      defaultMembers[index] ||
      {};
    const uploadedImage = typeof member.image === 'string' && member.image.startsWith('/api/uploads/')
      ? member.image
      : '';

    return {
      ...member,
      image: uploadedImage,
      previewImage: uploadedImage || defaultMember.image || ''
    };
  });
}

function mergeEditableSection(defaultSection, overrideContent) {
  const section = {
    ...stripRuntimeFields(defaultSection),
    ...(overrideContent || {})
  };

  if (Array.isArray(defaultSection.members)) {
    section.members = getEditableMembers(defaultSection.members, overrideContent?.members);
  }

  return section;
}

function getEditableSections(overrides = []) {
  const overrideMap = new Map(overrides.map((item) => [item.sectionId, item.content]));
  const metricSections = [
    {
      id: 'stats',
      type: 'metrics',
      title: 'Expertise Cards',
      items: overrideMap.get('stats')?.items || companyProfile.stats
    },
    {
      id: 'projectCounters',
      type: 'metrics',
      title: 'Company Numbers',
      items: overrideMap.get('projectCounters')?.items || companyProfile.projectCounters
    }
  ];

  return [
    ...getVisibleAboutSections(companyProfile.sections).filter((section) => section.id === 'about').map((section) => mergeEditableSection(section, overrideMap.get(section.id))),
    ...metricSections,
    ...getVisibleAboutSections(companyProfile.sections).filter((section) => section.id !== 'about').map((section) => mergeEditableSection(section, overrideMap.get(section.id)))
  ];
}

function getDefaultContentSectionId(sections = []) {
  return sections[0]?.id || '';
}

function linesToText(lines = []) {
  return Array.isArray(lines) ? lines.join('\n') : '';
}

function safeJsonParse(value, fallback) {
  if (!value.trim()) {
    return fallback;
  }

  return JSON.parse(value);
}

function getPreviewImageUrl(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (value.startsWith('/api/uploads/')) {
    return `${apiBaseUrl}${value}`;
  }

  return value;
}

function isUploadedTeamPhoto(value) {
  return typeof value === 'string' && value.startsWith('/api/uploads/team/');
}

function getAdminPageMeta(page) {
  if (page === 'dashboard') {
    return {
      title: 'Admin Dashboard',
      canonicalPath: '/admin/dashboard'
    };
  }

  if (page === 'content') {
    return {
      title: 'Content Management',
      canonicalPath: '/admin/content'
    };
  }

  if (page === 'quotation-list') {
    return { title: 'Quotation List', canonicalPath: '/admin/quotation-list' };
  }

  if (page === 'add-client') return { title: 'Add Client', canonicalPath: '/admin/clients/add' };

  if (page === 'clients') return { title: 'Client Record', canonicalPath: '/admin/clients' };
  if (page === 'billing') return { title: 'Billing', canonicalPath: '/admin/billing' };

  if (page === 'contracts') return { title: 'Contracts', canonicalPath: '/admin/contracts' };

  if (page === 'quotations') {
    return { title: 'Quotations', canonicalPath: '/admin/quotations' };
  }

  if (page === 'knowledge-base') {
    return {
      title: 'Chat Knowledge Base',
      canonicalPath: '/admin/knowledge-base'
    };
  }

  return {
    title: 'Mail Configuration',
    canonicalPath: '/admin/mail-config'
  };
}

function getAdminLoadingMessage(page, uploadingMemberKey, statusMessage) {
  if (statusMessage) {
    return statusMessage;
  }

  if (uploadingMemberKey) {
    return 'Uploading and optimizing photo...';
  }

  if (page === 'dashboard') {
    return 'Loading website traffic...';
  }

  if (page === 'content') {
    return 'Loading website content...';
  }

  if (page === 'knowledge-base') {
    return 'Loading chat knowledge base...';
  }

  return 'Loading mail configuration...';
}

function getSecretExpiryStatus(secretExpiresAt) {
  if (!secretExpiresAt) {
    return {
      type: 'warning',
      message: 'No client secret expiration date is saved. Add the date from Microsoft Entra so admins know when to rotate it.'
    };
  }

  const today = new Date();
  const expiryDate = new Date(`${secretExpiresAt}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilExpiry < 0) {
    return {
      type: 'error',
      message: `Client secret expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) === 1 ? '' : 's'} ago. Create a new secret in Microsoft Entra and save it here.`
    };
  }

  if (daysUntilExpiry === 0) {
    return {
      type: 'error',
      message: 'Client secret expires today. Create a new secret in Microsoft Entra and save it here.'
    };
  }

  if (daysUntilExpiry <= 30) {
    return {
      type: 'warning',
      message: `Client secret expires in ${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'}. Create a new secret soon to avoid contact form downtime.`
    };
  }

  return {
    type: 'success',
    message: `Client secret is valid until ${new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(expiryDate)}.`
  };
}

function formatMetric(value) {
  return Number(value || 0).toLocaleString();
}

function formatPercentChange(value) {
  const numericValue = Number(value || 0);
  const sign = numericValue > 0 ? '+' : '';

  return `${sign}${numericValue}% from previous 30 days`;
}

function getChangeClass(value) {
  return Number(value || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600';
}

function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) {
    return String.fromCodePoint(0x1f310);
  }

  return countryCode
    .toUpperCase()
    .split('')
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('');
}

function formatVisitedAt(value) {
  if (!value) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function createChartPath(values, width = 360, height = 110) {
  const numericValues = values.length ? values.map((value) => Number(value || 0)) : [0];
  const maxValue = Math.max(...numericValues, 1);
  const step = numericValues.length > 1 ? width / (numericValues.length - 1) : width;
  const points = numericValues.map((value, index) => {
    const x = index * step;
    const y = height - (value / maxValue) * (height - 12) - 6;

    return [x, y];
  });

  return {
    line: points.map(([x, y]) => `${x},${y}`).join(' '),
    area: `M ${points[0][0]} ${height} L ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} L ${
      points[points.length - 1][0]
    } ${height} Z`
  };
}

function TrafficChart({ values }) {
  const chart = createChartPath(values);

  return (
    <svg className="mt-5 h-28 w-full" viewBox="0 0 360 110" preserveAspectRatio="none" aria-hidden="true">
      <path d={chart.area} fill="rgba(59, 130, 246, 0.18)" />
      <polyline fill="none" points={chart.line} stroke="#1d7cff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    </svg>
  );
}

function TrafficMetricCard({ change, label, value, values }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-black text-slate-950">{label}</h3>
      <p className="mt-7 text-4xl font-normal tracking-normal text-slate-950">{formatMetric(value)}</p>
      <p className={`mt-1 text-sm font-semibold ${getChangeClass(change)}`}>{formatPercentChange(change)}</p>
      <TrafficChart values={values} />
    </article>
  );
}

function AdminDashboardPage({ page = 'dashboard' }) {
  const [config, setConfig] = useState(emptyConfig);
  const [contentSections, setContentSections] = useState(() => getEditableSections());
  const [activeSectionId, setActiveSectionId] = useState(() => getDefaultContentSectionId(getEditableSections()));
  const [advancedJson, setAdvancedJson] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClientsMenuOpen, setIsClientsMenuOpen] = useState(() => ['clients', 'add-client'].includes(page));
  useEffect(() => { if (['clients', 'add-client'].includes(page)) setIsClientsMenuOpen(true); }, [page]);
  const [isSalesMenuOpen, setIsSalesMenuOpen] = useState(() =>
    ['quotations', 'quotation-list', 'contracts', 'billing'].includes(page)
  );

  useEffect(() => {
    if (['quotations', 'quotation-list', 'contracts', 'billing'].includes(page)) {
      setIsSalesMenuOpen(true);
    }
  }, [page]);
  const [status, setStatus] = useState({
    type: 'idle',
    message: ''
  });
  const [toast, setToast] = useState({
    type: 'info',
    message: ''
  });
  const [uploadingMemberKey, setUploadingMemberKey] = useState('');
  const [brokenPreviewImages, setBrokenPreviewImages] = useState({});
  const [pendingPhotoDeletes, setPendingPhotoDeletes] = useState([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState([]);
  const [knowledgeDraft, setKnowledgeDraft] = useState(emptyKnowledgeDraft);
  const [knowledgeDeleteTarget, setKnowledgeDeleteTarget] = useState(null);
  const [knowledgeEntriesPage, setKnowledgeEntriesPage] = useState(1);
  const [recentVisitorsPage, setRecentVisitorsPage] = useState(1);
  const [trafficData, setTrafficData] = useState(emptyTrafficData);
  const knowledgeEntriesListRef = useRef(null);
  const recentVisitorsListRef = useRef(null);

  const token = window.localStorage.getItem('zerooneAdminToken') || '';
  const storedUser = JSON.parse(window.localStorage.getItem('zerooneAdminUser') || 'null');
  const adminName = storedUser?.name || storedUser?.email || 'Admin';
  const adminEmail = storedUser?.email || 'zeroone-admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const expiryStatus = getSecretExpiryStatus(config.secretExpiresAt);
  const activeSection = contentSections.find((section) => section.id === activeSectionId) || contentSections[0];
  const adminPageMeta = getAdminPageMeta(page);
  const knowledgeEntriesTotalPages = Math.max(Math.ceil(knowledgeEntries.length / knowledgeEntriesPageSize), 1);
  const paginatedKnowledgeEntries = knowledgeEntries.slice(
    (knowledgeEntriesPage - 1) * knowledgeEntriesPageSize,
    knowledgeEntriesPage * knowledgeEntriesPageSize
  );
  const recentVisitorsTotalPages = Math.max(Math.ceil(trafficData.visits.length / recentVisitorsPageSize), 1);
  const paginatedRecentVisitors = trafficData.visits.slice(
    (recentVisitorsPage - 1) * recentVisitorsPageSize,
    recentVisitorsPage * recentVisitorsPageSize
  );
  const uniqueVisitValues = trafficData.days.map((day) => day.uniqueVisits);
  const pageViewValues = trafficData.days.map((day) => day.pageViews);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsProfileMenuOpen(false);
  }, [page]);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    setKnowledgeEntriesPage((currentPage) => Math.min(currentPage, knowledgeEntriesTotalPages));
  }, [knowledgeEntriesTotalPages]);

  useEffect(() => {
    setRecentVisitorsPage((currentPage) => Math.min(currentPage, recentVisitorsTotalPages));
  }, [recentVisitorsTotalPages]);

  useEffect(() => {
    if (!token || page !== 'dashboard') {
      return;
    }

    async function loadTrafficData() {
      setStatus({
        type: 'loading',
        message: 'Loading website traffic...'
      });

      try {
        const response = await fetch(`${apiBaseUrl}/api/analytics/admin/traffic`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load website traffic.');
        }

        setTrafficData({
          ...emptyTrafficData,
          ...payload,
          summary: {
            ...emptyTrafficData.summary,
            ...(payload?.summary || {})
          },
          days: Array.isArray(payload?.days) ? payload.days : [],
          visits: Array.isArray(payload?.visits) ? payload.visits : []
        });
        setStatus({
          type: 'idle',
          message: ''
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load website traffic.';
        setStatus({
          type: 'error',
          message: ''
        });
        setToast({
          type: 'error',
          message
        });
      }
    }

    loadTrafficData();
  }, [page, token]);

  useEffect(() => {
    if (!token) {
      window.history.replaceState({}, '', '/admin/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    if (page !== 'mail-config') {
      return;
    }

    async function loadConfig() {
      setStatus({
        type: 'loading',
        message: 'Loading mail configuration...'
      });

      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/mail-config`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load mail configuration.');
        }

        setConfig({
          ...emptyConfig,
          ...payload.config,
          clientSecret: ''
        });
        setStatus({
          type: 'idle',
          message: ''
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load mail configuration.';
        setStatus({
          type: 'error',
          message: ''
        });
        setToast({
          type: 'error',
          message
        });
      }
    }

    loadConfig();
  }, [page, token]);

  useEffect(() => {
    if (!token || page !== 'content') {
      return;
    }

    async function loadContent() {
      setStatus({
        type: 'loading',
        message: 'Loading website content...'
      });

      try {
        const response = await fetch(`${apiBaseUrl}/api/about-content/admin`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load about content.');
        }

        const sections = getEditableSections(Array.isArray(payload?.sections) ? payload.sections : []);
        setContentSections(sections);
        setActiveSectionId((current) => current || getDefaultContentSectionId(sections));
        setStatus({
          type: 'idle',
          message: ''
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load about content.';
        setStatus({
          type: 'error',
          message: ''
        });
        setToast({
          type: 'error',
          message
        });
      }
    }

    loadContent();
  }, [page, token]);

  useEffect(() => {
    if (!token || page !== 'knowledge-base') {
      return;
    }

    async function loadKnowledgeEntries() {
      setStatus({
        type: 'loading',
        message: 'Loading chat knowledge base...'
      });

      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/chat-knowledge`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.message || 'Unable to load chat knowledge base.');
        }

        setKnowledgeEntries(Array.isArray(payload?.entries) ? payload.entries.map(normalizeKnowledgeEntry) : []);
        setStatus({
          type: 'idle',
          message: ''
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to load chat knowledge base.';
        setStatus({
          type: 'error',
          message: ''
        });
        setToast({
          type: 'error',
          message
        });
      }
    }

    loadKnowledgeEntries();
  }, [page, token]);

  useEffect(() => {
    if (!activeSection) {
      setAdvancedJson('');
      return;
    }

    setAdvancedJson(JSON.stringify(activeSection, null, 2));
  }, [activeSection]);

  function handleChange(event) {
    const { name, value } = event.target;

    setConfig((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({
      type: 'loading',
      message: 'Saving mail configuration...'
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/mail-config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save mail configuration.');
      }

      setConfig({
        ...emptyConfig,
        ...payload.config,
        clientSecret: ''
      });
      setStatus({
        type: 'success',
        message: ''
      });
      setToast({
        type: 'success',
        message: payload.message || 'Mail configuration saved.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save mail configuration.';
      setStatus({
        type: 'error',
        message: ''
      });
      setToast({
        type: 'error',
        message
      });
    }
  }

  function updateActiveSection(updater) {
    setContentSections((currentSections) =>
      currentSections.map((section) => {
        if (section.id !== activeSectionId) {
          return section;
        }

        return typeof updater === 'function' ? updater(section) : updater;
      })
    );
  }

  function handleSectionFieldChange(event) {
    const { name, value } = event.target;

    updateActiveSection((section) => ({
      ...section,
      [name]: name === 'paragraphs' ? value.split('\n') : value
    }));
  }

  function handleCardChange(index, field, value) {
    updateActiveSection((section) => ({
      ...section,
      cards: section.cards.map((card, cardIndex) =>
        cardIndex === index
          ? {
              ...card,
              [field]: value
            }
          : card
      )
    }));
  }

  function handleMemberChange(index, field, value) {
    updateActiveSection((section) => ({
      ...section,
      members: section.members.map((member, memberIndex) =>
        memberIndex === index
          ? {
              ...member,
              [field]: value
            }
          : member
      )
    }));
  }

  function handleAddMember() {
    updateActiveSection((section) => ({
      ...section,
      members: [
        ...(Array.isArray(section.members) ? section.members : []),
        {
          name: '',
          role: '',
          image: ''
        }
      ]
    }));
  }

  function handleRemoveMember(index) {
    updateActiveSection((section) => {
      const removedMember = section.members[index];

      if (isUploadedTeamPhoto(removedMember?.image)) {
        setPendingPhotoDeletes((current) => [...new Set([...current, removedMember.image])]);
      }

      return {
        ...section,
        members: section.members.filter((member, memberIndex) => memberIndex !== index)
      };
    });
  }

  async function deleteUploadedPhoto(url) {
    if (!isUploadedTeamPhoto(url)) {
      return;
    }

    await fetch(`${apiBaseUrl}/api/about-content/admin/team-photo`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url
      })
    });
  }

  async function deleteUploadedPhotos(urls) {
    const uniqueUrls = [...new Set(urls.filter(isUploadedTeamPhoto))];

    await Promise.all(uniqueUrls.map((url) => deleteUploadedPhoto(url)));
  }

  async function saveContentSection(sectionToSave) {
    const content = stripRuntimeFields({
      ...sectionToSave,
      id: sectionToSave.id,
      type: sectionToSave.type
    });

    if (Array.isArray(content.paragraphs)) {
      content.paragraphs = content.paragraphs.map((line) => line.trim()).filter(Boolean);
    }
    if (Array.isArray(content.cards)) {
      content.cards = content.cards.map((card) => ({
        ...card,
        ...(Array.isArray(card.tags) ? { tags: card.tags.map((tag) => tag.trim()).filter(Boolean) } : {})
      }));
    }

    const response = await fetch(`${apiBaseUrl}/api/about-content/admin/${sectionToSave.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content
      })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.message || 'Unable to save about content.');
    }

    const defaultSection = companyProfile.sections.find((section) => section.id === sectionToSave.id);

    return Array.isArray(sectionToSave.members) && defaultSection
      ? mergeEditableSection(defaultSection, payload.section.content)
      : {
          ...payload.section.content,
          id: sectionToSave.id,
          type: sectionToSave.type
        };
  }

  async function handleMemberPhotoUpload(index, file) {
    if (!file) {
      return;
    }

    setUploadingMemberKey(`${activeSectionId}-${index}`);
    setStatus({
      type: 'loading',
      message: 'Uploading and optimizing photo...'
    });

    let uploadedPhotoUrl = '';

    try {
      const previousUploadedImage = activeSection.members[index]?.image;
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${apiBaseUrl}/api/about-content/admin/team-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to upload team photo.');
      }

      uploadedPhotoUrl = payload.url;
      const updatedSection = {
        ...activeSection,
        members: activeSection.members.map((member, memberIndex) =>
          memberIndex === index
            ? {
                ...member,
                image: uploadedPhotoUrl,
                previewImage: uploadedPhotoUrl
              }
            : member
        )
      };
      const savedSection = await saveContentSection(updatedSection);

      updateActiveSection(savedSection);
      if (previousUploadedImage && previousUploadedImage !== uploadedPhotoUrl) {
        await deleteUploadedPhotos([previousUploadedImage]).catch(() => {});
        setPendingPhotoDeletes((current) => current.filter((url) => url !== previousUploadedImage));
      }
      setBrokenPreviewImages((current) => {
        const next = { ...current };
        delete next[`${activeSectionId}-${index}`];
        return next;
      });
      setToast({
        type: 'success',
        message: 'Photo uploaded as WebP and published.'
      });
      setStatus({
        type: 'idle',
        message: ''
      });
    } catch (error) {
      if (uploadedPhotoUrl) {
        await deleteUploadedPhotos([uploadedPhotoUrl]).catch(() => {});
      }
      const message = error instanceof Error ? error.message : 'Unable to upload team photo.';
      setStatus({
        type: 'error',
        message: ''
      });
      setToast({
        type: 'error',
        message
      });
    } finally {
      setUploadingMemberKey('');
    }
  }

  function handleMetricChange(index, field, value) {
    updateActiveSection((section) => ({
      ...section,
      items: section.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
  }

  async function handleContentSubmit(event) {
    event.preventDefault();

    if (!activeSection) {
      return;
    }

    setStatus({
      type: 'loading',
      message: 'Saving website content...'
    });

    try {
      const parsedContent = safeJsonParse(advancedJson, activeSection);
      const savedSection = await saveContentSection({
        ...parsedContent,
        id: activeSection.id,
        type: activeSection.type
      });

      updateActiveSection(savedSection);
      await deleteUploadedPhotos(pendingPhotoDeletes).catch(() => {});
      setPendingPhotoDeletes([]);
      setStatus({
        type: 'success',
        message: ''
      });
      setToast({
        type: 'success',
        message: 'About content section saved.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save about content.';
      setStatus({
        type: 'error',
        message: ''
      });
      setToast({
        type: 'error',
        message
      });
    }
  }

  function handleKnowledgeDraftChange(event) {
    const { checked, name, type, value } = event.target;

    setKnowledgeDraft((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  function resetKnowledgeDraft() {
    setKnowledgeDraft(emptyKnowledgeDraft);
  }

  function handleEditKnowledge(entry) {
    setKnowledgeDraft({
      id: entry.id,
      question: entry.question || '',
      answer: entry.answer || '',
      keywords: entry.keywords || '',
      priority: entry.priority || 0,
      isActive: normalizeBoolean(entry.isActive),
      showInFaq: normalizeBoolean(entry.showInFaq)
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function handleKnowledgeEntriesPageChange(nextPage) {
    setKnowledgeEntriesPage(nextPage);
    requestAnimationFrame(() => {
      knowledgeEntriesListRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  function handleRecentVisitorsPageChange(nextPage) {
    setRecentVisitorsPage(nextPage);
    requestAnimationFrame(() => {
      recentVisitorsListRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  async function handleKnowledgeSubmit(event) {
    event.preventDefault();

    setStatus({
      type: 'loading',
      message: knowledgeDraft.id ? 'Updating knowledge entry...' : 'Adding knowledge entry...'
    });

    const isEditing = Boolean(knowledgeDraft.id);

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/admin/chat-knowledge${isEditing ? `/${knowledgeDraft.id}` : ''}`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            question: knowledgeDraft.question,
            answer: knowledgeDraft.answer,
            keywords: knowledgeDraft.keywords,
            priority: Number(knowledgeDraft.priority) || 0,
            isActive: knowledgeDraft.isActive,
            showInFaq: knowledgeDraft.showInFaq
          })
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to save knowledge base entry.');
      }

      setKnowledgeEntries((current) => {
        const nextEntries = isEditing
          ? current.map((entry) => (entry.id === payload.entry.id ? normalizeKnowledgeEntry(payload.entry) : entry))
          : [...current, normalizeKnowledgeEntry(payload.entry)];

        return nextEntries.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.id - b.id);
      });
      resetKnowledgeDraft();
      setStatus({
        type: 'success',
        message: ''
      });
      setToast({
        type: 'success',
        message: payload.message || 'Knowledge base entry saved.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save knowledge base entry.';
      setStatus({
        type: 'error',
        message: ''
      });
      setToast({
        type: 'error',
        message
      });
    }
  }

  async function confirmDeleteKnowledge() {
    if (!knowledgeDeleteTarget) {
      return;
    }

    setStatus({
      type: 'loading',
      message: 'Deleting knowledge entry...'
    });

    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/chat-knowledge/${knowledgeDeleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to delete knowledge base entry.');
      }

      setKnowledgeEntries((current) => current.filter((entry) => entry.id !== knowledgeDeleteTarget.id));
      if (knowledgeDraft.id === knowledgeDeleteTarget.id) {
        resetKnowledgeDraft();
      }
      setKnowledgeDeleteTarget(null);
      setStatus({
        type: 'success',
        message: ''
      });
      setToast({
        type: 'success',
        message: payload.message || 'Knowledge base entry deleted.'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete knowledge base entry.';
      setKnowledgeDeleteTarget(null);
      setStatus({
        type: 'error',
        message: ''
      });
      setToast({
        type: 'error',
        message
      });
    }
  }

  function handleLogout() {
    window.localStorage.removeItem('zerooneAdminToken');
    window.localStorage.removeItem('zerooneAdminUser');
    window.history.replaceState({}, '', '/admin/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  if (!token) {
    window.history.replaceState({}, '', '/admin/login');
    return null;
  }

  return (
    <main className="admin-theme min-h-screen bg-white text-slate-950">
      <Seo
        title={`${adminPageMeta.title} | ZeroOne IT Inc. Admin`}
        description="Private ZeroOne IT Inc. administrator workspace."
        canonicalPath={adminPageMeta.canonicalPath}
        noindex
      />
      <LoadingOverlay
        isOpen={status.type === 'loading'}
        message={getAdminLoadingMessage(page, uploadingMemberKey, status.message)}
      />
      <button
        className="fixed left-4 top-4 z-50 grid h-11 w-11 place-items-center rounded-xl border border-slate-200/20 admin-brand-surface text-white shadow-2xl shadow-slate-950/30 lg:hidden"
        type="button"
        onClick={() => setIsSidebarOpen((current) => !current)}
        aria-label={isSidebarOpen ? 'Close admin menu' : 'Open admin menu'}
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
        )}
      </button>

      {isSidebarOpen ? (
        <button
          className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm lg:hidden"
          type="button"
          aria-label="Close admin menu"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="min-h-screen lg:grid lg:grid-cols-[14.5rem_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,82vw)] -translate-x-full flex-col border-r border-slate-900/10 admin-brand-surface px-4 py-4 pt-20 text-white shadow-2xl shadow-slate-950/40 transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:min-h-screen lg:w-auto lg:translate-x-0 lg:pt-4 lg:shadow-none ${
            isSidebarOpen ? 'translate-x-0' : ''
          }`}
        >
          <a className="flex items-center gap-3" href="/">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-[#39344d] shadow-lg shadow-black/20">
              01
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-black">ZeroOne IT Inc.</span>
              <span className="block text-xs font-semibold text-white/70">Admin Workspace</span>
            </span>
          </a>

          <nav className="mt-8 grid gap-6 overflow-y-auto" aria-label="Admin navigation">
            <section className="grid gap-2">
              <p className="px-3 text-xs font-black uppercase tracking-[0.24em] text-white/50">Main</p>
              <a
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black shadow-lg shadow-black/10 transition ${
                  page === 'dashboard'
                    ? 'admin-nav-active border-white/20 bg-white/10 text-white'
                    : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                }`}
                href="/admin/dashboard"
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4.75 5.75A1.75 1.75 0 0 1 6.5 4h3.25v6.25h-5v-4.5ZM14.25 4h3.25a1.75 1.75 0 0 1 1.75 1.75v3.25h-5V4ZM4.75 14.75h5V20H6.5a1.75 1.75 0 0 1-1.75-1.75v-3.5ZM14.25 13.5h5v4.75A1.75 1.75 0 0 1 17.5 20h-3.25v-6.5Z"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                  </svg>
                </span>
                Dashboard
                {page === 'dashboard' ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                ) : null}
              </a>
              <a
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black shadow-lg shadow-black/10 transition ${
                  page === 'content'
                    ? 'admin-nav-active border-white/20 bg-white/10 text-white'
                    : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                }`}
                href="/admin/content"
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 4.75h14A1.25 1.25 0 0 1 20.25 6v12A1.25 1.25 0 0 1 19 19.25H5A1.25 1.25 0 0 1 3.75 18V6A1.25 1.25 0 0 1 5 4.75Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path d="M7.5 8.5h9M7.5 12h9M7.5 15.5h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </span>
                Content
                {page === 'content' ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                ) : null}
              </a>
              <a
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black shadow-lg shadow-black/10 transition ${
                  page === 'knowledge-base'
                    ? 'admin-nav-active border-white/20 bg-white/10 text-white'
                    : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                }`}
                href="/admin/knowledge-base"
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 5.75A2.75 2.75 0 0 1 7.75 3h8.5A2.75 2.75 0 0 1 19 5.75v6.5A2.75 2.75 0 0 1 16.25 15H11l-4.25 4v-4A2.75 2.75 0 0 1 4 12.25v-6.5Z"
                      stroke="currentColor"
                      strokeLinejoin="round"
                      strokeWidth="1.8"
                    />
                    <path d="M8 7.5h8M8 10.5h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </span>
                Chat KB
                {page === 'knowledge-base' ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                ) : null}
              </a>
              <section className="grid gap-2" aria-label="Clients">
                <button type="button" className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black transition ${['clients', 'add-client'].includes(page) ? 'admin-nav-active border-white/20 bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`} aria-expanded={isClientsMenuOpen} aria-controls="admin-clients-links" onClick={() => setIsClientsMenuOpen(current => !current)}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20v-3a5 5 0 0 1 10 0v3M16 5h5M16 9h5M16 13h5M16 17h5"/></svg></span>Clients
                  <svg className={`ml-auto h-4 w-4 shrink-0 transition-transform ${isClientsMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <div id="admin-clients-links" className={isClientsMenuOpen ? 'ml-7 grid gap-1 border-l border-white/15 pl-3' : 'hidden'} hidden={!isClientsMenuOpen}>
                  {[['add-client', 'Add Client', '/admin/clients/add'], ['clients', 'Client Records', '/admin/clients']].map(([value, label, href]) => <a key={value} href={href} onClick={() => setIsSidebarOpen(false)} aria-current={page === value ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${page === value ? 'admin-nav-active border-white/20 bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}>{label}{page === value && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}</a>)}
                </div>
              </section>
              <a
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black shadow-lg shadow-black/10 transition ${
                  page === 'mail-config'
                    ? 'admin-nav-active border-white/20 bg-white/10 text-white'
                    : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                }`}
                href="/admin/mail-config"
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path d="m6 8 6 4.5L18 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                  </svg>
                </span>
                Mail Config
                {page === 'mail-config' ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                ) : null}
              </a>
            </section>
            <section className="grid gap-2" aria-labelledby="admin-sales-contract-heading">
              <button
                id="admin-sales-contract-heading"
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-black transition ${['quotations', 'quotation-list', 'contracts', 'billing'].includes(page) ? 'admin-nav-active border-white/20 bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}
                type="button"
                aria-expanded={isSalesMenuOpen}
                aria-controls="admin-sales-contract-links"
                onClick={() => setIsSalesMenuOpen(current => !current)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/90" aria-hidden="true"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h9l3 3v15H5V3h2M9 8h6M9 12h6M9 17l2-2 2 2 3-3" /></svg></span>
                Sales &amp; Contract
                <svg className={`ml-auto h-4 w-4 shrink-0 transition-transform ${isSalesMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div id="admin-sales-contract-links" className={isSalesMenuOpen ? 'ml-7 grid gap-1 border-l border-white/15 pl-3' : 'hidden'} hidden={!isSalesMenuOpen}>
                {[['quotations', 'Quotations', '/admin/quotations'], ['contracts', 'Contracts', '/admin/contracts'], ['billing', 'Billing', '/admin/billing']].map(([value, label, href]) => {
                  const active = page === value || (value === 'quotations' && page === 'quotation-list');
                  return <a key={value} href={href} onClick={() => setIsSidebarOpen(false)} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-bold transition ${active ? 'admin-nav-active border-white/20 bg-white/10 text-white' : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}>{label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}</a>;
                })}
              </div>
            </section>
          </nav>

          <div className="relative mt-auto pt-6">
            {isProfileMenuOpen ? (
              <div className="absolute bottom-[4.9rem] left-0 right-0 rounded-lg border border-slate-200 bg-white p-4 text-slate-800 shadow-2xl shadow-black/30">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-sm font-black text-slate-700">
                    {adminInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{adminName}</span>
                    <span className="block truncate text-xs font-semibold text-slate-500">{adminEmail}</span>
                  </span>
                </div>
                <button
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-semibold transition hover:bg-slate-100"
                  type="button"
                >
                  Profile
                  <span aria-hidden="true">›</span>
                </button>
                <button
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                >
                  Logout
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            ) : null}

            <button
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/10"
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              aria-expanded={isProfileMenuOpen}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-sm font-black text-[#39344d]">
                {adminInitial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{adminName}</span>
                <span className="block truncate text-xs font-semibold text-white/70">
                  {storedUser?.roleName || 'Admin'}
                </span>
              </span>
              <span className="ml-auto text-white/70" aria-hidden="true">
                {isProfileMenuOpen ? '⌄' : '⌃'}
              </span>
            </button>
          </div>
        </aside>

        <section className="min-w-0 w-full overflow-x-hidden px-5 py-20 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-6 flex justify-end"><QuotationNotifications token={token} /></div>
          {page === 'dashboard' ? (
            <div className="w-full max-w-6xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Dashboard</p>
              <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">Admin Dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Review public website traffic, recent visitor activity, and the pages people are opening.
              </p>

              <section className="mt-8 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
                <div className="border-b border-slate-200 p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Website Traffic</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">Customer page activity</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Page views and unique visits from the last 30 days.
                  </p>
                </div>

                <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
                  <TrafficMetricCard
                    label="Unique Visits"
                    value={trafficData.summary.uniqueVisits}
                    change={trafficData.summary.uniqueVisitsChange}
                    values={uniqueVisitValues}
                  />
                  <TrafficMetricCard
                    label="Page Views"
                    value={trafficData.summary.pageViews}
                    change={trafficData.summary.pageViewsChange}
                    values={pageViewValues}
                  />
                </div>
              </section>

              <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-5 sm:p-6">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Recent Visitors</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">Visitor IP activity</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Last 30 Days
                  </span>
                </div>

                <div className="overflow-x-auto" ref={recentVisitorsListRef}>
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-5 py-3">IP Address</th>
                        <th className="px-5 py-3">Country</th>
                        <th className="px-5 py-3">Device</th>
                        <th className="px-5 py-3">Browser</th>
                        <th className="px-5 py-3">Page</th>
                        <th className="px-5 py-3">Visited</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRecentVisitors.map((visit) => (
                        <tr key={visit.id} className="text-slate-700">
                          <td className="px-5 py-4 font-bold text-slate-950">{visit.ipAddress}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 font-semibold">
                              <span aria-hidden="true">{getCountryFlag(visit.countryCode)}</span>
                              {visit.countryName || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-5 py-4">{visit.device || 'Unknown'}</td>
                          <td className="px-5 py-4">{visit.browser || 'Unknown'}</td>
                          <td className="px-5 py-4">
                            <span className="inline-flex max-w-[14rem] truncate rounded-full bg-[#f4f1f7] px-3 py-1 text-xs font-bold text-[#514568]">
                              {visit.path || '/'}
                            </span>
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">{formatVisitedAt(visit.visitedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!trafficData.visits.length ? (
                  <div className="p-5 text-sm font-semibold text-slate-500 sm:p-6">
                    No visitor activity recorded yet. Public page visits will appear here after the tracker receives
                    traffic.
                  </div>
                ) : null}

                <div className="border-t border-slate-200 p-5 sm:p-6">
                  <Pagination
                    currentPage={recentVisitorsPage}
                    itemLabel="visitors"
                    onPageChange={handleRecentVisitorsPageChange}
                    pageSize={recentVisitorsPageSize}
                    totalItems={trafficData.visits.length}
                  />
                </div>
              </section>
            </div>
          ) : page === 'content' ? (
            <div className="max-w-[88rem]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Website Content</p>
              <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">Content Management</h1>
              <a className="mt-3 inline-flex text-sm font-bold text-[#514568] underline underline-offset-4" href="/about-us" target="_blank" rel="noreferrer">View public page ↗</a>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Edit About Us page copy section by section. The public page keeps its existing layout and images while
                saved changes appear on the public page. Process steps are edited under Who We Are.
              </p>

              <div className="mt-8 grid gap-5 lg:grid-cols-[16rem_1fr]">
                <nav className="grid content-start gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/80" aria-label="About page sections">
                  {contentSections.map((section) => (
                    <button
                      key={section.id}
                      className={`rounded-md px-3 py-3 text-left text-sm font-black transition ${
                        section.id === activeSectionId
                          ? 'admin-brand-surface text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                      }`}
                      type="button"
                      onClick={() => setActiveSectionId(section.id)}
                    >
                      {section.title || section.id}
                    </button>
                  ))}
                </nav>

                {activeSection ? (
                  <form
                    className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/80 sm:p-6"
                    onSubmit={handleContentSubmit}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5a5073]">{activeSection.id}</p>
                        <h2 className="mt-1 text-2xl font-black text-slate-950">{activeSection.title}</h2>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        {activeSection.type}
                      </span>
                    </div>

                    {activeSection.type !== 'metrics' ? <label className="grid gap-2">
                      <span className="text-sm font-bold text-slate-800">Section Title</span>
                      <input
                        className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                        name="title"
                        value={activeSection.title || ''}
                        onChange={handleSectionFieldChange}
                      />
                    </label> : null}

                    {Array.isArray(activeSection.paragraphs) ? (
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-800">Paragraphs</span>
                        <textarea
                          className="min-h-36 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                          name="paragraphs"
                          value={linesToText(activeSection.paragraphs)}
                          onChange={handleSectionFieldChange}
                        />
                        <span className="text-xs font-semibold text-slate-500">Put each paragraph on its own line.</span>
                      </label>
                    ) : null}

                    {'intro' in activeSection ? (
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-800">Intro</span>
                        <textarea
                          className="min-h-24 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                          name="intro"
                          value={activeSection.intro || ''}
                          onChange={handleSectionFieldChange}
                        />
                      </label>
                    ) : null}

                    {'outro' in activeSection ? (
                      <label className="grid gap-2">
                        <span className="text-sm font-bold text-slate-800">Outro</span>
                        <textarea
                          className="min-h-20 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                          name="outro"
                          value={activeSection.outro || ''}
                          onChange={handleSectionFieldChange}
                        />
                      </label>
                    ) : null}

                    {activeSection.highlightStatement?.problemSection?.solutionSection ? (
                      <ProcessContentEditor
                        process={activeSection.highlightStatement.problemSection.solutionSection}
                        onChange={(process) => updateActiveSection((section) => ({
                          ...section,
                          highlightStatement: {
                            ...section.highlightStatement,
                            problemSection: { ...section.highlightStatement.problemSection, solutionSection: process }
                          }
                        }))}
                      />
                    ) : null}

                    {Array.isArray(activeSection.cards) ? (
                      <div className="grid gap-3">
                        <p className="text-sm font-bold text-slate-800">Cards</p>
                        {activeSection.cards.map((card, index) => (
                          <div key={`${activeSection.id}-card-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <input
                              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#817391]"
                              value={card.title || ''}
                              onChange={(event) => handleCardChange(index, 'title', event.target.value)}
                              placeholder="Card title"
                            />
                            <textarea
                              className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391]"
                              value={card.description || ''}
                              onChange={(event) => handleCardChange(index, 'description', event.target.value)}
                              placeholder="Card description"
                            />
                            <label className="grid gap-2 text-sm font-bold text-slate-800">
                              Capability tags
                              <textarea
                                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-950"
                                value={(card.tags || []).join('\n')}
                                onChange={(event) => handleCardChange(index, 'tags', event.target.value.split('\n'))}
                                placeholder="One tag per line"
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(activeSection.items) ? (
                      <div className="grid gap-3">
                        <p className="text-sm font-bold text-slate-800">Cards</p>
                        {activeSection.items.map((item, index) => (
                          <div key={`${activeSection.id}-metric-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr]">
                            <input
                              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#817391]"
                              value={item.value || ''}
                              onChange={(event) => handleMetricChange(index, 'value', event.target.value)}
                              placeholder="Value"
                            />
                            <input
                              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none focus:border-[#817391]"
                              value={item.label || ''}
                              onChange={(event) => handleMetricChange(index, 'label', event.target.value)}
                              placeholder="Label"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(activeSection.members) ? (
                      <div className="grid gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-800">
                            {activeSection.id === 'business-partner' ? 'Strategic Partners' : 'Members'}
                          </p>
                          <button
                            className="h-10 rounded-md border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 shadow-sm transition hover:border-[#b9adc7] hover:text-[#514568]"
                            type="button"
                            onClick={handleAddMember}
                          >
                            {activeSection.id === 'business-partner' ? 'Add Partner' : 'Add Member'}
                          </button>
                        </div>
                        {activeSection.members.map((member, index) => (
                          <div key={`${activeSection.id}-member-${index}`} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-3">
                              {(() => {
                                const previewImage = member.image || member.previewImage;
                                const previewKey = `${activeSectionId}-${index}`;

                                return previewImage && brokenPreviewImages[previewKey] !== previewImage ? (
                                <img
                                  className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
                                  src={getPreviewImageUrl(previewImage)}
                                  alt={`${member.name || 'Team member'} preview`}
                                  onError={(event) => {
                                    setBrokenPreviewImages((current) => ({
                                      ...current,
                                      [previewKey]: previewImage
                                    }));
                                  }}
                                />
                                ) : (
                                <span className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                                  Photo
                                </span>
                                );
                              })()}
                              <div className="grid gap-1">
                                <label className="inline-flex h-10 cursor-pointer items-center rounded-md admin-brand-surface px-4 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm transition hover:bg-blue-950">
                                  {uploadingMemberKey === `${activeSectionId}-${index}` ? 'Uploading...' : 'Upload Photo'}
                                  <input
                                    className="sr-only"
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingMemberKey === `${activeSectionId}-${index}`}
                                    onChange={(event) => {
                                      const file = event.target.files?.[0];
                                      handleMemberPhotoUpload(index, file);
                                      event.target.value = '';
                                    }}
                                  />
                                </label>
                                <span className="text-xs font-semibold text-slate-500">
                                  Images are converted to WebP automatically.
                                </span>
                              </div>
                              </div>
                              <button
                                className="h-10 rounded-md border border-rose-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50"
                                type="button"
                                onClick={() => handleRemoveMember(index)}
                              >
                                Remove
                              </button>
                            </div>
                            <input
                              className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-[#817391]"
                              value={member.name || ''}
                              onChange={(event) => handleMemberChange(index, 'name', event.target.value)}
                              placeholder="Member name"
                            />
                            <textarea
                              className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391]"
                              value={member.role || ''}
                              onChange={(event) => handleMemberChange(index, 'role', event.target.value)}
                              placeholder="Member role"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <details className="rounded-lg border border-slate-200 p-4">
                    <summary className="cursor-pointer text-sm font-bold text-slate-600">Advanced settings</summary>
                    <label className="mt-4 grid gap-2">
                      <span className="text-sm font-bold text-slate-800">Advanced Section JSON</span>
                      <textarea
                        className="min-h-56 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-5 text-slate-800 outline-none focus:border-[#817391]"
                        value={advancedJson}
                        onChange={(event) => setAdvancedJson(event.target.value)}
                        spellCheck="false"
                      />
                      <span className="text-xs font-semibold text-slate-500">
                        Edit the full saved section only when you need fields outside the form.
                      </span>
                    </label>

                    </details>
                    <button
                      className="h-12 rounded-md admin-brand-surface px-5 text-sm font-black text-white shadow-lg shadow-slate-300/80 transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-60"
                      type="submit"
                      disabled={status.type === 'loading'}
                    >
                      {status.type === 'loading' ? 'Saving...' : 'Save Section'}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          ) : page === 'knowledge-base' ? (
            <div className="w-full">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">AI Chat</p>
              <h1 className="mt-3 whitespace-nowrap text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                Chat Knowledge Base
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Manage the questions, answers, keywords, and FAQ items used by the public chat assistant without
                editing the source code.
              </p>

              <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,46rem)_minmax(0,1fr)]">
                <form
                  className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/80 sm:p-6"
                  onSubmit={handleKnowledgeSubmit}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5a5073]">
                        {knowledgeDraft.id ? 'Editing Entry' : 'New Entry'}
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-slate-950">
                        {knowledgeDraft.id ? knowledgeDraft.question || 'Knowledge Entry' : 'Add Knowledge'}
                      </h2>
                    </div>
                    {knowledgeDraft.id ? (
                      <button
                        className="h-10 rounded-md border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition hover:bg-slate-100"
                        type="button"
                        onClick={resetKnowledgeDraft}
                      >
                        Cancel Edit
                      </button>
                    ) : null}
                  </div>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-800">Question / FAQ Label</span>
                    <input
                      className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                      name="question"
                      value={knowledgeDraft.question}
                      onChange={handleKnowledgeDraftChange}
                      placeholder="What services do you offer?"
                      required
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-800">Answer</span>
                    <textarea
                      className="min-h-44 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                      name="answer"
                      value={knowledgeDraft.answer}
                      onChange={handleKnowledgeDraftChange}
                      placeholder="Write the answer the assistant should send."
                      required
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      Start a line with "- " when you want the chat bubble to display bullets.
                    </span>
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-bold text-slate-800">Keywords</span>
                    <textarea
                      className="min-h-24 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                      name="keywords"
                      value={knowledgeDraft.keywords}
                      onChange={handleKnowledgeDraftChange}
                      placeholder="services, offer, custom software, web platform"
                      required
                    />
                    <span className="text-xs font-semibold text-slate-500">
                      Add words or phrases users might type. Separate them with commas or spaces.
                    </span>
                  </label>

                  <div className="grid gap-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-end">
                    <label className="grid gap-2">
                      <span className="flex items-center justify-between gap-3 text-sm font-bold text-slate-800">
                        Priority
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
                          {knowledgeDraft.priority}
                        </span>
                      </span>
                      <input
                        className="h-12 w-full cursor-pointer accent-blue-600"
                        max="10"
                        min="0"
                        name="priority"
                        step="5"
                        type="range"
                        value={knowledgeDraft.priority}
                        onChange={handleKnowledgeDraftChange}
                      />
                      <span className="flex justify-between text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        <span>0</span>
                        <span>5</span>
                        <span>10</span>
                      </span>
                    </label>

                    <div className="rounded-md border border-[#e6e0ec] bg-[#f4f1f7] px-4 py-3 text-xs font-semibold leading-5 text-slate-700">
                      <span className="block font-black uppercase tracking-[0.12em] text-[#514568]">Priority Guide</span>
                      <span className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-black text-emerald-800">
                          10 Important
                        </span>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 font-black text-amber-800">
                          5 Normal
                        </span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 font-black text-slate-700">
                          0 Low
                        </span>
                      </span>
                      <span className="mt-2 block">Higher numbers show first in chat matching and FAQ order.</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4">
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-[#5a5073] focus:ring-[#817391]"
                        name="isActive"
                        type="checkbox"
                        checked={knowledgeDraft.isActive}
                        onChange={handleKnowledgeDraftChange}
                      />
                      <span className="text-sm font-bold text-slate-800">Active in chat answers</span>
                    </label>

                    <label className="flex min-h-12 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4">
                      <input
                        className="h-4 w-4 rounded border-slate-300 text-[#5a5073] focus:ring-[#817391]"
                        name="showInFaq"
                        type="checkbox"
                        checked={knowledgeDraft.showInFaq}
                        onChange={handleKnowledgeDraftChange}
                      />
                      <span className="text-sm font-bold text-slate-800">Show in Frequently Asked</span>
                    </label>
                  </div>

                  <button
                    className="h-12 rounded-md admin-brand-surface px-5 text-sm font-black text-white shadow-lg shadow-slate-300/80 transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-60"
                    type="submit"
                    disabled={status.type === 'loading'}
                  >
                    {status.type === 'loading'
                      ? 'Saving...'
                      : knowledgeDraft.id
                        ? 'Save Knowledge Entry'
                        : 'Add Knowledge Entry'}
                  </button>
                </form>

                <aside className="grid content-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/80">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Entries</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">{knowledgeEntries.length} KB Items</h2>
                  </div>

                  <div
                    className="grid max-h-[42rem] gap-3 overflow-y-auto pr-1 [scrollbar-color:rgba(34,211,238,0.55)_rgba(226,232,240,0.9)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/60 [&::-webkit-scrollbar-thumb:hover]:bg-cyan-500"
                    ref={knowledgeEntriesListRef}
                  >
                    {paginatedKnowledgeEntries.map((entry, index) => (
                      <article
                        className={`rounded-lg border p-3 ${
                          entry.id === knowledgeDraft.id
                            ? 'border-[#b9adc7] bg-[#f4f1f7]'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                        key={entry.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                              {(knowledgeEntriesPage - 1) * knowledgeEntriesPageSize + index + 1}
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-black text-slate-950">{entry.question}</h3>
                              <p className="mt-1 text-xs font-semibold text-slate-500">Priority {entry.priority || 0}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                                entry.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {entry.isActive ? 'Chat' : 'Off'}
                            </span>
                            <span
                              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                                entry.showInFaq === false
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-blue-100 text-[#514568]'
                              }`}
                            >
                              {entry.showInFaq === false ? 'No FAQ' : 'FAQ'}
                            </span>
                          </div>
                        </div>
                        <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{entry.answer}</p>
                        <div className="mt-3 flex gap-2">
                          <button
                            className="h-9 flex-1 rounded-md border border-slate-200 bg-white text-xs font-black uppercase tracking-[0.1em] text-slate-700 transition hover:border-[#b9adc7] hover:text-[#514568]"
                            type="button"
                            onClick={() => handleEditKnowledge(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="h-9 flex-1 rounded-md border border-rose-200 bg-white text-xs font-black uppercase tracking-[0.1em] text-rose-700 transition hover:bg-rose-50"
                            type="button"
                            onClick={() => setKnowledgeDeleteTarget(entry)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}

                    {!knowledgeEntries.length ? (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                        No knowledge entries yet.
                      </div>
                    ) : null}
                  </div>

                  <Pagination
                    currentPage={knowledgeEntriesPage}
                    itemLabel="KB items"
                    onPageChange={handleKnowledgeEntriesPageChange}
                    pageSize={knowledgeEntriesPageSize}
                    totalItems={knowledgeEntries.length}
                  />
                </aside>
              </div>
            </div>
          ) : page === 'billing' ? <div><header className="mb-8"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sales workspace</p><h1 className="mt-3 text-4xl font-bold">Billing</h1></header><BillingPanel token={token} /></div> : ['clients', 'add-client'].includes(page) ? <ClientRecordsPanel token={token} initialAdd={page === 'add-client'} /> : page === 'contracts' ? <ContractsPanel token={token} /> : ['quotations', 'quotation-list'].includes(page) ? (
            <QuotationsPanel token={token} initialTab={page === 'quotation-list' ? 'list' : 'create'} />
          ) : (
          <div className="max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Microsoft Graph</p>
            <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">Mail Configuration</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Save the Microsoft credentials used by the website contact form. The client secret value is write-only:
              leave it blank to keep the current saved secret.
            </p>

            <div
              className={`mt-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
                expiryStatus.type === 'error'
                  ? 'border-rose-300 bg-rose-50 text-rose-900'
                  : expiryStatus.type === 'warning'
                    ? 'border-amber-300 bg-amber-50 text-amber-900'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-900'
              }`}
              role="status"
            >
              <span>{expiryStatus.message}</span>
              <a
                className="ml-2 inline-flex font-black text-[#514568] underline underline-offset-4 transition hover:text-blue-950"
                href={entraClientSecretUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open Microsoft Entra
              </a>
            </div>

            <form
              className="mt-8 grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/80 sm:p-6"
              onSubmit={handleSubmit}
            >
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">Tenant ID</span>
                <input
                  className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                  name="tenantId"
                  value={config.tenantId}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">Client ID</span>
                <input
                  className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                  name="clientId"
                  value={config.clientId}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">
                  Client Secret {config.hasClientSecret ? '(leave blank to keep saved secret)' : ''}
                </span>
                <input
                  className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                  name="clientSecret"
                  value={config.clientSecret}
                  onChange={handleChange}
                  type="password"
                  autoComplete="new-password"
                  required={!config.hasClientSecret}
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-800">Sender Email</span>
                  <input
                    className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                    name="senderEmail"
                    value={config.senderEmail}
                    onChange={handleChange}
                    type="email"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-bold text-slate-800">Recipient Email</span>
                  <input
                    className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                    name="recipientEmail"
                    value={config.recipientEmail}
                    onChange={handleChange}
                    type="email"
                    required
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">Client Secret Expiration Date</span>
                <input
                  className="h-12 rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none focus:border-[#817391] focus:bg-white"
                  name="secretExpiresAt"
                  value={config.secretExpiresAt}
                  onChange={handleChange}
                  type="date"
                />
              </label>

              <button
                className="h-12 rounded-md admin-brand-surface px-5 text-sm font-black text-white shadow-lg shadow-slate-300/80 transition hover:bg-blue-950 disabled:cursor-wait disabled:opacity-60"
                type="submit"
                disabled={status.type === 'loading'}
              >
                {status.type === 'loading' ? 'Saving...' : 'Save Mail Config'}
              </button>

            </form>
          </div>
          )}
        </section>
      </div>
      <Toast
        type={toast.type}
        message={toast.message}
        onClose={() =>
          setToast({
            type: 'info',
            message: ''
          })
        }
      />
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Sign Out?"
        message="You will need to sign in again before changing admin settings."
        cancelLabel="Stay Signed In"
        confirmLabel="Sign Out"
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
      />
      <ConfirmModal
        isOpen={Boolean(knowledgeDeleteTarget)}
        title="Delete KB Entry?"
        message={`This will remove "${knowledgeDeleteTarget?.question || 'this knowledge entry'}" from the chat knowledge base.`}
        cancelLabel="Keep Entry"
        confirmLabel="Delete Entry"
        onCancel={() => setKnowledgeDeleteTarget(null)}
        onConfirm={confirmDeleteKnowledge}
      />
    </main>
  );
}

export default AdminDashboardPage;
