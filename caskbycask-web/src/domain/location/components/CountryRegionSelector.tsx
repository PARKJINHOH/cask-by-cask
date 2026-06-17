import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ISO3166_COUNTRIES } from '../data/iso3166Countries';
import { REGION_SUGGESTIONS, type RegionSuggestion } from '../data/regionSuggestions';

interface Props {
  countryCode: string | null;
  regionNameKo: string;
  onCountryChange: (code: string | null, nameKo: string, nameEn: string) => void;
  onRegionChange: (nameKo: string, nameEn: string) => void;
  disabled?: boolean;
}

const CUSTOM_VALUE = '__custom__';

export default function CountryRegionSelector({
  countryCode,
  regionNameKo,
  onCountryChange,
  onRegionChange,
  disabled,
}: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const regions = countryCode ? (REGION_SUGGESTIONS[countryCode] ?? []) : [];
  const hasRegions = regions.length > 0;

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
    setIsCustomInput(false);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onCountryChange(null, '', '');
    onRegionChange('', '');
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
    <div className="flex gap-2">
      {/* 국가 콤보박스 */}
      <div ref={containerRef} className="relative w-full">
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

      {/* 지역 */}
      {renderRegion()}
    </div>
  );
}
