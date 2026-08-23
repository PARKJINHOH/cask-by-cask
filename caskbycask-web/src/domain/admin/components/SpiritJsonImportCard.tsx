import { useState } from 'react'
import { adminProducerApi } from '@/domain/admin/api/adminProducerApi'
import { CATEGORY_TO_PRODUCER_TYPE } from '@/domain/producer/types/producer.types'
import {
  parseSpiritResearchJson, buildImportPlan, applyImportPlan,
  type ImportPlan, type ImportWarning,
} from '@/domain/admin/utils/spiritResearchJson'
import type { SpiritFormApi } from '@/domain/admin/components/SpiritFormFields'

/**
 * 조사 프롬프트(docs/*-research-prompt.md)가 만든 JSON 을 붙여넣어 폼을 채우는 카드.
 *
 * <p><b>등록하지 않는다.</b> 입력칸만 채우고, 확인·수정·등록은 사람이 한다.
 * 채운 뒤 무엇이 들어갔고 무엇이 걸러졌는지 반드시 보여준다 —
 * 조용히 일부만 들어가면 잘못된 데이터가 그대로 등록된다.
 */

interface Props {
  form: SpiritFormApi
  /** 붙여넣기로 폼을 덮어쓰기 전에 확인이 필요할 때 (수정 화면 등) */
  confirmMessage?: string
}

const CARD = 'bg-white rounded-2xl shadow-sm p-6 space-y-4'

interface Report {
  plan: ImportPlan
  producerNote: string | null
  extraWarnings: ImportWarning[]
  itemLabel: string | null
}

/** 목록에서 항목을 알아볼 이름 */
function itemName(raw: Record<string, unknown>, index: number): string {
  const ko = typeof raw.nameKo === 'string' ? raw.nameKo.trim() : ''
  const en = typeof raw.nameEn === 'string' ? raw.nameEn.trim() : ''
  return ko || en || `${index + 1}번째 항목`
}

