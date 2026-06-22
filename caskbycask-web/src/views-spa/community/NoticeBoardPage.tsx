import { useTranslation } from 'react-i18next'
import BoardListPage from './BoardListPage'

export default function NoticeBoardPage() {
  const { t } = useTranslation()
  return <BoardListPage boardType="NOTICE" title={t('menu.communityNews', '소식')} />
}
