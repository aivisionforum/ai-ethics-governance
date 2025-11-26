import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import en from '../locales/en'; // Changed from '../locales/en.json'
import zh from '../locales/zh'; // Changed from '../locales/zh.json'
// FIX: No need to import AIStudio here; it's declared globally in types.ts

type Locale = typeof en; // Type for the translation data structure

interface LanguageContextType {
  language: 'en' | 'zh';
  setLanguage: (lang: 'en' | 'zh') => void;
  t: (key: string, ...args: (string | number)[]) => string;
  getPrinciples: () => typeof en.RESPONSIBLE_AI_PRINCIPLES;
  getInitialAnnaPrompt: () => string;
  getSystemInstruction: () => string;
  getDeepDiveAnnaPrompt: (principleTitle: string) => string;
  getDeepDiveSystemInstruction: (principleTitle: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const locales: { [key: string]: Locale } = {
  en: en,
  zh: zh,
};

// FIX: Removed declare global for window.aistudio as it's now handled in src/types.ts
// to avoid conflicts and ensure a single global definition.

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'zh'>(() => {
    // Initialize language from localStorage or default to 'en'
    return (localStorage.getItem('language') as 'en' | 'zh') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = useCallback((key: string, ...args: (string | number)[]): string => {
    const currentLocale = locales[language];
    // Safely access nested keys
    const keys = key.split('.');
    let text: string | { [k: string]: any } = currentLocale;
    for (const k of keys) {
      if (typeof text === 'object' && text !== null && k in text) {
        text = text[k];
      } else {
        console.warn(`Translation key "${key}" not found for language "${language}".`);
        return key; // Fallback to key itself
      }
    }
    
    let translatedText = typeof text === 'string' ? text : key;

    // Replace placeholders like {0}, {1} etc.
    args.forEach((arg, index) => {
      translatedText = translatedText.replace(new RegExp(`\\{${index}\\}`, 'g'), String(arg));
    });

    return translatedText;
  }, [language]);

  const setLanguage = useCallback((lang: 'en' | 'zh') => {
    setLanguageState(lang);
  }, []);

  const getPrinciples = useCallback(() => {
    return locales[language].RESPONSIBLE_AI_PRINCIPLES;
  }, [language]);

  const getInitialAnnaPrompt = useCallback(() => {
    return locales[language].initialAnnaPrompt;
  }, [language]);

  const getSystemInstruction = useCallback(() => {
    return locales[language].systemInstruction;
  }, [language]);

  const getDeepDiveAnnaPrompt = useCallback((principleTitle: string) => {
    return t('initialDeepDiveAnnaPrompt', principleTitle);
  }, [t]);

  const getDeepDiveSystemInstruction = useCallback((principleTitle: string) => {
    return t('deepDiveSystemInstruction', principleTitle);
  }, [t]);

  const value = {
    language,
    setLanguage,
    t,
    getPrinciples,
    getInitialAnnaPrompt,
    getSystemInstruction,
    getDeepDiveAnnaPrompt,
    getDeepDiveSystemInstruction,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};