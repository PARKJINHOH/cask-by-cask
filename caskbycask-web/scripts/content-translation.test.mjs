import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const api = read('src/domain/translation/api/translationApi.ts')
const hook = read('src/domain/translation/hooks/useContentTranslation.ts')
const action = read('src/domain/translation/components/TranslationAction.tsx')
const textBlock = read('src/domain/translation/components/TranslatableTextBlock.tsx')
const reviewItem = read('src/domain/review/components/ReviewItem.tsx')
const spiritDetail = read('src/views-spa/SpiritDetailPage.tsx')
const publicReview = read('src/views-spa/PublicReviewPage.tsx')
const ko = JSON.parse(read('src/locales/ko.json'))
const en = JSON.parse(read('src/locales/en.json'))
const { detectDominantContentLanguage, shouldOfferContentTranslation } =
  await import('../src/domain/translation/utils/contentLanguage.ts')

test('공개 API는 리소스 식별자와 대상 언어만 보내고 임의 원문을 프록시하지 않는다', () => {
  assert.ok(api.includes("axiosInstance.post<ApiResponse<ContentTranslation>>('/api/translations'"))
  const bodyStart = api.indexOf('{\n      resourceType,')
  const bodyEnd = api.indexOf('\n    })', bodyStart)
  assert.notEqual(bodyStart, -1)
  assert.notEqual(bodyEnd, -1)
  const body = api.slice(bodyStart, bodyEnd)
  assert.match(body, /resourceType[\s\S]*resourceId[\s\S]*targetLanguage/)
  assert.doesNotMatch(body, /\b(text|fields|content)\b/)
})

test('번역은 최초 클릭에만 조회하고 언어·리소스 변경 시 원문 상태로 복귀한다', () => {
  assert.ok(hook.includes('enabled: false'))
  assert.ok(hook.includes('retry: false'))
  assert.ok(hook.includes('query.refetch()'))
  assert.ok(hook.includes('setShowTranslated(false)'))
  assert.match(hook, /\[resourceId, resourceType, targetLanguage\]/)
  assert.ok(hook.includes('activeRequestIdentity.current === startedFor'))
})

test('주류 소개·공유 리뷰 카드·공개 리뷰 상세가 공통 번역 UI를 사용한다', () => {
  assert.ok(spiritDetail.includes('resourceType="SPIRIT_NOTES"'))
  assert.ok(spiritDetail.includes('field="notes"'))
  assert.ok(reviewItem.includes("useContentTranslation('REVIEW', review.id)"))
  assert.ok(publicReview.includes("useContentTranslation('REVIEW', id)"))
  for (const field of ['noseNote', 'tasteNote', 'finishNote', 'comment']) {
    assert.ok(reviewItem.includes(`translated?.${field}`), `ReviewItem ${field} 번역 배선 누락`)
    assert.ok(publicReview.includes(`translated?.${field}`), `PublicReviewPage ${field} 번역 배선 누락`)
  }
  assert.ok(reviewItem.includes('shouldOfferContentTranslation'))
  assert.ok(publicReview.includes('shouldOfferContentTranslation'))
})

test('리뷰 주 언어와 UI 언어가 같을 때만 번역 액션을 숨긴다', () => {
  const koreanReview = ['맥캘란 12년은 Sherry Oak 향이 좋다', '바닐라와 과일 향', '', null]
  const englishReview = ['Macallan Double Cask has a rich sherry aroma', 'Long and warm finish']
  const mixedReview = ['바닐라 vanilla', '오크 oak']

  assert.equal(detectDominantContentLanguage(koreanReview), 'ko')
  assert.equal(shouldOfferContentTranslation(koreanReview, 'ko'), false)
  assert.equal(shouldOfferContentTranslation(koreanReview, 'en'), true)
  assert.equal(detectDominantContentLanguage(englishReview), 'en')
  assert.equal(shouldOfferContentTranslation(englishReview, 'en'), false)
  assert.equal(shouldOfferContentTranslation(englishReview, 'ko'), true)
  assert.equal(detectDominantContentLanguage(mixedReview), null)
  assert.equal(shouldOfferContentTranslation(mixedReview, 'ko'), true)
  assert.equal(shouldOfferContentTranslation(['✨', '123'], 'ko'), false)
})

