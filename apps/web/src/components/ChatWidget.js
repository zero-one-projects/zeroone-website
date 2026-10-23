import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getApiBaseUrl } from '../utils/apiBaseUrl';

const apiBaseUrl = getApiBaseUrl();
const chatStorageTtlHours = Number(process.env.REACT_APP_CHAT_STORAGE_TTL_HOURS || 24);
const chatStorageTtlMs = Number.isFinite(chatStorageTtlHours) && chatStorageTtlHours > 0
  ? chatStorageTtlHours * 60 * 60 * 1000
  : 24 * 60 * 60 * 1000;
const suggestedQuestions = [
  'How can you help me?',
  'What services do you offer?',
  'How can I start a project?',
  'How can I contact ZeroOne?',
  'Where is ZeroOne based?'
];
const chatMessagesStorageKey = 'zerooneChatMessages';
const chatSessionStorageKey = 'zerooneChatSessionId';
const typingIndicatorDelayMs = 3000;
const typingCharacterDelayMs = 18;
const greetingTokens = new Set([
  'hi',
  'hello',
  'hey',
  'yo',
  'yow',
  'greetings',
  'kumusta',
  'morning',
  'afternoon',
  'evening'
]);
const pixelColors = ['bg-neutral-500', 'bg-neutral-600', 'bg-neutral-500'];
const zeroOnePixelMap = [
  '1110110',
  '1010010',
  '1010010',
  '1010010',
  '1110111'
];
function createInitialMessages() {
  return [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi, I can answer questions from the ZeroOne knowledge base.',
      timestamp: Date.now()
    }
  ];
}

function clearStoredChat() {
  window.localStorage.removeItem(chatMessagesStorageKey);
  window.localStorage.removeItem(chatSessionStorageKey);
  window.sessionStorage.removeItem(chatMessagesStorageKey);
  window.sessionStorage.removeItem(chatSessionStorageKey);
}

function buildStoragePayload(value) {
  return JSON.stringify({
    savedAt: Date.now(),
    ...value
  });
}

function getPayloadSavedAt(payload) {
  if (payload?.savedAt) {
    return payload.savedAt;
  }

  if (payload?.expiresAt) {
    return payload.expiresAt - 24 * 60 * 60 * 1000;
  }

  return null;
}

function isPayloadExpired(payload) {
  const savedAt = getPayloadSavedAt(payload);

  return !savedAt || Date.now() > savedAt + chatStorageTtlMs;
}

function createSessionId() {
  try {
    const storedSession = window.localStorage.getItem(chatSessionStorageKey);

    if (storedSession) {
      const parsedSession = JSON.parse(storedSession);

      if (parsedSession?.sessionId && !isPayloadExpired(parsedSession)) {
        return parsedSession.sessionId;
      }

      clearStoredChat();
    }

    const legacySessionId = window.sessionStorage.getItem(chatSessionStorageKey);

    if (legacySessionId) {
      window.localStorage.setItem(chatSessionStorageKey, buildStoragePayload({ sessionId: legacySessionId }));
      window.sessionStorage.removeItem(chatSessionStorageKey);
      return legacySessionId;
    }
  } catch {
    clearStoredChat();
  }

  const sessionId = `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(chatSessionStorageKey, buildStoragePayload({ sessionId }));
  return sessionId;
}

function loadStoredMessages() {
  try {
    const storedMessages =
      window.localStorage.getItem(chatMessagesStorageKey) || window.sessionStorage.getItem(chatMessagesStorageKey);

    if (!storedMessages) {
      return createInitialMessages();
    }

    const parsedStorage = JSON.parse(storedMessages);
    const isLegacyMessageList = Array.isArray(parsedStorage);
    const parsedMessages = isLegacyMessageList ? parsedStorage : parsedStorage.messages;

    if (!isLegacyMessageList && isPayloadExpired(parsedStorage)) {
      clearStoredChat();
      return createInitialMessages();
    }

    if (!Array.isArray(parsedMessages) || !parsedMessages.length) {
      clearStoredChat();
      return createInitialMessages();
    }

    window.sessionStorage.removeItem(chatMessagesStorageKey);
    return parsedMessages;
  } catch {
    clearStoredChat();
    return createInitialMessages();
  }
}

function saveStoredMessages(messages) {
  window.localStorage.setItem(chatMessagesStorageKey, buildStoragePayload({ messages }));
}

function formatMessageTime(timestamp) {
  if (!timestamp) {
    return '';
  }

  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(messageDate);

  if (messageDate.toDateString() === today.toDateString()) {
    return time;
  }

  if (messageDate.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${time}`;
  }

  return `${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(messageDate)}, ${time}`;
}

