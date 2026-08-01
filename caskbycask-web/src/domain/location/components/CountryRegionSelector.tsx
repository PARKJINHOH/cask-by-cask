import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ISO3166_COUNTRIES } from '../data/iso3166Countries';
import { REGION_SUGGESTIONS, type RegionSuggestion } from '../data/regionSuggestions';
import WineRegionSelector from './WineRegionSelector';
import { useWineRegionCatalog, REGION_CATALOG_CATEGORIES } from '../hooks/useWineRegionCatalog';
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types';

interface Props {
  countryCode: string | null;
  regionNameKo: string;
  onCountryChange: (code: string | null, nameKo: string, nameEn: string) => void;
  onRegionChange: (nameKo: string, nameEn: string) => void;
  disabled?: boolean;
  /**
   * 카테고리와 국가가 산지 카탈로그에 있으면 산지 2단 선택기를 쓴다.
   * 미전달(생산자 등록 등)이면 기존 동작을 그대로 유지한다.
   */
  category?: SpiritCategory | null;
  /** 산지 코드 — 카탈로그 모드에서 사용 */
  regionCode?: string | null;
  onRegionCodeChange?: (code: string | null) => void;
  /** 관리자 화면은 한국어 고정 */
  admin?: boolean;
}

const CUSTOM_VALUE = '__custom__';

