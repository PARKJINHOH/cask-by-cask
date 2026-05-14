import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ISO3166_COUNTRIES } from '../data/iso3166Countries';
import { REGION_SUGGESTIONS } from '../data/regionSuggestions';

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
  const { i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const regions = countryCode ? (REGION_SUGGESTIONS[countryCode] ?? []) : [];
  const hasRegions = regions.length > 0;

  // 편집 진입 시 regionNameKo 가 목록에 없으면 직접입력 모드로 시작
  const [isCustomInput, setIsCustomInput] = useState(() => {
    if (!regionNameKo || !countryCode) return false;
    const initial = REGION_SUGGESTIONS[countryCode] ?? [];
    if (initial.length === 0) return false;
    return !initial.some((r) => r.nameKo === regionNameKo);
  });

  // 국가가 바뀌면 직접입력 모드 초기화 (첫 렌더는 건너뜀)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setIsCustomInput(false);
  }, [countryCode]);

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

  const handleSelect = (code: string) => {
    const c = ISO3166_COUNTRIES.find((x) => x.code === code)!;
    onCountryChange(code, c.nameKo, c.nameEn);
    onRegionChange('', '');
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onCountryChange(null, '', '');
    onRegionChange('', '');
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
          placeholder={countryCode ? '지역 입력 (선택)' : '국가를 먼저 선택하세요'}
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
            placeholder="지역 직접 입력"
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
            title="목록으로 돌아가기"
          >
            ✕
          </button>
        </div>
      );
    }

    // 사전 정의 목록 select + 직접 입력 옵션
    return (
      <select
        className={cls}
        value={regionNameKo}
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
        <option value="">지역 선택</option>
        {regions.map((r) => (
          <option key={r.nameKo} value={r.nameKo}>
            {display(r.nameKo, r.nameEn)}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>✏ 직접 입력</option>
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
            placeholder="국가 검색..."
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
              {selectedCountry ? display(selectedCountry.nameKo, selectedCountry.nameEn) : '국가 선택'}
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
              <li className="px-3 py-2 text-sm text-neutral-400">검색 결과 없음</li>
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
