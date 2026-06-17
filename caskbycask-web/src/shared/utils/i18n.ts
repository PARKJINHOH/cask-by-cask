import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from '@/locales/ko.json'
import en from '@/locales/en.json'
import { getLocaleFromUrl, detectDefaultLang } from './locale'

const LANG_KEY = 'di_lang'

function getInitialLang(): string {
  if (window.__APP_LANG__) {
    return window.__APP_LANG__
  }
  
  const { lang } = getLocaleFromUrl(window.location.pathname)
  if (lang) {
    return lang
  }

  return detectDefaultLang()
}

export function saveLang(lang: string) {
  localStorage.setItem(LANG_KEY, lang)
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    lng: getInitialLang(),
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lng)
  }
})

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('lang', i18n.language || 'ko')
}

export default i18n
