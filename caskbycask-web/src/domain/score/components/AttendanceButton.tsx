import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { scoreApi } from '../api/scoreApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useState } from 'react'

const getTodayDateString = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AttendanceButton() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isLoggedIn, isAuthReady, setPendingAttendanceToast } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const [showTooltip, setShowTooltip] = useState(() => {
    const dismissedDate = localStorage.getItem('attendance_tooltip_dismissed_date')
    return dismissedDate !== getTodayDateString()
  })

  const { data: attended = false, isPending } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => scoreApi.getTodayAttendanceStatus().then((res) => res.data.data ?? false),
    enabled: isAuthReady && isLoggedIn,
  })

  const { mutate: checkIn } = useMutation({
    mutationFn: () => scoreApi.checkAttendance().then((res) => res.data.data!),
    onMutate: () => {
      setLoading(true)
    },
    onSuccess: (data) => {
      if (data && !data.alreadyChecked) {
        setPendingAttendanceToast(data)
      }
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      queryClient.invalidateQueries({ queryKey: ['scoreHistory', 'me'] })
    },
    onSettled: () => {
      setLoading(false)
    },
  })

  if (!isAuthReady || !isLoggedIn) return null

  return (
    <div className={`relative inline-flex items-center ${isPending ? 'invisible' : ''}`}>
      <button
        type="button"
        onClick={() => !attended && !loading && checkIn()}
        disabled={isPending || attended || loading}
        title={attended ? t('maturing.attendanceCompleted') : t('maturing.attendanceButton')}
        className={`flex items-center justify-center p-2 rounded-lg transition-all duration-150 select-none cursor-pointer
          ${
            attended
              ? 'text-emerald-500 bg-emerald-50/60 cursor-default'
              : 'text-amber-500 hover:text-amber-600 hover:bg-neutral-100'
          }`}
      >
        {attended ? (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        )}
      </button>

      {/* 출석 유도 말풍선 툴팁 */}
      {!isPending && !attended && !loading && showTooltip && (
        <div 
          className="absolute top-full right-1/2 translate-x-1/2 mt-2 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-amber-600 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-xl shadow-lg whitespace-nowrap animate-bounce-subtle flex items-center gap-1.5">
            {/* 삼각형 꼬리 */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-amber-600" />
            
            <span>{t('maturing.attendancePrompt')}</span>
            
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowTooltip(false)
                localStorage.setItem('attendance_tooltip_dismissed_date', getTodayDateString())
              }}
              aria-label="닫기"
              className="hover:text-amber-200 transition-colors p-0.5 rounded cursor-pointer flex items-center justify-center"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
