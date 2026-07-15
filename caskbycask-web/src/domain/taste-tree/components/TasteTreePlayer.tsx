import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  TasteTreeAnswer,
  TasteTreeContent,
} from '../types/tasteTree.types'
import TasteTreeGraph from './TasteTreeGraph'

interface TasteTreePlayerProps {
  content: TasteTreeContent
  onComplete: (answers: TasteTreeAnswer[]) => Promise<void>
  completing?: boolean
}

export default function TasteTreePlayer({ content, onComplete, completing }: TasteTreePlayerProps) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const nodes = useMemo(
    () => new Map(content.nodes.map((node) => [node.key, node])),
    [content.nodes],
  )
  const start = content.nodes.find((node) => node.type === 'START') ?? content.nodes[0]
  const [currentKey, setCurrentKey] = useState(start?.key ?? '')
  const [history, setHistory] = useState<string[]>([])
  const [answers, setAnswers] = useState<TasteTreeAnswer[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const current = nodes.get(currentKey)
  const activePath = [...history, currentKey]
  const questionCount = useMemo(() => {
    const walk = (nodeKey: string, visited: Set<string>): number => {
      if (visited.has(nodeKey)) return 0
      const node = nodes.get(nodeKey)
      if (!node) return 0
      const nextVisited = new Set(visited).add(nodeKey)
      const nextDepth = Math.max(
        0,
        ...(node.options ?? []).map((option) => walk(option.targetNodeKey, nextVisited)),
      )
      return (node.type === 'QUESTION' ? 1 : 0) + nextDepth
    }
    return start ? walk(start.key, new Set()) : 0
  }, [nodes, start])

  if (!current) {
    return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{t('tasteTree.invalidTree')}</p>
  }

  const title = isEn ? current.titleEn || current.titleKo : current.titleKo
  const description = isEn
    ? current.descriptionEn || current.descriptionKo
    : current.descriptionKo
  const options = current.options ?? []
  const minSelect = current.minSelect ?? 1
  const maxSelect = current.maxSelect ?? 1
  const selectionValid = current.type !== 'QUESTION'
    || (selectedKeys.length >= minSelect && selectedKeys.length <= maxSelect)

  const choose = (optionKey: string) => {
    if (current.selectionType !== 'MULTIPLE') {
      setSelectedKeys([optionKey])
      return
    }
    setSelectedKeys((previous) => {
      if (previous.includes(optionKey)) return previous.filter((key) => key !== optionKey)
      if (previous.length >= maxSelect) return previous
      return [...previous, optionKey]
    })
  }

  const goNext = async () => {
    if (current.type === 'RESULT') {
      await onComplete(answers)
      return
    }
    let chosenKeys = selectedKeys
    if (current.type === 'START' || current.type === 'INFO') {
      chosenKeys = options[0] ? [options[0].key] : []
    }
    if (!chosenKeys.length || !selectionValid) return
    const selectedOptions = options.filter((option) => chosenKeys.includes(option.key))
    const target = selectedOptions[0]?.targetNodeKey
    if (!target || !nodes.has(target)) return
    if (current.type === 'QUESTION') {
      setAnswers((previous) => [
        ...previous.filter((answer) => answer.nodeKey !== current.key),
        { nodeKey: current.key, optionKeys: chosenKeys },
      ])
    }
    setHistory((previous) => [...previous, current.key])
    setCurrentKey(target)
    setSelectedKeys([])
  }

  const goBack = () => {
    const previousKey = history[history.length - 1]
    if (!previousKey) return
    setHistory((previous) => previous.slice(0, -1))
    setCurrentKey(previousKey)
    const previousAnswer = answers.find((answer) => answer.nodeKey === previousKey)
    setSelectedKeys(previousAnswer?.optionKeys ?? [])
    setAnswers((previous) => previous.filter((answer) => answer.nodeKey !== previousKey))
  }

  const answeredCount = answers.length

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(430px,0.82fr)]">
      <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="border-b border-neutral-100 px-5 py-4 sm:px-7">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-400">
            <span>{current.type === 'RESULT' ? t('tasteTree.ready') : t('tasteTree.progress', { current: Math.min(answeredCount + 1, questionCount), total: questionCount })}</span>
            {current.selectionType === 'MULTIPLE' && (
              <span>{t('tasteTree.selectedCount', { count: selectedKeys.length, max: maxSelect })}</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-amber-600 transition-all"
              style={{ width: `${questionCount ? Math.min(100, ((answeredCount + (current.type === 'RESULT' ? 1 : 0)) / questionCount) * 100) : 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-5 py-7 sm:px-8 sm:py-9">
          <div className="mb-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              {current.type === 'START' ? t('tasteTree.startNode') : current.type === 'RESULT' ? t('tasteTree.resultNode') : t('tasteTree.questionNode')}
            </p>
            <h2 className="text-2xl font-black leading-tight text-neutral-950 sm:text-3xl">{title}</h2>
            {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}
          </div>

          {current.type === 'QUESTION' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {options.map((option) => {
                const selected = selectedKeys.includes(option.key)
                const label = isEn ? option.labelEn || option.labelKo : option.labelKo
                const optionDescription = isEn
                  ? option.descriptionEn || option.descriptionKo
                  : option.descriptionKo
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => choose(option.key)}
                    aria-pressed={selected}
                    className={`min-h-24 rounded-xl border-2 p-4 text-left transition-all ${
                      selected
                        ? 'border-amber-600 bg-amber-50 shadow-sm'
                        : 'border-neutral-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
                    }`}
                  >
                    <span className={`block text-sm font-bold ${selected ? 'text-amber-950' : 'text-neutral-900'}`}>{label}</span>
                    {optionDescription && <span className="mt-1.5 block text-xs leading-5 text-neutral-500">{optionDescription}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {current.type === 'RESULT' && (
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-stone-50 p-6">
              <p className="text-sm font-bold text-amber-900">{t('tasteTree.pathComplete')}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{t('tasteTree.pathCompleteDesc')}</p>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-8">
            <button
              type="button"
              onClick={goBack}
              disabled={!history.length || completing}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
            >
              {t('common.back')}
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={(current.type === 'QUESTION' && !selectionValid) || completing}
              className="rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-900 disabled:opacity-40"
            >
              {completing
                ? t('common.loading')
                : current.type === 'RESULT'
                  ? t('tasteTree.showResult')
                  : current.type === 'START'
                    ? t('tasteTree.start')
                    : t('tasteTree.next')}
            </button>
          </div>
        </div>
      </section>

      <div className="hidden lg:block">
        <TasteTreeGraph
          content={content}
          activeNodeKeys={activePath}
          focusNodeKey={currentKey}
          compact
        />
      </div>
    </div>
  )
}
