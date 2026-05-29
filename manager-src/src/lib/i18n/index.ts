import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import es from './locales/es.json'
import pt from './locales/pt.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'es',
    supportedLngs: ['es', 'pt'],
    resources: {
      es: { translation: es },
      pt: { translation: pt },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wago.lang',
      caches: ['localStorage'],
    },
  })

export default i18n
