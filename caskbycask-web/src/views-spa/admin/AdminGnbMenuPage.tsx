import { useEffect, useMemo, useState } from 'react'
import ko from '@/locales/ko.json'
import {
  GNB_MENUS,
  GNB_MENU_KEYS,
  isGnbGroup,
} from '@/domain/gnb-menu/constants/gnbMenu'
import {
  useAdminGnbMenus,
  useUpdateGnbMenuVisibility,
} from '@/domain/gnb-menu/hooks/useGnbMenus'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

/**
 * 번역키를 한국어 라벨로 바꾼다.
 *
 * 관리자 화면은 한국어 고정이라 현재 i18n 언어를 따르지 않고 ko.json 을 직접 읽는다.
 * (관리자가 사용자 화면을 영어로 보고 있어도 관리 화면 라벨은 한국어여야 한다)
 */
function koLabel(labelKey: string): string {
  const resolved = labelKey.split('.').reduce<unknown>(
    (acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined),
    ko as unknown,
  )
  return typeof resolved === 'string' ? resolved : labelKey
}

type MenuRow = {
  key: string
  label: string
  /** 그룹(드롭다운 부모)은 자체 경로가 없다. */
  to: string | null
  isChild: boolean
  parentKey: string | null
  /** 그룹이면 자식 키 목록. 단일 링크 메뉴는 빈 배열. */
  childKeys: string[]
}

/** 카탈로그를 화면에 뿌릴 평면 목록으로 만든다. 부모 바로 아래에 자식이 붙는다. */
function buildRows(): MenuRow[] {
  return GNB_MENUS.flatMap<MenuRow>((menu) => {
    const parentRow: MenuRow = {
      key: menu.key,
      label: koLabel(menu.labelKey),
      to: isGnbGroup(menu) ? null : menu.to,
      isChild: false,
      parentKey: null,
      childKeys: isGnbGroup(menu) ? menu.children.map((child) => child.key) : [],
    }
    if (!isGnbGroup(menu)) return [parentRow]

    return [
      parentRow,
      ...menu.children.map<MenuRow>((child) => ({
        key: child.key,
        label: koLabel(child.labelKey),
        to: child.to,
        isChild: true,
        parentKey: menu.key,
        childKeys: [],
      })),
    ]
  })
}

function VisibilityToggle({
  visible,
  disabled,
  onToggle,
  label,
}: {
  visible: boolean
  disabled: boolean
  onToggle: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-label={`${label} 노출`}
      disabled={disabled}
      onClick={onToggle}
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full',
        'border-2 border-transparent transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        visible ? 'bg-primary-800' : 'bg-neutral-300',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'transform transition-transform duration-200',
          visible ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export default function AdminGnbMenuPage() {
  const { data: rows, isLoading } = useAdminGnbMenus()
  const visibilityMutation = useUpdateGnbMenuVisibility()
  const { toasts, showToast, removeToast } = useToast()

  const menuRows = useMemo(buildRows, [])

  // 카탈로그가 기준이고 서버 행은 노출값 덮어쓰기용이다. 행이 없는 키는 노출(true).
  const [localVisibility, setLocalVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GNB_MENU_KEYS.map((key) => [key, true])),
  )

  useEffect(() => {
    if (!rows) return
    const merged: Record<string, boolean> = Object.fromEntries(
      GNB_MENU_KEYS.map((key) => [key, true]),
    )
    // 카탈로그에서 사라진 옛 키의 행이 남아 있을 수 있다 — 무시한다.
    rows.forEach((row) => {
      if (row.menuKey in merged) merged[row.menuKey] = row.isVisible
    })
    setLocalVisibility(merged)
  }, [rows])

  const handleToggle = async (menuKey: string) => {
    const previous = localVisibility[menuKey] ?? true
    setLocalVisibility((map) => ({ ...map, [menuKey]: !previous }))
    try {
      await visibilityMutation.mutateAsync({ menuKey, isVisible: !previous })
    } catch {
      setLocalVisibility((map) => ({ ...map, [menuKey]: previous }))
      showToast('노출 상태 변경 중 오류가 발생했습니다.', 'error')
    }
  }

  const hiddenCount = menuRows.filter((row) => localVisibility[row.key] === false).length

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">사용자 메뉴 노출</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            총 {menuRows.length}개 · 미노출 {hiddenCount}개
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 leading-relaxed">
        사용자 화면 상단 GNB 에서 메뉴를 감춥니다. <strong>페이지 자체는 차단되지 않습니다</strong> —
        주소를 직접 열거나 기존 링크·검색으로 들어오면 그대로 보입니다.
        <br />
        상위 메뉴를 끄면 하위 메뉴도 함께 사라지고, 하위 메뉴를 모두 끄면 상위 메뉴도 표시되지 않습니다.
        <br />
        이벤트 달력 버튼은 관리 대상이 아니라 항상 노출됩니다.
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-400">불러오는 중…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-semibold text-neutral-500">
              <tr>
                <th className="px-4 py-3">메뉴</th>
                <th className="px-4 py-3">경로</th>
                <th className="w-28 px-4 py-3">노출</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {menuRows.map((row) => {
                const visible = localVisibility[row.key] ?? true
                const parentHidden =
                  row.parentKey != null && localVisibility[row.parentKey] === false
                // 그룹은 켜져 있어도 자식이 전부 숨겨지면 화면에서 사라진다
                // (빈 드롭다운을 남기지 않기 위한 규칙). 그 사실을 여기서 드러낸다.
                const emptyGroup =
                  visible &&
                  row.childKeys.length > 0 &&
                  row.childKeys.every((childKey) => localVisibility[childKey] === false)

                return (
                  <tr key={row.key} className={row.isChild ? 'bg-neutral-50/40' : ''}>
                    <td className="px-4 py-3">
                      <div className={row.isChild ? 'pl-6' : ''}>
                        <span
                          className={
                            row.isChild
                              ? 'text-neutral-700'
                              : 'font-semibold text-neutral-900'
                          }
                        >
                          {row.isChild && <span className="mr-1.5 text-neutral-300">└</span>}
                          {row.label}
                        </span>
                        {row.to == null && (
                          <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                            드롭다운
                          </span>
                        )}
                        {emptyGroup && (
                          <p className="mt-1 text-xs text-amber-700">
                            하위 메뉴가 모두 숨겨져 이 메뉴도 화면에 표시되지 않습니다.
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                      {row.to ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <VisibilityToggle
                          visible={visible}
                          disabled={parentHidden}
                          onToggle={() => handleToggle(row.key)}
                          label={row.label}
                        />
                        {parentHidden && (
                          <span className="text-xs text-neutral-400">상위 숨김</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
