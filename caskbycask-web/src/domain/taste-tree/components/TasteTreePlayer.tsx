import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import { tasteTreeApi } from '../api/tasteTreeApi'
import type { TasteTreeContent, TasteTreeEdge, TasteTreeNode } from '../types/tasteTree.types'
import TasteTreeGraph from './TasteTreeGraph'

interface TasteTreePlayerProps {
  content: TasteTreeContent
  language?: 'ko' | 'en'
  treeTitle?: string
  creatorName?: string | null
}

function localized(valueKo?: string | null, valueEn?: string | null, isEn = false) {
  return isEn ? valueEn || valueKo || '' : valueKo || ''
}

function nodeImage(node: TasteTreeNode) {
  if (node.imageHidden) return null
  return node.whisky?.imageOverrideUrl || node.imageUrl || node.whisky?.imageUrl || null
}

function SpiritFactBanner({ fact, label, className = '' }: { fact: string; label: string; className?: string }) {
  return <div className={`border-b border-orange-950 bg-orange-900 px-5 py-4 sm:px-7 ${className}`}>
    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-200">{label}</p>
    <p className="mt-1 break-keep text-sm font-bold leading-5 text-orange-50">{fact}</p>
  </div>
}

function QuestionPreviewPanel({ title, description, label }: { title: string; description: string; label: string }) {
  return <div className="flex h-full min-h-[360px] items-center justify-center bg-[#eeeae5] px-7 py-10 sm:min-h-[440px] lg:min-h-[520px]">
    <div className="mx-auto max-w-xl text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{label}</p>
      <h2 className="mt-4 break-keep text-3xl font-black leading-tight text-stone-950 sm:text-4xl">{title}</h2>
      {description && <p className="mt-5 break-keep text-sm font-semibold leading-6 text-stone-500 sm:text-base">{description}</p>}
    </div>
  </div>
}

