
import React, { useState, useRef, useCallback, useEffect } from 'react';
import InfographicCard from '../components/InfographicCard';
import LiveChat from './components/LiveChat';
import PrincipleDetailPopover from './components/PrincipleDetailPopover';
import LiveDeepDiveChat from './components/LiveDeepDiveChat';
import { Principle, AIStudio } from './types'; // Import AIStudio interface
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// Define chat modes
type ChatMode = 'none' | 'live' | 'deepDive';

// Main App component wrapper with LanguageProvider
function AppWrapper() {
  const { language, setLanguage, t, getPrinciples } = useLanguage();

  const [activeChatMode, setActiveChatMode] = useState<ChatMode>('none');
  const [activeDeepDivePrinciple, setActiveDeepDivePrinciple] = useState<Principle | null>(null);
  const [hoveredPrincipleInfo, setHoveredPrincipleInfo] = useState<{ principle: Principle, rect: DOMRect } | null>(null);
  const dismissTimeoutRef = useRef<number | null>(null);

  // Function to clear the dismissal timeout
  const clearTimeoutHandler = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
  }, []);

  // Handler for when mouse enters a card
  const handleCardMouseEnter = useCallback((principle: Principle, rect: DOMRect) => {
    // Don't show popover if a chat is active
    if (activeChatMode !== 'none') {
      return;
    }
    clearTimeoutHandler();
    setHoveredPrincipleInfo({ principle, rect });
  }, [clearTimeoutHandler, activeChatMode]);

  // Handler for when mouse leaves a card
  const handleCardMouseLeave = useCallback(() => {
    dismissTimeoutRef.current = window.setTimeout(() => {
      setHoveredPrincipleInfo(null);
      dismissTimeoutRef.current = null;
    }, 100);
  }, []);

  // Handler for when mouse enters the popover
  const handlePopoverMouseEnter = useCallback(() => {
    clearTimeoutHandler();
  }, [clearTimeoutHandler]);

  // Handler for when mouse leaves the popover (or explicit close)
  const handlePopoverMouseLeave = useCallback(() => {
    clearTimeoutHandler();
    setHoveredPrincipleInfo(null);
  }, [clearTimeoutHandler]);

  // Handler to close any active chat
  const handleCloseChat = useCallback(() => {
    setActiveChatMode('none');
    setActiveDeepDivePrinciple(null);
    // Clear any timeout to ensure clean state
    clearTimeoutHandler();
  }, [clearTimeoutHandler]);

  // Handler to open Deep Dive Chat
  const handleOpenDeepDiveChat = useCallback((principle: Principle) => {
    setActiveDeepDivePrinciple(principle);
    setActiveChatMode('deepDive');
    setHoveredPrincipleInfo(null); // Close popover when opening chat
    clearTimeoutHandler();
  }, [clearTimeoutHandler]);

  // Handler to toggle Live Chat (will close any active chat, or start a new live chat)
  const handleToggleLiveChat = useCallback(() => {
    if (activeChatMode !== 'none') {
      handleCloseChat();
    } else {
      setActiveChatMode('live');
      setActiveDeepDivePrinciple(null);
      setHoveredPrincipleInfo(null); // Close popover when opening chat
      clearTimeoutHandler();
    }
  }, [activeChatMode, handleCloseChat, clearTimeoutHandler]);


  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      <header className="text-center mb-10 md:mb-16">
        <div className="fixed top-4 right-4 z-[9999]" role="region" aria-label={t('languageSelectorLabel')}>
          <label htmlFor="language-select" className="sr-only">{t('languageSelectorLabel')}</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')}
            className="bg-blue-50 border-2 border-indigo-300 rounded-md py-2 px-4 shadow-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-indigo-800 font-semibold w-auto min-w-[120px]"
            aria-label={t('languageSelectorLabel')}
          >
            <option value="en">{t('languageEnglish')}</option>
            <option value="zh">{t('languageChinese')}</option>
          </select>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-indigo-800 leading-tight">
          {t('headerTitle')}
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
          {t('appDescription')}
        </p>
      </header>

      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {getPrinciples().map((principle) => (
          <InfographicCard
            key={principle.id}
            principle={principle}
            onMouseEnterCard={handleCardMouseEnter}
            onMouseLeaveCard={handleCardMouseLeave}
          />
        ))}
      </main>

      {/* Unified Chat Section */}
      <section className="mt-16 text-center">
        <button
          onClick={handleToggleLiveChat}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
          aria-expanded={activeChatMode !== 'none'}
          aria-controls="ai-chat-panel"
        >
          {activeChatMode === 'none' ? t('startConversation') : t('closeConversation')}
        </button>
        {(activeChatMode === 'live' || activeChatMode === 'deepDive') && (
          <div id="ai-chat-panel" className="mt-8">
            {activeChatMode === 'live' && (
              <LiveChat onCloseChat={handleCloseChat} />
            )}
            {activeChatMode === 'deepDive' && activeDeepDivePrinciple && (
              <LiveDeepDiveChat
                principle={activeDeepDivePrinciple}
                onClose={handleCloseChat}
              />
            )}
          </div>
        )}
      </section>

      <footer className="mt-16 text-center text-gray-500 text-sm">
        <p>
          {t('copyright')}
        </p>
      </footer>

      {/* Principle Detail Popover */}
      {hoveredPrincipleInfo && (
        <PrincipleDetailPopover
          principleInfo={hoveredPrincipleInfo}
          onMouseEnterPopover={handlePopoverMouseEnter}
          onMouseLeavePopover={handlePopoverMouseLeave}
          onOpenDeepDiveChat={handleOpenDeepDiveChat}
        />
      )}
    </div>
  );
}

