import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
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
      <section className="overflow-hidden rounded-[30px] border border-stone-200 bg-white shadow-sm">
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
            <button type="button" onClick={restart} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-50">{t('tasteTree.restart')}</button>
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

  if (!outgoing.length) {
    return (
      <section className="overflow-hidden rounded-[8px] border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
          <aside className="flex min-h-[190px] items-center justify-center border-r border-stone-200 bg-[#eeeae5] p-3 sm:min-h-[240px] sm:p-4 lg:min-h-[420px] lg:p-6">
            {isMain ? <div className="text-center">
              <h2 className="break-keep text-lg font-black leading-tight text-stone-950 sm:text-2xl">{treeTitle || currentTitle}</h2>
              {creatorName && <p className="mt-2 text-[10px] font-bold text-stone-500 sm:text-xs">{creatorName}</p>}
            </div> : currentImage ? <img src={currentImage} alt={currentTitle} className="max-h-[180px] w-full object-contain sm:max-h-[225px] lg:max-h-[390px]" /> : <p className="text-center text-xs font-bold text-stone-400">{t('tasteTree.noImage')}</p>}
          </aside>

          <div className="flex min-w-0 flex-col p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">✓</span>
              <p className="break-keep text-xs font-black text-amber-800 sm:text-sm">{t('tasteTree.journeyComplete')}</p>
            </div>
            <h2 className="mt-3 break-keep text-xl font-black leading-tight text-stone-950 sm:text-3xl">{currentTitle}</h2>
            {currentDescription && <p className="mt-2 line-clamp-2 break-keep text-xs leading-5 text-stone-500 sm:text-sm sm:leading-6">{currentDescription}</p>}
            {!isMain && <div className="mt-3 flex flex-wrap items-center gap-2">
              {currentWhisky?.priceText && <span className="rounded-[5px] bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900 sm:px-3 sm:py-1.5 sm:text-xs">{currentWhisky.priceText}</span>}
              {!currentWhisky?.priceText && currentWhisky?.priceAmount != null && <span className="rounded-[5px] bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900 sm:px-3 sm:py-1.5 sm:text-xs">{t('tasteTree.approxPrice', { price: new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(currentWhisky.priceAmount), currency: currentWhisky.currencyCode || 'KRW' })}</span>}
              {currentWhisky?.source === 'REGISTERED' && currentWhisky.spiritId && <Link to={`/spirits/${currentWhisky.spiritId}`} className="rounded-[5px] border border-stone-300 px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-50 sm:px-3 sm:py-1.5 sm:text-xs">{t('tasteTree.viewDetail')}</Link>}
            </div>}
            <div className="mt-auto pt-3">
              <span className="inline-flex rounded-[5px] bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-600 sm:text-xs">{t('tasteTree.stepCount', { count: edgePath.length })}</span>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-3 py-3 sm:px-5">
          <button type="button" onClick={back} disabled={nodePath.length <= 1} className="rounded-[5px] border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-35 sm:px-4 sm:text-sm">{t('common.back')}</button>
          <button type="button" onClick={() => setFullMap(true)} className="taste-tree-border-glow rounded-[5px] border bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 sm:px-4 sm:text-sm">{t('tasteTree.fullTree')}</button>
          <button type="button" onClick={restart} className="ml-auto rounded-[5px] px-2 py-2 text-xs font-bold text-stone-500 hover:bg-stone-50 sm:px-3 sm:text-sm">{t('tasteTree.restart')}</button>
        </footer>
      </section>
    )
  }

  return (
    <section className="grid overflow-hidden rounded-[8px] border border-stone-200 bg-white shadow-sm lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
      <aside className="flex min-h-[240px] items-center justify-center border-b border-stone-200 bg-[#eeeae5] p-6 lg:min-h-[420px] lg:border-b-0 lg:border-r">
        {isMain ? <div className="max-w-sm text-center lg:text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">{t('tasteTree.nodeTypes.START')}</p>
          <h2 className="mt-3 break-keep text-3xl font-black leading-tight text-stone-950 sm:text-4xl">{treeTitle || currentTitle}</h2>
          {creatorName && <p className="mt-3 text-xs font-bold text-stone-500">{creatorName}</p>}
        </div> : currentImage ? <img src={currentImage} alt={currentTitle} className="max-h-[460px] w-full object-contain" /> : <p className="text-sm font-bold text-stone-400">{t('tasteTree.noImage')}</p>}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-7 sm:py-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">{t('tasteTree.nextChoice')}</p>
            <h2 className="mt-1 break-keep text-2xl font-black text-stone-950">{currentTitle}</h2>
            {currentDescription && <p className="mt-2 line-clamp-2 break-keep text-sm leading-6 text-stone-500">{currentDescription}</p>}
            {!isMain && <div className="mt-3 flex flex-wrap items-center gap-2">
              {currentWhisky?.priceText && <span className="rounded-[5px] bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{currentWhisky.priceText}</span>}
              {!currentWhisky?.priceText && currentWhisky?.priceAmount != null && <span className="rounded-[5px] bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900">{t('tasteTree.approxPrice', { price: new Intl.NumberFormat(isEn ? 'en-US' : 'ko-KR').format(currentWhisky.priceAmount), currency: currentWhisky.currencyCode || 'KRW' })}</span>}
              {currentWhisky?.source === 'REGISTERED' && currentWhisky.spiritId && <Link to={`/spirits/${currentWhisky.spiritId}`} className="rounded-[5px] border border-stone-300 px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50">{t('tasteTree.viewDetail')}</Link>}
            </div>}
          </div>
          <span className="shrink-0 rounded-[5px] bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">{t('tasteTree.stepCount', { count: edgePath.length })}</span>
        </header>

        <div className="flex-1 border-t border-stone-200 bg-[#faf9f7] px-5 py-5 sm:px-7 sm:py-6">
          <h3 className="text-base font-black text-stone-950">{t('tasteTree.chooseDirection')}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {outgoing.map((edge) => {
              const description = localized(edge.descriptionKo, edge.descriptionEn, isEn)
              return <button key={edge.key} type="button" onClick={() => selectEdge(edge)}
                className="group flex min-h-[92px] flex-col items-center justify-center rounded-[7px] border border-stone-200 bg-white px-5 py-4 text-center transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-md">
                <span className="break-keep text-base font-black leading-6 text-stone-900 sm:text-lg">{localized(edge.labelKo, edge.labelEn, isEn)}</span>
                {description && <span className="mt-1.5 line-clamp-2 break-keep text-center text-sm leading-5 text-stone-500">{description}</span>}
              </button>
            })}
          </div>
          <button type="button" onClick={() => setFullMap(true)} className="mt-3 w-full rounded-[5px] border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900 transition hover:border-amber-400 hover:bg-amber-100">{t('tasteTree.stopHere')}</button>
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-stone-200 px-5 py-3 sm:px-7">
          <button type="button" onClick={back} disabled={nodePath.length <= 1} className="rounded-[5px] border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-35">{t('common.back')}</button>
          <button type="button" onClick={() => setFullMap(true)} className="rounded-[5px] border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-100">{t('tasteTree.fullTree')}</button>
          <button type="button" onClick={restart} className="ml-auto rounded-[5px] px-3 py-2 text-sm font-bold text-stone-500 hover:bg-stone-50">{t('tasteTree.restart')}</button>
        </footer>
      </div>
    </section>
  )
}
