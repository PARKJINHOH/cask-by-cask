import { test } from 'node:test'
import assert from 'node:assert/strict'

const {
  reviewCommentToHtml, reviewCommentToText, reviewCommentLength, isBlankReviewComment,
} = await import(
  '@/domain/review/utils/reviewRichText'
)

// ── 에디터 도입 이전에 등록된 리뷰 (순수 텍스트) ──────────────────

test('레거시 순수 텍스트는 escape 하고 줄바꿈을 <br> 로 살려 한 문단에 담는다', () => {
  assert.equal(
    reviewCommentToHtml('첫 줄\n둘째 줄'),
    '<p>첫 줄<br>둘째 줄</p>',
  )
})

test('레거시 본문의 부등호·앰퍼샌드는 태그가 아니라 글자로 보여야 한다', () => {
  assert.equal(
    reviewCommentToHtml('<3 이면서 A & B'),
    '<p>&lt;3 이면서 A &amp; B</p>',
  )
})

test('레거시 순수 텍스트는 텍스트로 뽑을 때 손대지 않는다 (번역 캐시 유지)', () => {
  // 태그가 없는데 엔티티 치환을 돌리면 옛 리뷰의 & 표기가 바뀐다.
  assert.equal(reviewCommentToText('A &amp; B\n둘째 줄'), 'A &amp; B\n둘째 줄')
})

test('CRLF 로 저장된 옛 리뷰도 줄바꿈이 한 번만 들어간다', () => {
  assert.equal(reviewCommentToHtml('한\r\n두'), '<p>한<br>두</p>')
})

// ── 제한형 에디터가 만든 HTML ────────────────────────────────────

test('에디터 HTML 은 그대로 통과시킨다', () => {
  const html = '<p><strong>깊은</strong> <u>여운</u></p>'
  assert.equal(reviewCommentToHtml(html), html)
})

test('공유 이미지·JSON-LD 용으로 태그를 걷어 내고 블록 경계는 줄바꿈으로 바꾼다', () => {
  assert.equal(
    reviewCommentToText('<p>한<br>두</p><p><strong>셋</strong></p>'),
    '한\n두\n셋',
  )
})

test('엔티티는 &amp; 를 마지막에 풀어 이중 해석을 막는다', () => {
  assert.equal(reviewCommentToText('<p>&amp;lt;태그&gt;</p>'), '&lt;태그>')
})

test('서식만 있고 본문이 없는 값도 빈 문자열로 본다', () => {
  assert.equal(reviewCommentToText('<p><strong></strong></p>'), '')
})

// ── 빈 값 판정 ─────────────────────────────────────────────────

test('빈 에디터가 내보내는 <p></p> 는 빈 값으로 판정한다', () => {
  assert.equal(isBlankReviewComment('<p></p>'), true)
  assert.equal(isBlankReviewComment(''), true)
  assert.equal(isBlankReviewComment(null), true)
  assert.equal(isBlankReviewComment(undefined), true)
  assert.equal(isBlankReviewComment('   '), true)
})

test('본문이 있으면 빈 값이 아니다', () => {
  assert.equal(isBlankReviewComment('<p>한 줄</p>'), false)
  assert.equal(isBlankReviewComment('레거시 한 줄'), false)
})

test('빈 값은 HTML 로도 빈 문자열이 된다', () => {
  assert.equal(reviewCommentToHtml(''), '')
  assert.equal(reviewCommentToHtml(null), '')
  assert.equal(reviewCommentToHtml('   '), '')
})

// ── 길이 계산 (에디터 하단 글자수와 같은 기준) ────────────────────
//
// 아래 기대값은 서버 HtmlSanitizer.countCharactersAsEditor(jsoup) 및
// TipTap CharacterCount(doc.textBetween(0, size, undefined, ' ')) 와 같은 결과다.
// 셋 중 하나라도 어긋나면 "600/600 인데 600자를 넘었다"는 막다른 골목이 생긴다.

test('문단 경계는 길이에 더하지 않고 <br> 만 한 칸으로 센다', () => {
  assert.equal(reviewCommentLength('<p>한<br>두</p><p>셋</p>'), 4)
  assert.equal(reviewCommentLength('<p>가나다</p>'), 3)
  assert.equal(
    reviewCommentLength('<p><strong>가</strong><span style="color:red">나</span></p><p>다</p><p>라</p>'),
    4,
  )
})

test('본문 안의 공백은 그대로 센다', () => {
  assert.equal(reviewCommentLength('<p>끝 공백 </p><p> 앞 공백</p>'), 10)
})

test('엔티티는 한 글자로 센다', () => {
  assert.equal(reviewCommentLength('<p>&amp;lt;</p>'), 4)
  assert.equal(reviewCommentLength('<p>A &amp; B</p>'), 5)
})

test('서식 태그는 길이에 포함되지 않는다', () => {
  const plain = '<p>가나다라마</p>'
  const styled = '<p><strong><span style="color: rgb(185, 28, 28); font-size: 18px">가나다라마</span></strong></p>'
  assert.equal(reviewCommentLength(styled), reviewCommentLength(plain))
})

test('레거시 순수 텍스트는 줄바꿈 하나를 한 글자로 센다', () => {
  assert.equal(reviewCommentLength('한\n두'), 3)
  assert.equal(reviewCommentLength('한\r\n두'), 3)
  assert.equal(reviewCommentLength(''), 0)
  assert.equal(reviewCommentLength(null), 0)
})

test('빈 에디터는 길이 0 이다', () => {
  assert.equal(reviewCommentLength('<p></p>'), 0)
})