function App() {
  const [metadataName, setMetadataName] = useState('Responsible AI Infographic');
  const [metadataDescription, setMetadataDescription] = useState('An interactive infographic showcasing the 8 core principles of Responsible AI.');

  useEffect(() => {
    // Dynamically set document title and meta description from metadata.json via window.aistudio
    const updateMetadata = (lang: string) => {
      // FIX: Explicitly cast window.aistudio to AIStudio to ensure TypeScript recognizes the 'metadata' property.
      // Ensure window.aistudio and its metadata property exist before accessing.
      const aistudio = window.aistudio as AIStudio;
      if (aistudio?.metadata) {
        const metadata = aistudio.metadata;
        const i18nMetadata = metadata.i18n?.[lang];

        if (i18nMetadata) {
          document.title = i18nMetadata.name;
          const metaDescriptionTag = document.querySelector('meta[name="description"]');
          if (metaDescriptionTag) {
            metaDescriptionTag.setAttribute('content', i18nMetadata.description);
          } else {
            const newMetaTag = document.createElement('meta');
            newMetaTag.name = 'description';
            newMetaTag.content = i18nMetadata.description;
            document.head.appendChild(newMetaTag);
          }
          setMetadataName(i18nMetadata.name);
          setMetadataDescription(i18nMetadata.description);
        } else {
          // Fallback to default if no i18n for current language or specific lang not found
          document.title = metadata.name;
          const metaDescriptionTag = document.querySelector('meta[name="description"]');
          if (metaDescriptionTag) {
            metaDescriptionTag.setAttribute('content', metadata.description);
          }
          setMetadataName(metadata.name);
          setMetadataDescription(metadata.description);
        }
      }
    };

    const initialLang = (localStorage.getItem('language') as 'en' | 'zh') || 'en';
    updateMetadata(initialLang);

    // Listen for language changes from LanguageProvider
    const handleStorageChange = () => {
      const storedLang = (localStorage.getItem('language') as 'en' | 'zh') || 'en';
      updateMetadata(storedLang);
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <LanguageProvider>
      <AppWrapper />
    </LanguageProvider>
  );
}

export default App;
    