function isGreetingMessage(message) {
  return String(message || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .some((word) => greetingTokens.has(word));
}

function createZeroOnePixels() {
  return zeroOnePixelMap.flatMap((row, rowIndex) =>
    [...row].map((cell, columnIndex) => ({
      id: `pixel-${Date.now()}-${rowIndex}-${columnIndex}-${Math.random().toString(16).slice(2)}`,
      active: cell === '1',
      color: pixelColors[Math.floor(Math.random() * pixelColors.length)],
      opacity: 0.55 + Math.random() * 0.35
    }))
  );
}

function createResponsePixels() {
  return {
    type: 'zero-one',
    cells: createZeroOnePixels()
  };
}

function normalizeResponsePixels(pixels) {
  if (Array.isArray(pixels)) {
    return pixels.map((pixel, index) => ({
      id: pixel.id || `legacy-pixel-${index}`,
      active: true,
      color: pixel.color || pixelColors[index % pixelColors.length],
      opacity: pixel.opacity || 0.7
    }));
  }

  return Array.isArray(pixels?.cells) ? pixels.cells : [];
}

function renderResponsePixels(pixels) {
  const cells = normalizeResponsePixels(pixels);

  if (!cells.length) {
    return null;
  }

  return (
    <div
      className="mt-3 grid w-max grid-cols-7 gap-1 rounded-md border border-neutral-100 bg-white p-1.5 shadow-sm shadow-neutral-950/10"
      aria-hidden="true"
    >
      {cells.map((pixel) => (
        <span
          className={`h-3 w-3 rounded-[2px] ${
            pixel.active ? `${pixel.color} shadow-none` : 'bg-transparent'
          }`}
          key={pixel.id}
          style={{
            opacity: pixel.active ? pixel.opacity : 1
          }}
        />
      ))}
    </div>
  );
}

function renderMessageText(text) {
  const lines = String(text || '').split('\n');
  const hasList = lines.some((line) => line.trim().startsWith('- '));

  if (!hasList) {
    return <p>{text}</p>;
  }

  return (
    <div className="grid gap-2">
      {lines.map((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.startsWith('- ')) {
          return (
            <div className="flex gap-2" key={`${line}-${index}`}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-600" aria-hidden="true" />
              <span>{trimmedLine.slice(2)}</span>
            </div>
          );
        }

        return trimmedLine ? <p key={`${line}-${index}`}>{trimmedLine}</p> : null;
      })}
    </div>
  );
}

