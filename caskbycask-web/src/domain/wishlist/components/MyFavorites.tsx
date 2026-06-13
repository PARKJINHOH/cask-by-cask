import { useState } from 'react'
import MyWishlist from './MyWishlist'
import MyScrappedPosts from '@/domain/community/components/MyScrappedPosts'

type SubTab = 'spirit' | 'post'

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'spirit', label: '주류' },
  { value: 'post',   label: '게시판' },
]

export default function MyFavorites() {
  const [subTab, setSubTab] = useState<SubTab>('spirit')

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-neutral-100 rounded-lg p-1 w-fit">
        {SUB_TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSubTab(value)}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              subTab === value
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'spirit' && <MyWishlist />}
      {subTab === 'post'   && <MyScrappedPosts />}
    </div>
  )
}
