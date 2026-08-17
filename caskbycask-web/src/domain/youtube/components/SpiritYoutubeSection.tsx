import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { youtubeApi } from '../api/youtubeApi'
import YoutubeVideoRail from './YoutubeVideoRail'

interface Props {
  spiritId: number
}

/**
 * 주류 상세의 '관련 영상'.
 *
 * 태그된 영상이 없으면 섹션째 사라진다 — 대부분의 주류에는 아직 태그가 없으므로
 * 빈 껍데기가 상세 페이지에 남으면 곤란하다.
 */
export default function SpiritYoutubeSection({ spiritId }: Props) {
  const { t } = useTranslation()
  const { data: videos = [] } = useQuery({
    queryKey: ['youtubeVideosBySpirit', spiritId],
    queryFn: () => youtubeApi.getVideosBySpirit(spiritId),
    staleTime: 10 * 60_000,
  })

  return (
    <YoutubeVideoRail
      videos={videos}
      heading={t('youtube.relatedVideos')}
      moreTo={`/youtube?spirit=${spiritId}`}
    />
  )
}