export default function SpiritJsonImportCard({ form, confirmMessage }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)
  /** 배열로 붙여넣었을 때 고를 수 있는 항목들 — 프롬프트가 3~5건씩 조사하라고 안내한다 */
  const [items, setItems] = useState<Record<string, unknown>[] | null>(null)
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null)

  const handleParse = () => {
    setError('')
    setReport(null)
    setItems(null)
    setAppliedIndex(null)

    const parsed = parseSpiritResearchJson(text)
    if (!parsed.ok) { setError(parsed.error); return }

    setItems(parsed.items)
    // 1건이면 고를 것이 없으므로 바로 채운다
    if (parsed.items.length === 1) void applyItem(parsed.items[0], 0)
  }

  const applyItem = async (raw: Record<string, unknown>, index: number) => {
    setError('')

    const built = buildImportPlan(raw)
    if (!built.ok) { setError(built.error); setReport(null); return }

    if (confirmMessage && !window.confirm(confirmMessage)) return

    setBusy(true)
    try {
      const { plan } = built
      applyImportPlan(form, plan)
      setAppliedIndex(index)

      // 생산자는 이름만 알 수 있어 목록에서 찾아 연결한다.
      // 정확히 1건일 때만 자동 선택한다 — 여러 건이면 사람이 골라야 한다.
      let producerNote: string | null = null
      if (plan.producerName) {
        try {
          const res = await adminProducerApi.list({
            keyword: plan.producerName,
            type: CATEGORY_TO_PRODUCER_TYPE[plan.category],
            size: 5,
          })
          const hits = res.data.data?.content ?? []
          if (hits.length === 1) {
            form.setProducerId(hits[0].id)
            form.setProducerName(hits[0].nameKo)
            producerNote = `생산자 '${hits[0].nameKo}' 을(를) 자동으로 선택했습니다.`
          } else if (hits.length === 0) {
            producerNote = `'${plan.producerName}' 을(를) 생산자 목록에서 찾지 못했습니다. 직접 선택하거나 등록해주세요.`
          } else {
            form.setProducerName(plan.producerName)
            producerNote = `'${plan.producerName}' 검색 결과가 ${hits.length}건입니다. 직접 골라주세요.`
          }
        } catch {
          producerNote = `생산자 조회에 실패했습니다. '${plan.producerName}' 을(를) 직접 선택해주세요.`
        }
      }

      setReport({
        plan,
        producerNote,
        extraWarnings: [],
        itemLabel: itemName(raw, index),
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={CARD}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-neutral-900">JSON 붙여넣기로 채우기</span>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            등록은 하지 않습니다
          </span>
        </span>
        <span className="text-xs text-neutral-400">{open ? '접기' : '펼치기'}</span>
      </button>

      {open && (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-neutral-500">
            조사 프롬프트(<code className="text-neutral-600">docs/*-research-prompt.md</code>)로 받은 JSON 을
            그대로 붙여넣고 <b>데이터 입력</b>을 누르면 아래 입력칸이 채워집니다.
            코드펜스(```json)나 앞뒤 설명이 섞여 있어도 됩니다.
            <br />
            <b className="text-amber-700">기존 입력값은 모두 지워지고 새로 채워집니다.</b> 내용을 확인한 뒤 직접 등록하세요.
          </p>

          {/* 붙여넣는 JSON 은 수백 줄에 달하는 경우가 많다 — 상자 높이를 고정하고 안에서 스크롤한다.
              붙여넣은 만큼 상자가 늘어나면 아래 '데이터 입력' 버튼이 화면 밖으로 밀려 보이지 않는다. */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            spellCheck={false}
            placeholder={'{\n  "category": "COGNAC",\n  "nameKo": "헤네시 XO",\n  ...\n}'}
            className="w-full resize-y overflow-y-auto rounded-lg border border-neutral-200 px-3 py-2
              font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary-400"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleParse}
              disabled={busy || !text.trim()}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white
                transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? '입력 중…' : '데이터 입력'}
            </button>
            <button
              type="button"
              onClick={() => { setText(''); setError(''); setReport(null); setItems(null); setAppliedIndex(null) }}
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-500
                transition-colors hover:border-neutral-300 hover:text-neutral-700"
            >
              지우기
            </button>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {/* 배열로 여러 건을 붙여넣은 경우 — 폼은 1건만 담으므로 어느 것을 채울지 고른다 */}
          {items && items.length > 1 && (
            <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
              <p className="text-xs font-semibold text-neutral-700">
                {items.length}건이 들어 있습니다. 채울 항목을 고르세요 — 한 번에 1건만 등록됩니다.
              </p>
              <ul className="space-y-1">
                {items.map((raw, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg
                    border border-neutral-100 px-3 py-2">
                    <span className="min-w-0 truncate text-xs text-neutral-700">
                      <span className="mr-1.5 text-neutral-400">{i + 1}.</span>
                      {itemName(raw, i)}
                      {typeof raw.category === 'string' && (
                        <span className="ml-1.5 text-[10px] text-neutral-400">{raw.category}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void applyItem(raw, i)}
                      className={`flex-shrink-0 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors
                        disabled:opacity-40 ${appliedIndex === i
                          ? 'bg-amber-100 text-amber-800'
                          : 'border border-amber-300 text-amber-700 hover:bg-amber-50'}`}
                    >
                      {appliedIndex === i ? '채움' : '이 항목 채우기'}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-neutral-400">
                다른 항목을 누르면 폼이 그 항목으로 새로 채워집니다. 한 건을 등록한 뒤 돌아와 다음 항목을 고르세요.
              </p>
            </div>
          )}

          {report && <ImportReport report={report} />}
        </div>
      )}
    </div>
  )
}

function ImportReport({ report }: { report: Report }) {
  const { plan, producerNote, itemLabel } = report
  const warnings = [...plan.warnings, ...report.extraWarnings]
  const { meta } = plan
  const lowConfidence = meta.confidence != null && meta.confidence !== '높음'

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <p className="text-xs font-semibold text-neutral-700">
        {itemLabel ? `'${itemLabel}' — ` : ''}{plan.applied.length}개 항목을 채웠습니다.
        등록 전에 내용을 확인해주세요.
      </p>

      {/* 필수 항목이 비면 등록 버튼에서 막힌다 — 여기서 먼저 알린다 */}
      {plan.missingRequired.length > 0 && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <b>필수 항목이 비어 있습니다</b> — {plan.missingRequired.join(', ')}.
          직접 채워야 등록할 수 있습니다.
        </p>
      )}

      {plan.applied.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.applied.map((label, i) => (
            <span key={i} className="rounded-md bg-white px-2 py-0.5 text-[11px] text-neutral-600 ring-1 ring-neutral-200">
              {label}
            </span>
          ))}
        </div>
      )}

      {producerNote && (
        <p className="rounded-lg bg-white px-3 py-2 text-xs text-neutral-600 ring-1 ring-neutral-200">
          {producerNote}
        </p>
      )}

      {/* 조사 신뢰도 신호 — 폼에는 안 들어가지만 등록 전에 사람이 확인해야 할 근거다 */}
      {(meta.confidence || meta.uncertain.length > 0 || meta.sources.length > 0 || meta.nameKoBasis) && (
        <div className={`space-y-1.5 rounded-lg px-3 py-2 ring-1 ${lowConfidence
          ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-neutral-200'}`}>
          <p className="text-[11px] font-semibold text-neutral-600">조사 신뢰도</p>
          {meta.confidence && (
            <p className={`text-[11px] ${lowConfidence ? 'font-semibold text-amber-700' : 'text-neutral-600'}`}>
              신뢰도: {meta.confidence}
              {lowConfidence && ' — 등록 전에 출처를 직접 확인하세요.'}
            </p>
          )}
          {meta.nameKoBasis && (
            <p className="text-[11px] text-neutral-600">한글명 근거: {meta.nameKoBasis}</p>
          )}
          {meta.uncertain.length > 0 && (
            <ul className="space-y-0.5">
              {meta.uncertain.map((u, i) => (
                <li key={i} className="text-[11px] text-amber-700">불확실: {u}</li>
              ))}
            </ul>
          )}
          {meta.sources.length > 0 && (
            <ul className="space-y-0.5">
              {meta.sources.map((s, i) => (
                <li key={i} className="truncate text-[11px]">
                  {/^https?:\/\//.test(s)
                    ? <a href={s} target="_blank" rel="noreferrer noopener"
                        className="text-neutral-500 underline hover:text-neutral-700">{s}</a>
                    : <span className="text-neutral-500">{s}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-700">확인이 필요한 항목 {warnings.length}건</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-amber-700">
                <b>{w.label}</b> — {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
