import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { scoreApi } from '../api/scoreApi'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useState } from 'react'

export default function AttendanceButton() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isLoggedIn, setPendingAttendanceToast } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { data: attended = false } = useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => scoreApi.getTodayAttendanceStatus().then((res) => res.data.data ?? false),
    enabled: isLoggedIn,
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

  if (!isLoggedIn) return null

  return (
    <button
      type="button"
      onClick={() => !attended && !loading && checkIn()}
      disabled={attended || loading}
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
  )
}
