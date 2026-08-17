import { useCallback, useEffect, useRef, useState } from 'react'
import {
  decideAutoSave,
  PHOTO_CARD_AUTO_SAVE_INTERVAL_MS,
  PHOTO_CARD_AUTO_SAVE_MAX_FAILURES,
  PHOTO_CARD_AUTO_SAVE_MIN_GAP_MS,
  PHOTO_CARD_AUTO_SAVE_STORAGE_KEY,
  type AutoSaveOutcome,
  type AutoSaveState,
  type AutoSaveStopReason,
} from '../utils/photoCardAutoSave'

/** 저장 여부를 판단하는 데 필요한, 그때그때 달라지는 값들. 페이지가 읽어 준다. */
type ReadableState = Omit<AutoSaveState, 'enabled' | 'stopped'>

interface Options {
  /** 차례마다 지금 상태를 읽어 온다. 편집 내용(content)을 만드는 비용이 있어 필요할 때만 부른다. */
  readState: () => ReadableState
  /** 실제 저장. 성공·실패 분류는 페이지가 한다(서버 오류 코드를 아는 쪽이라서). */
  save: (options: { includePhoto: boolean }) => Promise<AutoSaveOutcome>
}

export interface PhotoCardAutoSave {
  enabled: boolean
  setEnabled: (next: boolean) => void
  /** 마지막으로 저장에 성공한 시각(ms). 아직 없으면 null */
  lastSavedAt: number | null
  saving: boolean
  /** 이번 세션에서 멈췄으면 그 이유 */
  stoppedReason: AutoSaveStopReason | null
}

const readPreference = (): boolean => {
  // 기본은 켜짐 — 사고가 나는 사람은 대개 이런 설정을 켜 두지 않은 사람이다.
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(PHOTO_CARD_AUTO_SAVE_STORAGE_KEY) !== 'off'
  } catch {
    // 사생활 보호 모드 등으로 막히면 기억만 못 할 뿐이다.
    return true
  }
}

const writePreference = (enabled: boolean) => {
  try {
    window.localStorage.setItem(PHOTO_CARD_AUTO_SAVE_STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // 저장 못 해도 이번 세션 동작에는 지장이 없다.
  }
}

/**
 * 3분마다 서버 임시저장에 자동으로 남긴다.
 *
 * 편집기는 사진을 올리고 요소를 맞추는 데 수십 분이 걸리는데, 이탈 방지 대화상자는
 * 사용자가 <b>스스로</b> 나갈 때만 뜬다 — 브라우저가 죽거나 전원이 나가면 그때까지의 작업이
 * 통째로 사라진다. 그 구멍만 메우는 장치다.
 *
 * 무엇을 보낼지는 순수 함수(decideAutoSave)가 정하고, 여기서는 <b>언제</b> 물어볼지와
 * 실패가 이어질 때 멈추는 일만 한다. 최신 값은 ref 로 읽고 타이머는 한 번만 건다 —
 * 의존성에 그대로 넣으면 렌더할 때마다 타이머가 새로 걸려 3분이 영영 오지 않는다.
 */
export const usePhotoCardAutoSave = ({ readState, save }: Options): PhotoCardAutoSave => {
  const [enabled, setEnabledState] = useState(readPreference)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [stoppedReason, setStoppedReason] = useState<AutoSaveStopReason | null>(null)

  const latest = useRef({ readState, save, enabled, stoppedReason })
  latest.current = { readState, save, enabled, stoppedReason }

  /** 저장이 진행 중인가 — 앞 차례가 끝나기 전에 다음 차례가 겹치지 않게 한다. */
  const runningRef = useRef(false)
  const failuresRef = useRef(0)
  /** 마지막으로 저장을 <b>시도</b>한 시각. 탭을 덮을 때의 추가 저장이 몰리지 않게 재는 값이다. */
  const attemptedAtRef = useRef(0)

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    writePreference(next)
    // 다시 켜는 것은 "문제를 고쳤으니 이어서 하자"는 뜻이다. 지난 실패는 잊는다.
    if (next) {
      failuresRef.current = 0
      setStoppedReason(null)
    }
  }, [])

  const tick = useCallback(async () => {
    if (runningRef.current) return
    const decision = decideAutoSave({
      ...latest.current.readState(),
      enabled: latest.current.enabled,
      stopped: latest.current.stoppedReason != null,
    })
    if (!decision.save) return

    runningRef.current = true
    attemptedAtRef.current = Date.now()
    setSaving(true)
    try {
      const outcome = await latest.current.save({ includePhoto: decision.includePhoto })
      if (outcome === 'saved') {
        failuresRef.current = 0
        setLastSavedAt(Date.now())
        return
      }
      if (outcome === 'retry') {
        failuresRef.current += 1
        if (failuresRef.current >= PHOTO_CARD_AUTO_SAVE_MAX_FAILURES) setStoppedReason('error')
        return
      }
      // 목록이 가득 찼거나 로그인이 풀린 것은 다시 시도한다고 풀리지 않는다.
      setStoppedReason(outcome)
    } finally {
      runningRef.current = false
      setSaving(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => { void tick() }, PHOTO_CARD_AUTO_SAVE_INTERVAL_MS)

    // 탭을 덮어 두는 순간도 저장할 때다 — 그대로 두었다가 브라우저가 죽는 것이 흔한 사고다.
    // 창을 오갈 때마다 보내지 않도록 직전 시도에서 얼마간 지났을 때만 한다.
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') return
      if (Date.now() - attemptedAtRef.current < PHOTO_CARD_AUTO_SAVE_MIN_GAP_MS) return
      void tick()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [tick])

  return { enabled, setEnabled, lastSavedAt, saving, stoppedReason }
}
