import { useTranslation } from 'react-i18next'
import BoardListPage from './BoardListPage'

export default function FreeBoardPage() {
  const { t } = useTranslation()
  return <BoardListPage boardType="FREE" title={t('menu.communityBoard', '자유게시판')} />
}
