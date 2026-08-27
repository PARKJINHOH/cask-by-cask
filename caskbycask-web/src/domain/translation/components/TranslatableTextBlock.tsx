import { useContentTranslation } from '../hooks/useContentTranslation'
import TranslationAction from './TranslationAction'
import type { TranslationResourceType } from '../types/translation.types'

interface TranslatableTextBlockProps {
  resourceType: TranslationResourceType
  resourceId: number
  field: string
  text: string
  textClassName?: string
  className?: string
}

export default function TranslatableTextBlock({
  resourceType,
  resourceId,
  field,
  text,
  textClassName,
  className,
}: TranslatableTextBlockProps) {
  const translation = useContentTranslation(resourceType, resourceId)
  const displayedText = translation.fields?.[field] ?? text
  const shouldShowTranslation = text.trim().length > 0
    && (resourceType !== 'SPIRIT_NOTES' || translation.targetLanguage !== 'ko')

  return (
    <div className={className}>
      <p className={textClassName}>
        {displayedText.trimEnd()}
        <TranslationAction
          hasContent={shouldShowTranslation}
          showTranslated={translation.showTranslated}
          isLoading={translation.isLoading}
          error={translation.error}
          onToggle={translation.toggle}
          compact
        />
      </p>
    </div>
  )
}
