const KO_TO_EN: Record<string, string> = {
  '스코틀랜드': 'Scotland',
  '일본':       'Japan',
  '미국':       'United States',
  '아일랜드':   'Ireland',
  '프랑스':     'France',
  '멕시코':     'Mexico',
  '자메이카':   'Jamaica',
  '러시아':     'Russia',
  '네덜란드':   'Netherlands',
  '스웨덴':     'Sweden',
  '호주':       'Australia',
  '대만':       'Taiwan',
  '인도':       'India',
  '캐나다':     'Canada',
  '스페인':     'Spain',
  '이탈리아':   'Italy',
  '중국':       'China',
  '독일':       'Germany',
  '영국':       'United Kingdom',
  '덴마크':     'Denmark',
  '핀란드':     'Finland',
}

const EN_TO_KO: Record<string, string> = Object.fromEntries(
  Object.entries(KO_TO_EN).map(([k, v]) => [v, k]),
)

export function localizeCountry(country: string | null | undefined, lang: string): string {
  if (!country) return ''
  if (lang === 'en') return KO_TO_EN[country] ?? country
  return EN_TO_KO[country] ?? country
}
