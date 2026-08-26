import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { translationApi } from '../api/translationApi'
import type { TranslationLanguage, TranslationResourceType } from '../types/translation.types'

export function useContentTranslation(resourceType: TranslationResourceType, resourceId: number) {
  const { i18n } = useTranslation()
  const targetLanguage: TranslationLanguage =
    (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en') ? 'en' : 'ko'
  const [showTranslated, setShowTranslated] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const requestIdentity = `${resourceType}:${resourceId}:${targetLanguage}`
  const activeRequestIdentity = useRef(requestIdentity)
  activeRequestIdentity.current = requestIdentity

  const query = useQuery({
    queryKey: ['content-translation', resourceType, resourceId, targetLanguage],
    queryFn: () => translationApi.translate(resourceType, resourceId, targetLanguage),
    enabled: false,
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  useEffect(() => {
    setShowTranslated(false)
    setHasAttempted(false)
  }, [resourceId, resourceType, targetLanguage])

  const toggle = async () => {
    if (showTranslated) {
      setShowTranslated(false)
      return
    }
    if (query.data) {
      setShowTranslated(true)
      return
    }
    setHasAttempted(true)
    const startedFor = requestIdentity
    const result = await query.refetch()
    if (result.data && activeRequestIdentity.current === startedFor) setShowTranslated(true)
  }

  return {
    targetLanguage,
    fields: showTranslated ? query.data?.fields : undefined,
    showTranslated,
    isLoading: query.isFetching,
    error: hasAttempted ? query.error : null,
    toggle,
  }
}