function ChatWidget() {
  const faqRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldScrollToFaqRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTypingAnswer, setIsTypingAnswer] = useState(false);
  const [isFaqExpanded, setIsFaqExpanded] = useState(true);
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [faqQuestions, setFaqQuestions] = useState(suggestedQuestions);

  const loadFaqQuestions = useCallback(async (isMounted = () => true) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/faqs?limit=5&t=${Date.now()}`, {
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !Array.isArray(payload?.questions)) {
        return;
      }

      const questions = payload.questions
        .map((item) => item?.question)
        .filter((question) => typeof question === 'string' && question.trim());

      if (isMounted()) {
        setFaqQuestions(questions);
      }
    } catch {
      if (isMounted()) {
        setFaqQuestions(suggestedQuestions);
      }
    }
  }, []);

  useEffect(() => {
    saveStoredMessages(messages);
  }, [messages]);

  useEffect(() => {
    let isMounted = true;

    loadFaqQuestions(() => isMounted);

    return () => {
      isMounted = false;
    };
  }, [loadFaqQuestions]);

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      loadFaqQuestions(() => isMounted);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, loadFaqQuestions]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: 'auto',
      block: 'end'
    });
  }, [isOpen, isSending, messages]);

  useEffect(() => {
    if (!isFaqExpanded || !shouldScrollToFaqRef.current) {
      return;
    }

    shouldScrollToFaqRef.current = false;
    requestAnimationFrame(() => {
      faqRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
      });
    });
  }, [isFaqExpanded]);

  useEffect(() => {
    document.body.classList.toggle('chat-widget-open', isOpen);

    return () => {
      document.body.classList.remove('chat-widget-open');
    };
  }, [isOpen]);

  async function typeAssistantAnswer(answer, options = {}) {
    const messageId = `assistant-${Date.now()}`;

    setIsTypingAnswer(true);
    setMessages((current) => [
      ...current,
      {
        id: messageId,
        role: 'assistant',
        text: '',
        timestamp: Date.now(),
        pixels: options.showPixels ? createResponsePixels() : null
      }
    ]);

    for (let index = 1; index <= answer.length; index += 1) {
      await new Promise((resolve) => setTimeout(resolve, typingCharacterDelayMs));
      const partialAnswer = answer.slice(0, index);

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                text: partialAnswer
              }
            : message
        )
      );
    }

    setIsTypingAnswer(false);
  }

  async function sendMessage(message) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isSending) {
      return;
    }

    if (inputRef.current) {
      inputRef.current.value = '';
    }

    setIsSending(true);
    setIsFaqExpanded(false);
    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmedMessage,
        timestamp: Date.now()
      }
    ]);

    try {
      const response = await fetch(`${apiBaseUrl}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          message: trimmedMessage
        })
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Chat is unavailable right now.');
      }

      await new Promise((resolve) => setTimeout(resolve, typingIndicatorDelayMs));
      await typeAssistantAnswer(payload.answer, {
        showPixels: isGreetingMessage(trimmedMessage)
      });
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, typingIndicatorDelayMs));
      await typeAssistantAnswer(error instanceof Error ? error.message : 'Chat is unavailable right now.', {
        showPixels: isGreetingMessage(trimmedMessage)
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await sendMessage(inputRef.current?.value || '');
  }

  function handleClearChat() {
    clearStoredChat();
    setMessages(createInitialMessages());
    setSessionId(createSessionId());
    setIsFaqExpanded(true);
    inputRef.current?.focus();
  }

  async function handleSuggestedQuestion(question) {
    await sendMessage(question);
  }

  function handleToggleFaq() {
    setIsFaqExpanded((current) => {
      const nextIsExpanded = !current;
      shouldScrollToFaqRef.current = nextIsExpanded;
      return nextIsExpanded;
    });
  }

  const widget = (
    <div className="chat-widget fixed bottom-5 right-5 z-[120] flex flex-col items-end gap-4">
      {isOpen ? (
        <section className="chat-widget-panel w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden rounded-lg border border-white/15 bg-neutral-950 text-neutral-100 shadow-none ring-1 ring-neutral-950/10 backdrop-blur-xl">
          <header className="flex items-center justify-between border-b border-white/10 bg-neutral-900 px-4 py-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-100">ZeroOne Chat</p>
              <p className="text-sm text-neutral-300/90">AI Assistant</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 text-xs font-bold uppercase tracking-[0.08em] text-neutral-50 shadow-sm shadow-neutral-950/20 transition hover:border-white/30 hover:bg-white/15 hover:text-white disabled:cursor-wait disabled:opacity-50"
                type="button"
                onClick={handleClearChat}
                disabled={isSending || isTypingAnswer}
                aria-label="Clear chat history"
                title="Clear chat history"
              >
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m4 16 8-8 6 6-5 5H7l-3-3Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M13 19h7M9 11l4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                Clear
              </button>
              <button
                className="grid h-9 w-9 place-items-center rounded-md border border-white/15 bg-white/10 text-neutral-200 shadow-sm shadow-neutral-950/20 transition hover:border-white/30 hover:bg-white/15 hover:text-white"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                x
              </button>
            </div>
          </header>

          <div className="flex h-96 flex-col gap-3 overflow-y-auto bg-neutral-950 px-4 py-4 [scrollbar-color:#525252_#171717] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-neutral-900 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-white [&::-webkit-scrollbar-thumb]:bg-neutral-800/60 [&::-webkit-scrollbar-thumb:hover]:bg-neutral-900/75">
            {messages.map((message) => (
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-white text-neutral-950 shadow-neutral-950/20'
                    : 'mr-auto border border-white/15 bg-neutral-900 text-neutral-200 shadow-none ring-1 ring-white/10'
                }`}
                key={message.id}
              >
                {renderMessageText(message.text)}
                {message.timestamp ? (
                  <time
                    className={`mt-1 block text-[10px] leading-none ${
                      message.role === 'user' ? 'text-neutral-600' : 'text-neutral-400'
                    }`}
                    dateTime={new Date(message.timestamp).toISOString()}
                  >
                    {formatMessageTime(message.timestamp)}
                  </time>
                ) : null}
                {message.role === 'assistant' ? renderResponsePixels(message.pixels) : null}
              </div>
            ))}
            {isSending && !isTypingAnswer ? (
              <div className="mr-auto flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-900 px-3 py-3 text-sm text-neutral-200 shadow-none ring-1 ring-white/10">
                <span>Typing</span>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-[chatTypingBounce_1.15s_ease-in-out_infinite] rounded-full bg-neutral-600" />
                  <span className="h-1.5 w-1.5 animate-[chatTypingBounce_1.15s_ease-in-out_infinite] rounded-full bg-neutral-600 [animation-delay:0.16s]" />
                  <span className="h-1.5 w-1.5 animate-[chatTypingBounce_1.15s_ease-in-out_infinite] rounded-full bg-neutral-600 [animation-delay:0.32s]" />
                </span>
              </div>
            ) : null}
            <div className="mr-auto grid w-full gap-2 pt-1" ref={faqRef}>
              <button
                className="flex w-full items-center justify-between rounded-md border border-white/15 bg-neutral-900 px-3 py-2 text-left text-xs font-bold uppercase tracking-[0.14em] text-neutral-100 shadow-sm shadow-neutral-950/5 ring-1 ring-white/10 transition hover:bg-neutral-800"
                type="button"
                onClick={handleToggleFaq}
                aria-expanded={isFaqExpanded}
              >
                <span>Frequently Asked</span>
                <span className="text-base leading-none" aria-hidden="true">
                  {isFaqExpanded ? '-' : '+'}
                </span>
              </button>
              {isFaqExpanded ? (
                <div className="grid justify-items-start gap-2">
                  {faqQuestions.map((question) => (
                    <button
                      className="w-fit rounded-full border border-white/15 bg-neutral-900 px-3 py-2 text-left text-xs font-semibold text-neutral-200 shadow-none ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:text-neutral-100 disabled:cursor-wait disabled:opacity-60"
                      key={question}
                      type="button"
                      onClick={() => handleSuggestedQuestion(question)}
                      disabled={isSending}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <form className="flex items-center gap-2 border-t border-white/10 bg-neutral-900 p-3 shadow-none backdrop-blur-md" onSubmit={handleSubmit}>
            <input
              className="chat-message-input h-12 min-w-0 flex-1 rounded-md border border-white/15 bg-neutral-950 px-4 text-sm leading-none text-neutral-100 shadow-none outline-none ring-1 ring-white/10 transition placeholder:text-neutral-500 focus:border-neutral-200 focus:ring-2 focus:ring-neutral-300"
              type="text"
              ref={inputRef}
              placeholder="Ask about services..."
              aria-label="Chat message"
            />
            <button
              className="h-12 shrink-0 rounded-md bg-white px-5 text-sm font-bold text-neutral-950 shadow-lg shadow-neutral-950/25 transition hover:-translate-y-0.5 hover:shadow-neutral-950/30 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={isSending}
            >
              Send
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="flex h-12 items-center gap-2.5 rounded-full border border-neutral-200/20 bg-white px-4 text-sm font-bold text-neutral-950 shadow-xl shadow-neutral-950/40 transition hover:-translate-y-0.5 hover:bg-neutral-200"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="Open chat"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">AI</span>
        Chat
      </button>
    </div>
  );

  return createPortal(widget, document.body);
}

export default ChatWidget;