export default function TasteTreePlayer({ content, language, treeTitle, creatorName }: TasteTreePlayerProps) {
  const { t, i18n } = useTranslation(undefined, language ? { lng: language } : undefined)
  const isEn = language ? language === 'en' : i18n.language === 'en'
  const nodeMap = useMemo(() => new Map(content.nodes.map((node) => [node.key, node])), [content.nodes])
  const start = content.nodes.find((node) => node.type === 'START') ?? content.nodes[0]
  const [currentKey, setCurrentKey] = useState(start?.key ?? '')
  const [nodePath, setNodePath] = useState<string[]>(start ? [start.key] : [])
  const [edgePath, setEdgePath] = useState<string[]>([])
  const [fullMap, setFullMap] = useState(false)
  const [captureState, setCaptureState] = useState<'idle' | 'saving' | 'error'>('idle')
  const graphCaptureRef = useRef<HTMLDivElement>(null)
  const current = nodeMap.get(currentKey)
  const factsQuery = useQuery({
    queryKey: ['taste-tree-facts'],
    queryFn: () => tasteTreeApi.getFacts().then((response) => response.data.data ?? []),
    enabled: !isEn,
    staleTime: 5 * 60 * 1000,
  })
  const factsKo = useMemo(() => (factsQuery.data ?? []).map((fact) => fact.trim()).filter(Boolean), [factsQuery.data])
  const [tipIndex, setTipIndex] = useState<number | null>(null)

  useEffect(() => {
    setTipIndex(factsKo.length > 0 ? Math.floor(Math.random() * factsKo.length) : null)
  }, [factsKo])

  const outgoing = useMemo(() => content.edges
    .filter((edge) => edge.sourceNodeKey === currentKey)
    .sort((a, b) => a.sortOrder - b.sortOrder), [content.edges, currentKey])

  if (!current) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{t('tasteTree.invalidTree')}</div>
  }

  const selectEdge = (edge: TasteTreeEdge) => {
    if (!nodeMap.has(edge.targetNodeKey)) return
    setCurrentKey(edge.targetNodeKey)
    setNodePath((previous) => [...previous, edge.targetNodeKey])
    setEdgePath((previous) => [...previous, edge.key])
  }

  const back = () => {
    if (nodePath.length <= 1) return
    const nextNodes = nodePath.slice(0, -1)
    setNodePath(nextNodes)
    setEdgePath((previous) => previous.slice(0, -1))
    setCurrentKey(nextNodes[nextNodes.length - 1])
    setFullMap(false)
  }

  const restart = () => {
    if (!start) return
    setCurrentKey(start.key)
    setNodePath([start.key])
    setEdgePath([])
    setFullMap(false)
  }

  const captureFullTree = async () => {
    const graph = graphCaptureRef.current
    const viewport = graph?.querySelector<HTMLElement>('.react-flow__viewport')
    const nodeElements = viewport?.querySelectorAll<HTMLElement>('.react-flow__node')
    if (!viewport || !nodeElements?.length || captureState === 'saving') return
    setCaptureState('saving')
    try {
      await document.fonts?.ready
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

      const bounds = Array.from(nodeElements).reduce((result, node) => {
        const transform = window.getComputedStyle(node).transform
        const matrix = transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(transform)
        return {
          left: Math.min(result.left, matrix.m41),
          top: Math.min(result.top, matrix.m42),
          right: Math.max(result.right, matrix.m41 + node.offsetWidth),
          bottom: Math.max(result.bottom, matrix.m42 + node.offsetHeight),
        }
      }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })

      const padding = 96
      const exportWidth = Math.max(1, Math.ceil(bounds.right - bounds.left + padding * 2))
      const exportHeight = Math.max(1, Math.ceil(bounds.bottom - bounds.top + padding * 2))
      const maxDimensionRatio = Math.min(12_000 / exportWidth, 12_000 / exportHeight)
      const maxPixelAreaRatio = Math.sqrt(64_000_000 / (exportWidth * exportHeight))
      const pixelRatio = Math.max(1, Math.min(4, maxDimensionRatio, maxPixelAreaRatio))

      const dataUrl = await toPng(viewport, {
        width: exportWidth,
        height: exportHeight,
        backgroundColor: '#f7f3ee',
        cacheBust: true,
        pixelRatio,
        skipFonts: true,
        style: {
          height: `${exportHeight}px`,
          transform: `translate(${padding - bounds.left}px, ${padding - bounds.top}px) scale(1)`,
          transformOrigin: 'top left',
          width: `${exportWidth}px`,
        },
        filter: (node) => !node.classList?.contains('react-flow__controls')
          && !node.classList?.contains('react-flow__background')
          && !node.classList?.contains('react-flow__panel'),
      })
      const link = document.createElement('a')
      const safeTitle = (treeTitle || 'taste-tree').replace(/[\\/:*?"<>|]/g, '-')
      link.download = `${safeTitle}-taste-tree.png`
      link.href = dataUrl
      link.click()
      setCaptureState('idle')
    } catch {
      setCaptureState('error')
    }
  }

  if (fullMap) {
    return (
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <header className="flex flex-col gap-4 border-b border-stone-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">{t('tasteTree.myJourney')}</p>
            <h2 className="mt-1 text-xl font-black text-stone-950">{t('tasteTree.fullTree')}</h2>
            <p className="mt-1 text-sm text-stone-500">{t('tasteTree.currentPosition', { title: localized(current.titleKo, current.titleEn, isEn) })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {outgoing.length > 0 && <button type="button" onClick={() => setFullMap(false)} className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-stone-800">{t('tasteTree.continueJourney')}</button>}
            {!outgoing.length && <button type="button" onClick={() => { setCaptureState('idle'); setFullMap(false) }} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">{t('common.back')}</button>}
            <button type="button" onClick={captureFullTree} disabled={captureState === 'saving'} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60">
              {captureState === 'saving' ? t('tasteTree.captureSaving') : captureState === 'error' ? t('tasteTree.captureFailed') : t('tasteTree.capture')}
            </button>
            <button type="button" onClick={restart} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100">{t('tasteTree.restart')}</button>
          </div>
        </header>
        <div ref={graphCaptureRef}>
          <TasteTreeGraph content={content} activeNodeKeys={nodePath} activeEdgeKeys={edgePath} language={language} />
        </div>
      </section>
    )
  }

  const currentWhisky = current.whisky
  const currentTitle = localized(current.titleKo, current.titleEn, isEn)
  const currentDescription = localized(current.descriptionKo, current.descriptionEn, isEn)
  const currentImage = nodeImage(current)
  const isMain = current.type === 'START'
  const isQuestion = current.type === 'CHOICE'
  const currentPrompt = isQuestion
    ? ''
    : localized(current.promptKo, current.promptEn, isEn)
      || (isMain && !currentWhisky ? currentTitle : '')
  const randomTip = isEn || tipIndex == null ? null : factsKo[tipIndex] ?? null

  if (!outgoing.length) {
    return (
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {randomTip && <SpiritFactBanner fact={randomTip} label={t('tasteTree.spiritFact')} />}
        <header className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4 sm:px-7">
          <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-black text-white">✓</span>
          <p className="break-keep text-sm font-black text-amber-950 sm:text-base">{t('tasteTree.journeyComplete')}</p>
        </header>

        <div className="grid lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
          <aside className="min-w-0 border-b border-stone-200 bg-white lg:border-b-0 lg:border-r">
            {isQuestion ? <QuestionPreviewPanel title={currentTitle} description={currentDescription} label={t('tasteTree.nodeTypes.CHOICE')} /> : <>
            <div className="flex min-h-[280px] items-center justify-center bg-[#eeeae5] p-5 sm:min-h-[360px] sm:p-7 lg:min-h-[420px]">
              {currentImage ? <img src={currentImage} alt={currentTitle} className="max-h-[380px] w-full object-contain" /> : isMain ? <div className="text-center">
                <h2 className="break-keep text-2xl font-black leading-tight text-stone-950">{treeTitle || currentTitle}</h2>
                {creatorName && <p className="mt-2 text-xs font-bold text-stone-500">{creatorName}</p>}
              </div> : <p className="text-center text-sm font-bold text-stone-400">{t('tasteTree.noImage')}</p>}
            </div>

            <div className="p-5 sm:p-7">
              <h2 className="break-keep text-center text-2xl font-black leading-tight text-stone-950 sm:text-3xl">{currentTitle}</h2>
              {currentDescription && <p className="mt-3 break-keep text-sm leading-6 text-stone-500">{currentDescription}</p>}
              {currentWhisky && <div className="mt-4 flex flex-wrap items-center gap-2">
                {currentWhisky?.priceText && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{currentWhisky.priceText}</span>}
                {!currentWhisky?.priceText && currentWhisky?.priceAmount != null && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{t('tasteTree.approxPrice', { price: new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(currentWhisky.priceAmount), currency: currentWhisky.currencyCode || 'KRW' })}</span>}
                {currentWhisky?.source === 'REGISTERED' && currentWhisky.spiritId && <Link to={`/spirits/${currentWhisky.spiritId}`} target="_blank" rel="noopener noreferrer" className="ui-button rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50">{t('tasteTree.viewDetail')}</Link>}
              </div>}
            </div>
            </>}
          </aside>

          <div className="min-w-0 bg-[#faf9f7] p-4 sm:p-6 lg:p-7">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{t('tasteTree.myJourney')}</p>
                <h3 className="mt-1 text-lg font-black text-stone-950 sm:text-xl">{t('tasteTree.fullTree')}</h3>
              </div>
              <button type="button" onClick={() => setFullMap(true)} className="taste-tree-border-glow shrink-0 rounded-lg border bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 sm:text-sm">{t('tasteTree.viewFullJourney')}</button>
            </div>
            <TasteTreeGraph content={content} activeNodeKeys={nodePath} activeEdgeKeys={edgePath} compact language={language} />
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-3 sm:px-5">
          <button type="button" onClick={back} disabled={nodePath.length <= 1} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-35 sm:px-4 sm:text-sm">{t('common.back')}</button>
          <button type="button" onClick={restart} className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 sm:text-sm">{t('tasteTree.restart')}</button>
        </footer>
      </section>
    )
  }

  return (
    <section className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
      {randomTip && <SpiritFactBanner fact={randomTip} label={t('tasteTree.spiritFact')} className="lg:col-span-2" />}
      <aside className="min-w-0 border-b border-stone-200 bg-white lg:border-b-0 lg:border-r">
        {isQuestion ? <QuestionPreviewPanel title={currentTitle} description={currentDescription} label={t('tasteTree.nodeTypes.CHOICE')} /> : <>
          <div className="flex min-h-[240px] items-center justify-center bg-[#eeeae5] p-6 sm:min-h-[320px] lg:min-h-[380px]">
            {currentImage ? <img src={currentImage} alt={currentTitle} className="max-h-[340px] w-full object-contain" /> : isMain ? <div className="max-w-sm text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{t('tasteTree.nodeTypes.START')}</p>
              <h2 className="mt-3 break-keep text-3xl font-black leading-tight text-stone-950 sm:text-4xl">{treeTitle || currentTitle}</h2>
              {creatorName && <p className="mt-3 text-xs font-bold text-stone-500">{creatorName}</p>}
            </div> : <p className="text-sm font-bold text-stone-400">{t('tasteTree.noImage')}</p>}
          </div>

          <div className="p-5 sm:p-7">
            <h2 className="break-keep text-center text-2xl font-black leading-tight text-stone-950 sm:text-3xl">{currentTitle}</h2>
            {currentDescription && <p className="mt-3 break-keep text-sm leading-6 text-stone-500">{currentDescription}</p>}
            {currentWhisky && <div className="mt-4 flex flex-wrap items-center gap-2">
              {currentWhisky.priceText && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{currentWhisky.priceText}</span>}
              {!currentWhisky.priceText && currentWhisky.priceAmount != null && <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{t('tasteTree.approxPrice', { price: new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(currentWhisky.priceAmount), currency: currentWhisky.currencyCode || 'KRW' })}</span>}
              {currentWhisky.source === 'REGISTERED' && currentWhisky.spiritId && <Link to={`/spirits/${currentWhisky.spiritId}`} target="_blank" rel="noopener noreferrer" className="ui-button rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50">{t('tasteTree.viewDetail')}</Link>}
            </div>}
          </div>
        </>}
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex-1 bg-[#faf9f7] px-5 py-5 sm:px-7 sm:py-6">
          {isMain && currentImage && <div className="mb-5 rounded-lg border border-stone-200 bg-white p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{t('tasteTree.nodeTypes.START')}</p>
            <h2 className="mt-1.5 break-keep text-xl font-black leading-tight text-stone-950 sm:text-2xl">{treeTitle || currentTitle}</h2>
            {creatorName && <p className="mt-2 text-xs font-bold text-stone-500">{creatorName}</p>}
          </div>}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{t('tasteTree.nextChoice')}</p>
              {currentPrompt && <h3 className="mt-1 break-keep text-lg font-black text-stone-950 sm:text-xl">{currentPrompt}</h3>}
            </div>
          </div>
          <div className={`mt-5 grid gap-3 ${outgoing.length > 2 ? 'sm:grid-cols-2' : ''}`}>
            {outgoing.map((edge) => {
              const description = localized(edge.descriptionKo, edge.descriptionEn, isEn)
              return <button key={edge.key} type="button" onClick={() => selectEdge(edge)}
                className="group flex min-h-[108px] items-center gap-4 rounded-lg border border-stone-200 bg-white px-5 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md">
                <span className="flex min-w-0 flex-1 flex-col justify-center">
                  <span className="break-keep text-base font-black leading-6 text-stone-900 sm:text-lg">{localized(edge.labelKo, edge.labelEn, isEn)}</span>
                  {description && <span className="mt-1 line-clamp-2 break-keep text-sm leading-5 text-stone-500">{description}</span>}
                </span>
                <svg className="my-auto h-5 w-5 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" /></svg>
              </button>
            })}
          </div>
          <button type="button" onClick={() => setFullMap(true)} className="mt-3 w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-black text-amber-900 transition hover:border-amber-400 hover:bg-amber-100">{t('tasteTree.stopHere')}</button>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-stone-200 px-5 py-3 sm:px-7">
          <button type="button" onClick={back} disabled={nodePath.length <= 1} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-35">{t('common.back')}</button>
          <button type="button" onClick={() => setFullMap(true)} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100">{t('tasteTree.fullTree')}</button>
          <button type="button" onClick={restart} className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100">{t('tasteTree.restart')}</button>
        </footer>
      </div>
    </section>
  )
}
