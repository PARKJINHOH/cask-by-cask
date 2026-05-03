import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from '@/locales/ko.json'
import en from '@/locales/en.json'

const LANG_KEY = 'di_lang'
const SUPPORTED = ['ko', 'en']

function detectLang(): string {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved && SUPPORTED.includes(saved)) return saved
  const browser = navigator.language.startsWith('ko') ? 'ko' : 'en'
  return browser
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
    lng: detectLang(),
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  })

export default i18n
