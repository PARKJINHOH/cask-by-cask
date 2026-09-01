import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import InstagramIcon from '@/shared/components/icons/InstagramIcon'
import ThreadsIcon from '@/shared/components/icons/ThreadsIcon'
import { socialApi } from '@/domain/social/api/socialApi'
import { isOpenablePublication } from '@/domain/social/hooks/useSocialPublications'
import type { SocialPlatform, SocialPublication } from '@/domain/social/types/social.types'

interface Props {
  /** 이 리뷰의 게시 상태. 게시한 적이 없으면 undefined 다. */
  publications?: SocialPublication[]
  className?: string
}

const PLATFORM_ORDER: SocialPlatform[] = ['INSTAGRAM', 'THREADS']

function PlatformIcon({ platform }: { platform: SocialPlatform }) {
  return platform === 'INSTAGRAM' ? <InstagramIcon size={16} /> : <ThreadsIcon size={16} />
}

/**
 * 리뷰 카드에서 그 리뷰로 올린 SNS 게시글로 바로 건너뛴다.
 *
 * 플랫폼마다 하나만 보여 준다 — 게시에 성공한 것이 있으면 그것을 링크하고,
 * 없으면 재시도할 수 있는 실패 건을 보여 준다. 마이페이지의 SNS 게시 이력 탭을 걷어내면서
 * 실패한 게시를 다시 시도할 자리가 여기밖에 남지 않아 재시도 버튼을 함께 둔다.
 */
export default function ReviewSocialLinks({ publications, className = '' }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const retry = useMutation({
    mutationFn: (id: number) => socialApi.retry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-publications', 'sources'] }),
  })

  if (!publications?.length) return null

  const shown = PLATFORM_ORDER.map((platform) => {
    const forPlatform = publications.filter((item) => item.platform === platform)
    return forPlatform.find(isOpenablePublication)
      ?? forPlatform.find((item) => item.canRetry)
      ?? null
  }).filter((item): item is SocialPublication => item !== null)

  if (shown.length === 0) return null

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {shown.map((publication) => (
        isOpenablePublication(publication) ? (
          <a
            key={publication.id}
            href={publication.permalink!}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('social.openPost')}
            title={t('social.openPost')}
            className="inline-flex items-center justify-center rounded-md p-1 text-neutral-500
              transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <PlatformIcon platform={publication.platform} />
          </a>
        ) : (
          <button
            key={publication.id}
            type="button"
            onClick={() => retry.mutate(publication.id)}
            disabled={retry.isPending}
            aria-label={t('social.retry')}
            title={t('social.retry')}
            className="inline-flex items-center justify-center rounded-md p-1 text-neutral-300
              transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <PlatformIcon platform={publication.platform} />
          </button>
        )
      ))}
    </div>
  )
}