test('모바일 터치 영역·중복 클릭 방지·스크린리더 상태 안내가 유지된다', () => {
  assert.ok(action.includes('min-h-11'))
  assert.ok(action.includes('disabled={isLoading}'))
  assert.ok(action.includes('aria-busy={isLoading}'))
  assert.ok(action.includes('aria-live="polite"'))
  assert.ok(action.includes("isLoading ? t('translation.loading')"))
  assert.ok(action.includes("t('translation.translate')"))
  assert.ok(action.includes('flex flex-wrap'))
  assert.equal(ko.translation.translate, '번역하기')
  assert.equal(en.translation.translate, 'Translate')
})

test('주류 소개 번역 액션은 텍스트 끝의 작은 배지로 표시되며 터치 영역은 확장된다', () => {
  assert.ok(textBlock.includes('{displayedText.trimEnd()}'))
  assert.match(textBlock, /<TranslationAction[\s\S]*compact/)
  assert.ok(action.includes('rounded-full'))
  assert.ok(action.includes('text-[11px]'))
  assert.ok(action.includes('after:-inset-y-2.5'))
})

test('Google 공식 배지와 링크만 번역 결과 상태에 표시된다', () => {
  const badgePath = join(root, 'public/google-translate-attribution.svg')
  assert.ok(existsSync(badgePath), 'Google 공식 attribution SVG가 필요하다')
  const badge = read('public/google-translate-attribution.svg')
  assert.match(badge, /width="176px" height="16px"/)
  assert.ok(action.includes('href="https://translate.google.com"'))
  assert.ok(action.includes('src="/google-translate-attribution.svg"'))
  assert.ok(action.includes('showTranslated &&'))
  assert.doesNotMatch(action, /noticeTitle|noticeBody|<details/)
})

test('한·영 자동 번역 문구 키가 완전히 동기화되어 있다', () => {
  assert.ok(ko.translation)
  assert.ok(en.translation)
  const flattenKeys = (value, prefix = '') => Object.entries(value).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return nested && typeof nested === 'object' ? flattenKeys(nested, path) : [path]
  })
  assert.deepEqual(flattenKeys(ko.translation).sort(), flattenKeys(en.translation).sort())
})

test('기계 번역문은 공개 리뷰 SEO 메타데이터에 사용하지 않는다', () => {
  const start = publicReview.indexOf('<SeoMeta')
  const end = publicReview.indexOf('/>', start)
  const seoBlock = publicReview.slice(start, end)
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  assert.ok(seoBlock.includes('description={data.comment'))
  assert.doesNotMatch(seoBlock, /translated|contentTranslation/)
})

test('백엔드·프론트 법률 기본 양식에 동일한 자동 번역 고지와 면책조항이 있다', () => {
  const backendLegal = read('../caskbycask-api/src/main/java/com/caskbycask/domain/legal/support/LegalDocumentTemplate.java')
  const frontendLegal = read('src/domain/legal/defaultTemplates.ts')
  for (const phrase of [
    '이용자가 번역을 요청한 공개 주류 소개 및 리뷰·시음 노트 텍스트',
    '닉네임·회원 ID·방문자 IP는 Google에 전송하지 않음',
    'Cloud Translation 글로벌 서비스',
    '원문 수정·숨김·삭제 시까지 보관',
    '본 서비스는 GOOGLE이 제공하는 번역을 포함할 수 있습니다.',
    '상품성, 특정 목적에의 적합성, 비침해성',
    'https://translate.google.com',
  ]) {
    assert.ok(backendLegal.includes(phrase), `백엔드 법률 양식 누락: ${phrase}`)
    assert.ok(frontendLegal.includes(phrase), `프론트 법률 양식 누락: ${phrase}`)
  }
})
