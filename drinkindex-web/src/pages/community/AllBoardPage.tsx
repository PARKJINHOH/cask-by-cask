import { useTranslation } from 'react-i18next'
import BoardListPage from './BoardListPage'

export default function AllBoardPage() {
  const { t } = useTranslation()
  return <BoardListPage title={t('menu.communityAll')} />
}
