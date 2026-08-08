import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminWineIngestApi } from '@/domain/admin/api/adminWineIngestApi'
import type {
  WineIngestItemStatus, WineIngestRunStatus, WineIngestSettings,
} from '@/domain/admin/types/wineIngest.types'

const CARD = 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm'
const INPUT = 'rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm'

const RUN_LABEL: Record<WineIngestRunStatus, string> = {
  QUEUED: '대기', RUNNING: '진행 중', SUCCEEDED: '성공', PARTIAL: '일부 실패', FAILED: '실패', CANCELLED: '취소',
}
const ITEM_LABEL: Record<WineIngestItemStatus, string> = {
  CREATED: '등록 성공', DUPLICATE_SKIPPED: '중복 PASS', FAILED: '실패', NOT_FOUND_SKIPPED: '자료 부족 PASS',
}
const badge = (status: string) => status === 'SUCCEEDED' || status === 'CREATED'
  ? 'bg-emerald-50 text-emerald-700'
  : status === 'RUNNING' ? 'bg-blue-50 text-blue-700'
  : status === 'QUEUED' || status.includes('SKIPPED') ? 'bg-amber-50 text-amber-700'
  : status === 'CANCELLED' ? 'bg-neutral-100 text-neutral-600' : 'bg-red-50 text-red-700'

/** 백엔드가 원인별 메시지를 내려주므로 그대로 보여준다. 네트워크 오류 등에만 기본 문구를 쓴다. */
const errorMessage = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  ?? '요청을 처리하지 못했습니다. 설정과 입력값을 확인한 뒤 다시 시도해 주세요.'

