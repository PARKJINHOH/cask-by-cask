import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <SeoMeta title={t('errors.notFound.title')} description={t('errors.notFound.description')} noindex />
      <div className="max-w-md w-full text-center">
        <div className="text-7xl sm:text-8xl font-bold text-amber-600 mb-4 tracking-tight">
          404
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-3">
          {t('errors.notFound.title')}
        </h1>
        <p className="text-neutral-600 mb-8 leading-relaxed">
          {t('errors.notFound.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors"
          >
            {t('errors.notFound.goHome')}
          </Link>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium rounded-lg transition-colors"
          >
            {t('errors.notFound.goBack')}
          </button>
        </div>
      </div>
    </div>
  )
}
