import React, { createContext, useContext, useState } from 'react';
import {
  translations,
  translateCropName,
  translateCropDescription,
  translateUnit,
  translateLocationText,
  translateFarmerName
} from '../i18n/translations';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('agri_lang') || 'en';
  });

  const setLanguage = (lang) => {
    if (translations[lang]) {
      setLanguageState(lang);
      localStorage.setItem('agri_lang', lang);
    }
  };

  const t = (key) => {
    if (!key) return '';
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    if (language === 'te') {
      const teCrop = translateCropName(key, 'te');
      if (teCrop !== key) return teCrop;
    }
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return key;
  };

  const tCropName = (name) => translateCropName(name, language);
  const tCropDesc = (description, name, category) =>
    translateCropDescription(description, name, category, language);
  const tUnit = (unit) => translateUnit(unit, language);
  const tLocation = (locStr) => translateLocationText(locStr, language);
  const tFarmer = (name) => translateFarmerName(name, language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        tCropName,
        tCropDesc,
        tUnit,
        tLocation,
        tFarmer
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