export default function CountryRegionSelector({
  countryCode,
  regionNameKo,
  onCountryChange,
  onRegionChange,
  disabled,
  category,
  regionCode,
  onRegionCodeChange,
  admin,
}: Props) {
  const { t, i18n } = useTranslation();
  const tr = (key: string, opts?: Record<string, unknown>) =>
    t(key, admin ? { lng: 'ko', ...(opts ?? {}) } : opts);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const regions = countryCode ? (REGION_SUGGESTIONS[countryCode] ?? []) : [];
  const hasRegions = regions.length > 0;

  // 산지 카탈로그 모드 — 카테고리가 카탈로그 대상(와인·위스키)이고
  // 그 국가가 카탈로그에 있을 때만 사용한다.
  // 카탈로그에 없는 국가(예: 멕시코)는 기존 지역 목록으로 자연스럽게 폴백된다.
  const catalogCategory =
    category && REGION_CATALOG_CATEGORIES.includes(category) ? category : null;
  const wineMode = !!catalogCategory && !!onRegionCodeChange;
  const { isSupportedCountry } = useWineRegionCatalog(
    wineMode && !!countryCode,
    catalogCategory ?? 'WINE',
  );
  const useWineRegions = wineMode && isSupportedCountry(countryCode);

  // 저장된 지역 값(한국어/영어 어느 쪽이든)을 목록 항목과 매칭 (대소문자·공백 무시)
  const norm = (s: string) => s.trim().toLowerCase();
  const findRegion = (list: RegionSuggestion[], value: string) =>
    value
      ? list.find((r) => norm(r.nameKo) === norm(value) || norm(r.nameEn) === norm(value))
      : undefined;

  // 편집 진입 시 regionNameKo 가 목록에 없으면 직접입력 모드로 시작
  const [isCustomInput, setIsCustomInput] = useState(() => {
    if (!regionNameKo || !countryCode) return false;
    const initial = REGION_SUGGESTIONS[countryCode] ?? [];
    if (initial.length === 0) return false;
    return !findRegion(initial, regionNameKo);
  });

  const display = (nameKo: string, nameEn: string) =>
    i18n.language === 'ko' ? nameKo : nameEn;

  const selectedCountry = countryCode
    ? ISO3166_COUNTRIES.find((x) => x.code === countryCode)
    : null;

  const filtered = query.trim()
    ? ISO3166_COUNTRIES.filter(
        (c) =>
          c.nameKo.includes(query) ||
          c.nameEn.toLowerCase().includes(query.toLowerCase()) ||
          c.code.toLowerCase().includes(query.toLowerCase())
      )
    : ISO3166_COUNTRIES;

  // 국가를 바꾸면 직접입력 모드를 해제하고 지역 값도 초기화 (국가 변경 경로는 이 두 핸들러뿐)
  const handleSelect = (code: string) => {
    const c = ISO3166_COUNTRIES.find((x) => x.code === code)!;
    onCountryChange(code, c.nameKo, c.nameEn);
    onRegionChange('', '');
    onRegionCodeChange?.(null);
    setIsCustomInput(false);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onCountryChange(null, '', '');
    onRegionChange('', '');
    onRegionCodeChange?.(null);
    setIsCustomInput(false);
    setQuery('');
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cls =
    'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm bg-white ' +
    'focus:outline-none focus:ring-2 focus:ring-primary-400 ' +
    'disabled:bg-neutral-50 disabled:text-neutral-400';

  // 지역 영역 렌더링
  const renderRegion = () => {
    // 산지 카탈로그 모드 — 카탈로그 기반 2단 선택기 (지도 표시용 코드 저장)
    if (useWineRegions) {
      return (
        <WineRegionSelector
          countryCode={countryCode}
          regionCode={regionCode ?? null}
          category={catalogCategory ?? 'WINE'}
          disabled={disabled}
          admin={admin}
          onChange={(code, l1NameKo, l1NameEn) => {
            onRegionCodeChange?.(code);
            // 지역 텍스트도 L1 이름으로 맞춰 폼 상태와 저장 결과를 일치시킨다
            onRegionChange(l1NameKo, l1NameEn);
          }}
        />
      );
    }

    // 국가에 사전 정의된 지역 목록이 없는 경우 → 텍스트 입력
    if (!hasRegions) {
      return (
        <input
          value={regionNameKo}
          onChange={(e) => onRegionChange(e.target.value, e.target.value)}
          disabled={disabled || !countryCode}
          placeholder={countryCode ? t('location.regionPlaceholder') : t('location.selectCountryFirst')}
          maxLength={100}
          className={cls}
        />
      );
    }

    // 직접 입력 모드
    if (isCustomInput) {
      return (
        <div className="relative w-full">
          <input
            autoFocus
            value={regionNameKo}
            onChange={(e) => onRegionChange(e.target.value, e.target.value)}
            disabled={disabled}
            placeholder={t('location.customInputPlaceholder')}
            maxLength={100}
            className={`${cls} pr-8`}
          />
          <button
            type="button"
            onClick={() => {
              setIsCustomInput(false);
              onRegionChange('', '');
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs leading-none"
            title={t('location.backToList')}
          >
            ✕
          </button>
        </div>
      );
    }

    // 사전 정의 목록 select + 직접 입력 옵션
    // 저장값이 영어(nameEn)로 들어와도 매칭되도록 정규화한 nameKo 를 select value 로 사용
    const matched = findRegion(regions, regionNameKo);
    return (
      <select
        className={cls}
        value={matched ? matched.nameKo : ''}
        onChange={(e) => {
          if (e.target.value === CUSTOM_VALUE) {
            setIsCustomInput(true);
            onRegionChange('', '');
          } else {
            const nameKo = e.target.value;
            const r = regions.find((x) => x.nameKo === nameKo);
            onRegionChange(nameKo, r?.nameEn ?? '');
          }
        }}
        disabled={disabled || !countryCode}
      >
        <option value="">{t('location.selectRegion')}</option>
        {regions.map((r) => (
          <option key={r.nameKo} value={r.nameKo}>
            {display(r.nameKo, r.nameEn)}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>{t('location.customInput')}</option>
      </select>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-3 w-full min-w-0">
      {/* 국가는 한 줄 전체 폭을 사용한다. 산지 2단 선택기가 다시 분할되므로
          같은 줄에 두면 L1/L2 가 카드 폭의 1/4까지 줄어드는 문제가 있었다. */}
      <div ref={containerRef} className="relative w-full min-w-0">
        {open ? (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('location.searchCountry')}
            disabled={disabled}
            className={cls}
          />
        ) : (
          <button
            type="button"
            onClick={() => !disabled && setOpen(true)}
            disabled={disabled}
            className={`${cls} text-left flex items-center justify-between`}
          >
            <span className={selectedCountry ? 'text-neutral-900' : 'text-neutral-400'}>
              {selectedCountry ? display(selectedCountry.nameKo, selectedCountry.nameEn) : t('location.selectCountry')}
            </span>
            {selectedCountry ? (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="ml-1 text-neutral-400 hover:text-neutral-600 leading-none"
              >
                ✕
              </span>
            ) : (
              <span className="text-neutral-400 text-xs">▼</span>
            )}
          </button>
        )}

        {open && (
          <ul className="absolute z-50 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-neutral-400">{t('location.noResult')}</li>
            ) : (
              filtered.map((c) => (
                <li
                  key={c.code}
                  onMouseDown={() => handleSelect(c.code)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 hover:text-amber-800"
                >
                  {display(c.nameKo, c.nameEn)}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* 지역/산지는 다음 줄 전체 폭에서 렌더한다. */}
      <div className="w-full min-w-0">
        {renderRegion()}
        {useWineRegions && !regionCode && regionNameKo.trim() && (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
            {tr('location.wineRegion.legacyUnmapped', { region: regionNameKo })}
          </p>
        )}
      </div>
    </div>
  );
}