export default function AdminWineIngestPage() {
  const qc = useQueryClient()
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [form, setForm] = useState<WineIngestSettings | null>(null)
  const [formDirty, setFormDirty] = useState(false)
  const { data: dashboard } = useQuery({
    queryKey: ['admin', 'wine-ingest', 'dashboard'],
    queryFn: adminWineIngestApi.dashboard,
    refetchInterval: (q) => {
      const d = q.state.data
      return d && (d.queuedCount > 0 || d.runningCount > 0) ? 3000 : 15000
    },
  })
  const { data: runs } = useQuery({
    queryKey: ['admin', 'wine-ingest', 'runs'], queryFn: () => adminWineIngestApi.runs(0, 30),
    refetchInterval: dashboard && (dashboard.queuedCount > 0 || dashboard.runningCount > 0) ? 3000 : false,
  })
  const { data: items } = useQuery({
    queryKey: ['admin', 'wine-ingest', 'items', selectedRunId],
    queryFn: () => adminWineIngestApi.items(selectedRunId!, 0, 100),
    enabled: selectedRunId != null,
    refetchInterval: dashboard?.runningCount ? 3000 : false,
  })

  useEffect(() => {
    if (dashboard?.settings && !formDirty) setForm(dashboard.settings)
  }, [dashboard?.settings, formDirty])
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'wine-ingest'] })
  const fixture = useMutation({ mutationFn: () => adminWineIngestApi.createFixtureRun(3), onSuccess: refresh })
  const live = useMutation({ mutationFn: () => adminWineIngestApi.createManualRun(form?.maxRunItems ?? 3), onSuccess: refresh })
  const cancel = useMutation({ mutationFn: adminWineIngestApi.cancel, onSuccess: refresh })
  const publish = useMutation({ mutationFn: adminWineIngestApi.publishItem, onSuccess: refresh })
  const save = useMutation({
    mutationFn: (value: WineIngestSettings) => adminWineIngestApi.updateSettings({
      automationEnabled: value.automationEnabled,
      hourlyLimit: value.hourlyLimit,
      maxRunItems: value.maxRunItems,
      slackAlertEnabled: value.slackAlertEnabled,
    }),
    onSuccess: (next) => { setForm(next); setFormDirty(false); refresh() },
  })
  const updateForm = (next: WineIngestSettings) => {
    setForm(next)
    setFormDirty(true)
  }
  const mutationError = fixture.error || live.error || cancel.error || save.error || publish.error

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-neutral-500">주류 › 와인 크롤링</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">와인 크롤링</h1>
        <p className="mt-2 text-sm text-neutral-500">수집 실행 상태와 등록·중복·실패 결과를 한 화면에서 확인합니다.</p>
        {mutationError && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage(mutationError)}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={CARD}><p className="text-xs text-neutral-500">대기</p><p className="mt-1 text-2xl font-bold">{dashboard?.queuedCount ?? 0}</p></div>
        <div className={CARD}><p className="text-xs text-neutral-500">진행 중</p><p className="mt-1 text-2xl font-bold text-blue-700">{dashboard?.runningCount ?? 0}</p></div>
        <div className={CARD}><p className="text-xs text-neutral-500">자동 수집</p><p className="mt-1 font-bold">{dashboard?.settings.automationEnabled ? '켜짐 · 매시 예약' : '꺼짐 · 수동 실행만'}</p></div>
      </div>

      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-neutral-900">수집 실행</h2>
            <p className="mt-1 text-xs text-neutral-500">오프라인 테스트는 네트워크에 접속하지 않고 번들 샘플 3건만 등록합니다.</p>
            <p className="mt-1 text-xs text-neutral-500">
              버튼을 누르면 <strong>대기</strong> 상태로 예약되고, 서버 수집 워커가 <strong>매시 37분</strong>에 가져가 실행합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => fixture.mutate()} disabled={fixture.isPending}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">오프라인 테스트 3건</button>
            <button onClick={() => live.mutate()} disabled={live.isPending}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-30">Vivino 수집 시작</button>
          </div>
        </div>
      </section>

      {form && <section className={CARD}>
        <h2 className="font-bold text-neutral-900">수집 설정</h2>
        <p className="mt-1 text-xs text-neutral-500">Vivino 부하를 낮게 유지하기 위한 수집량 상한입니다. 요청 간격 5초와 429 즉시 중단은 크롤러가 항상 적용합니다.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-neutral-600">시간당 최대
            <input className={`${INPUT} mt-1 w-full`} type="number" min={1} max={10} value={form.hourlyLimit} onChange={(e) => updateForm({ ...form, hourlyLimit: Number(e.target.value) })} />
          </label>
          <label className="text-xs font-semibold text-neutral-600">실행당 최대
            <input className={`${INPUT} mt-1 w-full`} type="number" min={1} max={10} value={form.maxRunItems} onChange={(e) => updateForm({ ...form, maxRunItems: Number(e.target.value) })} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
          <label className="flex items-center gap-2" title="매시 37분 cron이 Vivino 수집 회차를 자동으로 예약합니다.">
            <input type="checkbox" checked={form.automationEnabled}
              onChange={(e) => updateForm({ ...form, automationEnabled: e.target.checked })} />자동 수집
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.slackAlertEnabled} onChange={(e) => updateForm({ ...form, slackAlertEnabled: e.target.checked })} />Slack 실패 알림</label>
          <button onClick={() => save.mutate(form)} disabled={save.isPending || !formDirty} className="ml-auto rounded-lg border border-neutral-300 px-4 py-2 font-semibold disabled:opacity-40">설정 저장</button>
        </div>
      </section>}

      <section className={CARD}>
        <h2 className="font-bold text-neutral-900">실행 이력</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-xs text-neutral-500"><tr><th className="p-2">시작 요청</th><th>유형</th><th>상태</th><th>진행</th><th>등록</th><th>중복</th><th>PASS</th><th>실패</th><th></th></tr></thead>
            <tbody>{runs?.content.map((run) => <tr key={run.id} className={`border-b hover:bg-neutral-50 ${selectedRunId === run.id ? 'bg-amber-50/40' : ''}`}>
              <td className="p-2">{new Date(run.createdAt).toLocaleString()}</td><td>{run.runType}</td>
              <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge(run.status)}`}>{RUN_LABEL[run.status]}</span></td>
              <td>{run.attemptedCount}/{run.requestedLimit}</td><td>{run.createdCount}</td><td>{run.duplicateCount}</td><td>{run.skippedCount}</td><td>{run.failedCount}</td>
              <td className="space-x-2"><button className="text-amber-700 underline" onClick={() => setSelectedRunId(run.id)}>결과</button>{(['QUEUED', 'RUNNING'] as string[]).includes(run.status) && <button className="text-red-600 underline" onClick={() => cancel.mutate(run.id)}>취소</button>}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      {selectedRunId && <section className={CARD}>
        <h2 className="font-bold text-neutral-900">건별 결과</h2>
        <p className="mt-1 text-xs text-neutral-500">수집 데이터는 영문명으로 숨김 등록됩니다. 마스터에서 국문명을 입력한 뒤 해당 빈티지를 공개하세요.</p>
        <div className="mt-4 space-y-2">{items?.content.length ? items.content.map((item) => <div key={item.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge(item.status)}`}>{ITEM_LABEL[item.status]}</span><strong>{item.wineNameEn || '이름 미확인'}</strong><span className="text-neutral-500">{item.vintageLabel}</span>
            {item.masterSpiritId && <Link className="text-amber-700 underline" to={`/admin/spirits/${item.masterSpiritId}`}>마스터·국문명 수정</Link>}
            {item.spiritId && item.spiritId !== item.masterSpiritId && <Link className="text-amber-700 underline" to={`/admin/spirits/${item.spiritId}`}>빈티지 보기</Link>}
            {item.status === 'CREATED' && (item.published
              ? <span className="font-semibold text-emerald-700">공개 완료</span>
              : <button className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:border-neutral-200 disabled:text-neutral-400" disabled={!item.koreanNameReady || publish.isPending} onClick={() => publish.mutate(item.id)}>{item.koreanNameReady ? '검수 완료·공개' : '국문명 입력 필요'}</button>)}
          </div>
          {item.reasonMessage && <p className="mt-2 text-xs text-red-600">{item.reasonCode}: {item.reasonMessage}</p>}
          {item.sourceUrl && <a className="mt-1 block truncate text-xs text-blue-600 underline" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">{item.sourceUrl}</a>}
        </div>) : <p className="text-sm text-neutral-500">아직 처리 결과가 없습니다.</p>}</div>
      </section>}
    </div>
  )
}
