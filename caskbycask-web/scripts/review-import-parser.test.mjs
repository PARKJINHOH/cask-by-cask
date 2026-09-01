import { test } from 'node:test'
import assert from 'node:assert/strict'

const { parseReviewText } = await import('@/domain/review/utils/reviewImportParser')

/**
 * 픽스처는 전부 실제 게시글에서 가져온 형태다 —
 * 디시인사이드 위스키 갤러리(`gall.dcinside.com/mgallery/board/lists/?id=whiskey&search_head=120`)와
 * 아카라이브 주류 채널(`arca.live/b/alcohol?category=리뷰`)의 2026-08-30 리뷰 목록.
 *
 * 규칙을 추가·수정할 때는 근거가 된 원문 형태를 여기에 먼저 남길 것.
 * 픽스처 없는 규칙은 다음 사람이 지워도 되는지 알 수 없다.
 */

const warn = (plan, code) => plan.warnings.some((w) => w.code === code)

// ── T1: `N:` `P:` `F:` + `총평)` (디시 1771938 · 1771927) ─────────

const T1 = `시작에 앞서 나눔 주신 [글로벌호구] 님 감사합니다.

N: 말린바나나칩 캬라멜 바닐라 시나몬
- 도수에 비해 부드럽고 알콜이 치질 않는다.
- 바닐라에 말린 바나나 칩이 더해져서 부드럽고 달달한 향이 난다.
- 버번의 캬라멜
- 특이하게 시나몬 향도 난다.

P: 캬라멜 오크 시나몬 바나나칩 시트러스
- 캬라멜의 진한 단맛이 올라온다.
- 오크의 우디함이 맛의 씁쓸함을 더해준다.
- 잘 말린 바나나칩의 부드럽지만 녹진한 바나나 단맛

F: 오크 캬라멜 시트러스
- 도수에 비례하듯 어느정도 이어지는 여운
- 캬라멜의 설탕 태운 단맛
- 잘 태운 오크의 우디함

총평) 올드 포레스터는 처음인데 맛있네요.
적당한 무게감에 시트러스가 인상적이라 마시는 내내 즐거웠습니다.

- dc official App`

test('T1 — N:/P:/F: + 총평) 을 네 칸으로 나눈다', () => {
  const plan = parseReviewText(T1)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('말린바나나칩 캬라멜 바닐라 시나몬'))
  assert.ok(plan.noseNote.includes('특이하게 시나몬 향도 난다.'))
  assert.ok(plan.tasteNote.startsWith('캬라멜 오크 시나몬'))
  assert.ok(plan.finishNote.startsWith('오크 캬라멜 시트러스'))
  assert.ok(plan.comment.includes('올드 포레스터는 처음인데 맛있네요.'))
})

test('T1 — 향 노트에 맛·피니시 내용이 새지 않는다', () => {
  const plan = parseReviewText(T1)
  assert.ok(!plan.noseNote.includes('캬라멜의 진한 단맛'))
  assert.ok(!plan.tasteNote.includes('도수에 비례하듯'))
  assert.ok(!plan.finishNote.includes('올드 포레스터는 처음인데'))
})

test('T1 — dc 앱 꼬리말과 나눔 인사는 버린다', () => {
  const plan = parseReviewText(T1)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join('\n')
  assert.ok(!all.includes('dc official App'))
  assert.ok(!all.includes('나눔 주신'))
})

test('T1 — 점수가 없는 글은 세 점수를 모두 비운다', () => {
  const plan = parseReviewText(T1)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
  assert.equal(plan.finishScore, null)
})

// ── T7: `N (85)` + `평점:` + `한줄평:` (디시 1771705) ─────────────

const T7 = `오늘 궁금해서 질문했던 글에서 글렌알라키 15년을 기준으로 점수를 주신다고 하신 댓글을 확인하여 리뷰글을 작성하였습니다.

글렌알라키 15년 46%

N (85) 익은사과 시나몬 흑설탕
빨갛게 익은 사과의 살짝 새콤한 느낌과 달달한 느낌이 시나몬의 뉘앙스와 섞여 엄청나게 달달하게 느껴짐.

P (85) 흑설탕 스파이시 향신료 견과류 우디 다크초콜릿
혀에 넣으면 노징에서 느껴졌던 흑설탕의 달달한 느낌이 먼저 다가옴.

F (85) 익은사과 흑설탕 다크초콜릿 너티함 향신료
피니시에서도 빨갛게 익은 사과의 느낌이 먼저 다가옴

평점: 85
한줄평: 달달하지만 사이사이 느껴지는 향신료의 노트와 견과류가 은근 킥으로 느껴지는 한잔`

test('T7 — 라벨 괄호 안 점수를 세 칸에 그대로 넣는다', () => {
  const plan = parseReviewText(T7)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 85)
  assert.equal(plan.tasteScore, 85)
  assert.equal(plan.finishScore, 85)
  assert.ok(plan.applied.includes('score'))
})

test('T7 — 한줄평이 총평 칸에 들어간다', () => {
  const plan = parseReviewText(T7)
  assert.ok(plan.comment.includes('달달하지만 사이사이 느껴지는 향신료'))
})

// ── T2: 같은 라벨이 두 번 — 비교 리뷰 (디시 1771945) ──────────────

const T2 = `아란 21주년
N 은은하고 달콤한 열대과일, 라프랑스와 배, 플로럴 비누 살구느낌 향이 매우 좋다. 90
P 향보다는 맛에서 쉐리의 뉘양스가 크게 난다. 약간의 떫은맛, 오렌지. 89
F 과일과 향신료의 조화로움이 있는데 부드러운 생초콜릿의 느낌이 남는다. 89
총평 : 맛있다. 향에서는 버번캐라고 생각되는 느낌도 있다.

몰트맨 아란 11년 2014
N 일단 재미있다. 동양풍의 향신료, 대추야자, 말린대추, 계피, 살구청이나 잼
P 부담스러운 팔레트, 밀도가 엄청나다. 수정과가 생각남, 동양적인 향신료
F 팔레트까지 끝난 뒤에 오는 씁쓸함과 약간의 알콜맛이 남아있음
총평 이게 이가격이면 많이 싼것같은데?`

test('T2 — 향·맛·피니시가 두 번 반복되면 비교 리뷰로 막는다', () => {
  const plan = parseReviewText(T2)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'labelRepeated')
})

test('T2 — 비교 리뷰는 폼에 넣을 값을 하나도 만들지 않는다', () => {
  const plan = parseReviewText(T2)
  assert.equal(plan.noseNote, '')
  assert.equal(plan.tasteNote, '')
  assert.equal(plan.finishNote, '')
  assert.equal(plan.comment, '')
  assert.equal(plan.noseScore, null)
  assert.deepEqual(plan.applied, [])
})

// ── T3: `vs` 비교 시음 (디시 1771926) ────────────────────────────

const T3 = `마침 어제 논현동 몰트바에서 골드 포일과 Beacon을 같이 마실 기회가 생겨서 바로 비교시음해봤다.

--- Nose
Beacon: 잔에 코를 갖다 대자마자 강한 체리 향이 그대로 치고 올라온다.
Gold Foil 16: 반면 골드 포일은 의외로 굉장히 드라이하다.

--- Palate
Beacon: 얘는 그냥 대놓고 달다. 입에 넣자마자 체리 사탕.
Gold Foil 16: 골드 포일은 완전히 다른 방향이다. 확실히 비콘보다 드라이하다.

--- Finish
Beacon: 길게 이어진다.
Gold Foil 16: 라이 스파이스가 남는다.`

test('T3 — 제목·본문의 vs / 비교시음을 비교 리뷰로 막는다', () => {
  const plan = parseReviewText(T3, { title: '위위리) 비콘 vs 골드 포일 — 둘 중 승자는?' })
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'versus')
})

test('T3 — 제목이 없어도 본문만으로 비교 리뷰를 잡는다', () => {
  const plan = parseReviewText(T3)
  assert.equal(plan.outcome, 'comparison')
})

// ── T5: 음용법별로 같은 라벨 3회 (디시 1771464) ──────────────────

const T5 = `티처스 하이랜드 크림
도수: 40% / 용량: 700ml / 가격: 9,900원 / 원산지: 영국

외관- 연한 호박색&금색
향- 일단 알콜향 약하다! 상큼한 과실향이 지배적인데, 약간 사과 비슷한 냄새인듯
맛- 목넘김 매우 부드럽다. 은은한 단맛과 고소한맛 느껴지고

얼음넣고 온더락으로도 마셔봄.
향- 거의 희석되서 아예 무취 수준. 냄새가 잘 안남
맛- 하이랜드 크림 이라는 이름에 걸맞게 뭔가 크림같은 질감이 느껴진다!

하이볼로도 마셔봤다!!
향- 약간의 오크,훈연 냄새 남
맛- 술맛은 거의 안나고, 부드러운 목넘김에 끝에 레몬 상큼함

※총평 이게 어떻게 9900원이냐??? 진심으로 한 2~3만원대여도 사마실듯`

test('T5 — 같은 라벨이 세 번(니트·온더락·하이볼) 나오면 자동 파싱을 멈춘다', () => {
  const plan = parseReviewText(T5)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'labelRepeated')
})

// ── T6: 라벨 없는 번호 목록 다건 리뷰 (디시 1771620) ─────────────

const T6 = `오늘의 라인업

1. Kyrö Malt — 가장 기억에 남은 위스키
오늘 최대의 발견. 곡물, 호밀빵, 고소함, 향신료가 전부 같은 뿌리에서 갈라져 나온 것처럼 느껴졌다.

2. Octomore 14.3 — 오늘 가장 충격적인 위스키
피트의 강도 자체도 엄청났지만 노즈와 팔레트의 엄청난 괴리가 가장 인상적이었다.

3. Kavalan Vinho Barrique — 혼자 완결되는 위스키
원래부터 좋은 술이라는 걸 다시 확인했다.`

test('T6 — 라벨 없이 번호로 나열한 다건 리뷰는 비교로 막는다', () => {
  const plan = parseReviewText(T6)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'numberedList')
})

// ── T4: 총평 라벨 없이 `87/100` 으로 마무리 (디시 1771857) ────────

const T4 = `좋은 선물을 받아 첫 글렌알라키를 고급진 녀석으로 입문하게 되었네.

N: -. 잔에 따르자마자 퍼지는 바나나 브륄레
-. 브륄레에 이어지는 흑설탕 계피 넛맥 쌓인낙엽 담뱃잎 시가 커피 감초 나무껍질

P: -. 혀에 닿는 순간은 다크 초콜릿, 코코아 파우더 등 살짝은 텁텁한 카카오 초콜릿
-. 흑설탕 시럽에서 후추 정향 등의 약 스파이시

F: -. 넛맥 헤이즐넛 등의 견과류의 고소함
-. 삼킨 뒤에는 모카라떼 같은 크리미한 원두맛
-. 씁쓸하지만 달콤한 말린 대추, 오렌지 제스트 같은 약간의 시트러스
87/100. 요거 25 언더? 살만하다. 쌍화탕 같은 한약재의 씁쓸하면서 달콤함,
핸드 드립 커피를 좋아하는 사람이라면 아주 맛있게 먹을 수 있을 것 같다.

- dc official App`

test('T4 — 총평 라벨이 없으면 점수 줄부터를 총평으로 뗀다', () => {
  const plan = parseReviewText(T4)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.includes('요거 25 언더? 살만하다'))
  assert.ok(!plan.finishNote.includes('요거 25 언더'))
  assert.ok(plan.finishNote.includes('넛맥 헤이즐넛'))
  assert.ok(warn(plan, 'overallInferred'))
})

test('T4 — 총점 87/100 만 있으면 세 점수를 비우고 알린다', () => {
  const plan = parseReviewText(T4)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
  assert.equal(plan.finishScore, null)
  assert.ok(warn(plan, 'overallOnly'))
})

test('T4 — 도입부는 버리지 않고 총평 앞에 붙인다', () => {
  const plan = parseReviewText(T4)
  assert.ok(plan.comment.includes('좋은 선물을 받아'))
  assert.ok(warn(plan, 'leftoverMerged'))
})

// ── T12: 구간마다 `총평.`, 진짜 총평은 `결론.` (아카라이브 닛카) ──

const T12 = `브랜디 정보
닛카 애플 브랜디 12년 (40%)
테이스팅 잔 글랜캐런 잔

C.- 진한 골드브라운
- 레그는 없다

N.- 과숙된 사과를 설탕에 졸인듯한 향
- 약간 느껴지는 에스테르
총평. 뚜따라서 그런가 사과향, 약간의 본드 말고는 느껴지는게 없다

P. - 워터리
- 맛이 없다
- 후추 따위의 스파이스
총평.? 이거 왜 아무맛도 안나는거지????

F.- 미약한 사과의 새콤함
- 에스테르
- 짧은 피니시
총평.기대했던 것 보다는 밍밍한 피니시, 짧은 피니시다.

결론.원료가 되는 애플와인을 굉장히 맛있게 먹어서 기대를 많이 했던 술인데, 기대 이하의 퍼포먼스를 보여주는중이다.`

test('T12 — 구간마다 나오는 총평. 에 속지 않고 결론. 을 총평으로 잡는다', () => {
  const plan = parseReviewText(T12)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.includes('원료가 되는 애플와인'))
  assert.ok(!plan.comment.includes('뚜따라서 그런가'))
  assert.ok(warn(plan, 'overallRepeated'))
})

test('T12 — 채택하지 않은 구간별 소감은 앞 구간 노트에 남긴다', () => {
  const plan = parseReviewText(T12)
  assert.ok(plan.noseNote.includes('뚜따라서 그런가'))
  assert.ok(plan.tasteNote.includes('이거 왜 아무맛도 안나는거지'))
  assert.ok(plan.finishNote.includes('밍밍한 피니시'))
})

test('T12 — C.(외관)·테이스팅 잔 같은 스펙 줄은 노트에 섞이지 않는다', () => {
  const plan = parseReviewText(T12)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote].join('\n')
  assert.ok(!all.includes('진한 골드브라운'))
  assert.ok(!all.includes('글랜캐런'))
})

// ── T14: 괄호 라벨 + 구분자 없이 붙은 총평 (아카라이브 진 리뷰) ──

const T14 = `테일즈 2.5주년 예약했다가 수령해온거, 오늘 날도 습하고 해서 진부터 오픈해보았음

(향)향긋한 보태니컬 향. 예전에 먹었던 로쿠진이나 봄베이 사파이어에 비해서는 향 자체의 자극은 약한 느낌
(팔레트)전혀 기대하지 않았는데 처음 딱 먹자마자 엄청 달달함. 향긋한 보태니컬 향이 퍼지는데 은은하게 깔리는 느낌
(피니쉬)피니쉬는 도수에 비해서는 길지 않음. 마지막에 풀풀풀풀 하면서 끝나는데
총평진을 많이 안먹어본 입장에서, 생각보단 나쁘지 않으나, 막 그렇게 찾아먹을 맛도 아닌듯.`

test('T14 — 구분자 없이 본문이 붙은 `총평진을` 도 총평으로 읽는다', () => {
  const plan = parseReviewText(T14)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.includes('진을 많이 안먹어본 입장에서'))
})

test('T14 — `향긋한` 은 향 라벨이 아니다', () => {
  const plan = parseReviewText(T14)
  assert.ok(plan.noseNote.startsWith('향긋한 보태니컬 향.'))
  assert.ok(plan.tasteNote.includes('엄청 달달함'))
  assert.ok(plan.finishNote.includes('풀풀풀풀'))
})

// ── T9: 위스키베이스 점수를 내 점수로 읽지 않기 (디시 1771267) ───

const T9 = `도수: 46.0도
상태: 방금 뚜따
스펙: 스트라스밀, 38년, Hogshead
위베 91.33 (보트 수 <10)

향(Nose)
나무 찬장, 먼지(스모키와는 또 다른), 나무뿌리나 목재 가구 등 나무의 이미지가 주로 연상되는 향.

맛(Palate)
워터리하고 팔레트가 살짝 비어있는 인상을 받음. 숙성년수 생각하면 굉장히 가볍다.

피니쉬(Finish)
짧다. 숙성년수에 비하면 그다지 강렬하거나 길지 않은 피니쉬. 좋게 말하면 깔끔함.

총평
첫 고숙+스트라밀 조합. 면꽉이라 도전해봤다 정도의 의의가 있는 바틀.`

test('T9 — 위베(위스키베이스) 점수를 내 점수로 가져오지 않는다', () => {
  const plan = parseReviewText(T9)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
  assert.equal(plan.finishScore, null)
})

test('T9 — 도수·상태·스펙·위베 줄은 총평에 섞이지 않는다', () => {
  const plan = parseReviewText(T9)
  assert.ok(!plan.comment.includes('91.33'))
  assert.ok(!plan.comment.includes('46.0도'))
  assert.ok(plan.comment.includes('첫 고숙+스트라밀 조합'))
})

test('T9 — 괄호를 곁들인 한글 라벨(향(Nose))을 읽는다', () => {
  const plan = parseReviewText(T9)
  assert.ok(plan.noseNote.startsWith('나무 찬장'))
  assert.ok(plan.tasteNote.startsWith('워터리하고'))
  assert.ok(plan.finishNote.startsWith('짧다.'))
})

// ── T10: 피니시가 없는 글 (아카라이브 탐두 15년) ─────────────────

const T10 = `Tamdhu 15 Years old
주종 - 스카치 싱글몰트 위스키
증류소 - 탐두(Tamdhu)
년수 - 15년
도수 - 46%
캐스크 - Sherry oak casks
병 상태 - 뚜따

향 - 달큰상큼한 포도, 곡물
맛 - 포도 계열의 건과일, 약간 상큼한 느낌의 과일, 이어서 곡물, 약간의 스파이시

몇 년 전에 바에서 먹어본 이후 처음으로 사본 탐두다. 셰리하면 응당 생각날만한 그런 맛이 잘 남`

test('T10 — 피니시가 없으면 찾은 향·맛만 채우고 피니시는 비워 둔 채 알린다', () => {
  const plan = parseReviewText(T10)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('달큰상큼한 포도'))
  assert.ok(plan.tasteNote.startsWith('포도 계열의 건과일'))
  assert.equal(plan.finishNote, '')
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
  assert.ok(!plan.applied.includes('finish'))
})

// ── T11: 영문 라벨 (아카라이브 템플턴) ───────────────────────────

const T11 = `TEMPLETON MIDNIGHT RYE
Type: Rye Whiskey blended with Port Wine
ABV: 45%
Region: Templeton, IOWA

Appearance
색상은 어둡고 짙은 호박색. 레그는 끈적하게 떨어진다.

Nose-블랙체리, 요거트, 건포도, 시나몬, 크림치즈, 바닐라
첫 향은 굉장히 달콤하다. 블랙체리와 요거트의 향이 기분좋다.

Palate-건과일, 시나몬, 다크초콜릿, 민트, 타버린 밥
첫 맛은 건과일과 말린 베리 그리고 시나몬이 절묘하게 어우러져서 기분이 좋았다.

Finish-뜨뜻함, 롱, 민티함, 코코아, 고수
뜨겁지는 않지만 그렇다고 차갑지도 않은 적당히 뜨뜻한 느낌으로 내려가는 것이 느껴진다.`

test('T11 — Nose-/Palate-/Finish- 영문 라벨을 읽는다', () => {
  const plan = parseReviewText(T11)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('블랙체리, 요거트'))
  assert.ok(plan.tasteNote.startsWith('건과일, 시나몬'))
  assert.ok(plan.finishNote.startsWith('뜨뜻함, 롱, 민티함'))
})

test('T11 — Type/ABV/Region/Appearance 는 노트에 섞이지 않는다', () => {
  const plan = parseReviewText(T11)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote].join('\n')
  assert.ok(!all.includes('Rye Whiskey blended'))
  assert.ok(!all.includes('짙은 호박색'))
})

test('T11 — ABV 45% 를 점수로 읽지 않는다', () => {
  const plan = parseReviewText(T11)
  assert.equal(plan.noseScore, null)
})

// ── T15: `노즈 :` / `노트 :` / `피니시 :` (아카라이브 아마하간) ──

const T15 = `아마하간 리쿼마운틴 핸드필(깔바도스 캐스크)
도수 : 62.2 ABV

노즈 : 요거트, 청사과, 에스테르, 바닐라, 플로랄
바이알을 딴 직후엔 요거트 내지 버터가 떠오르는 기름진 유산취가 올라왔으나, 잔에 따르고 난 뒤로는 바닐라와 꽃향기가 느껴진다.

노트 : 새콤함, 백설탕, 녹진함, 초코, 커피, 우디
혀에 닿자마자 새콤한 사과향이 입안을 가득 메운다. 그 뒤를 향에서 맡은 분내가 잠깐 뒤따른다.

피니시 : 탄닌감, 새콤함, 계피, 흑설탕, 우디
끝에 이르러선 녹은 설탕이 혀 끝에 모여들었듯, 탄닌감이 혀 끝을 조이며 맛을 한군데로 모은다.

총평 : 사과의 새콤함과 단맛을 잘 간직한 맛도리 위스키.`

test('T15 — 팔레트 자리에 쓴 `노트 :` 를 맛으로 읽는다', () => {
  const plan = parseReviewText(T15)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('요거트, 청사과'))
  assert.ok(plan.tasteNote.startsWith('새콤함, 백설탕'))
  assert.ok(plan.finishNote.startsWith('탄닌감, 새콤함'))
  assert.ok(plan.comment.includes('맛도리 위스키'))
})

test('T15 — 도수 62.2 를 점수로 읽지 않는다', () => {
  const plan = parseReviewText(T15)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
})

// ── 점수 스케일 환산 ─────────────────────────────────────────────

const scored = (nose, taste, finish) => `N (${nose}) 잘 익은 사과와 시나몬이 은은하게 올라온다
P (${taste}) 흑설탕과 다크초콜릿이 두텁게 깔린다
F (${finish}) 오크의 우디함이 길게 남는다
총평 : 가격을 생각하면 아주 훌륭하다.`

test('구간 점수는 세 개가 다 있을 때만 채운다', () => {
  const plan = parseReviewText(scored(88, 87, 86))
  assert.equal(plan.noseScore, 88)
  assert.equal(plan.tasteScore, 87)
  assert.equal(plan.finishScore, 86)
})

test('5점 만점 별점 표기는 100점으로 환산한다', () => {
  const plan = parseReviewText(`N (4.5/5) 잘 익은 사과와 시나몬이 은은하게 올라온다
P (4/5) 흑설탕과 다크초콜릿이 두텁게 깔린다
F (3.5/5) 오크의 우디함이 길게 남는다
총평 : 무난하다.`)
  assert.equal(plan.noseScore, 90)
  assert.equal(plan.tasteScore, 80)
  assert.equal(plan.finishScore, 70)
})

test('구간 점수가 둘만 잡히면 전부 비우고 알린다 (서버 REVIEW_013 회피)', () => {
  const plan = parseReviewText(`N (88) 잘 익은 사과와 시나몬이 은은하게 올라온다
P (87) 흑설탕과 다크초콜릿이 두텁게 깔린다
F 오크의 우디함이 길게 남는다
총평 : 무난하다.`)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
  assert.equal(plan.finishScore, null)
  assert.ok(warn(plan, 'partial'))
})

// ── 길이 규칙 ────────────────────────────────────────────────────

test('600자를 넘는 노트는 자르고 알린다', () => {
  const long = '가'.repeat(700)
  const plan = parseReviewText(`N: ${long}
P: 흑설탕과 다크초콜릿이 두텁게 깔린다
F: 오크의 우디함이 길게 남는다
총평 : 무난하다.`)
  assert.equal(plan.noseNote.length, 600)
  assert.ok(plan.warnings.some((w) => w.field === 'nose' && w.code === 'truncated'))
})

test('20자 미만 노트는 저장 전에 미리 알린다', () => {
  const plan = parseReviewText(`N: 사과향
P: 흑설탕과 다크초콜릿이 두텁게 깔린다
F: 오크의 우디함이 길게 남는다
총평 : 무난하다.`)
  assert.ok(plan.warnings.some((w) => w.field === 'nose' && w.code === 'tooShort'))
})

// ── 줄바꿈이 사라진 붙여넣기 ─────────────────────────────────────

test('줄바꿈 없는 한 덩어리는 라벨 앞을 끊어 채우고 추정했다고 알린다', () => {
  const plan = parseReviewText(
    '노즈 : 잘 익은 사과와 시나몬이 은은하게 올라온다 팔레트 : 흑설탕과 다크초콜릿이 두텁게 깔린다'
    + ' 피니시 : 오크의 우디함이 길게 남는다 총평 : 가격을 생각하면 아주 훌륭하다.',
  )
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.includes('잘 익은 사과'))
  assert.ok(plan.tasteNote.includes('흑설탕'))
  assert.ok(plan.finishNote.includes('오크의 우디함'))
  assert.ok(warn(plan, 'inlineFallback'))
})

// ── 대상 주류 확인 ───────────────────────────────────────────────

test('본문에 대상 주류 이름이 없으면 알린다 (막지는 않는다)', () => {
  const plan = parseReviewText(T15, { spiritName: '라프로익 10년' })
  assert.equal(plan.outcome, 'ok')
  assert.ok(warn(plan, 'spiritMismatch'))
})

test('본문에 대상 주류 이름이 있으면 경고하지 않는다', () => {
  const plan = parseReviewText(T15, { spiritName: '아마하간 리쿼마운틴' })
  assert.ok(!warn(plan, 'spiritMismatch'))
})

// ─────────────────────────────────────────────────────────────────
// 2차 수집분 — 디시 위스키 갤러리 리뷰 1~4페이지 + 아카라이브 주류 채널 리뷰 1~3페이지
// (2026-08-30 기준). 위와 마찬가지로 실제 게시글에서 관측한 형태다.
// ─────────────────────────────────────────────────────────────────

// ── T16: 라벨과 본문을 통째로 대괄호에 넣는다 (디시 1771611) ─────

const T16 = `아마하간 WMG 구운몽 스완

도수 : 47도
레드와인, 스웨덴 옥타브, 쉐리, 아일라 캐스크

[ 향 : 레드베리, 요거트, 오렌지필, 플로럴, 마른나무, 후추]
[ 맛 : 백설탕, 배, 나무, 대추야자, 바질, 감초 ]
[피니시 : 마른나무, 요오드 ]

* 총평 : 밝고 가벼운 이미지의 위스키,
산딸기와 라즈베리가 연상되는 레드베리와 약한 유산취가 먼저 느껴지며 상큼한 오렌지필이 있음
피니시는 매우 짧고 옅으며 우디함과 약한 요오드가 있음`

test('T16 — 대괄호로 감싼 라벨을 읽고 닫는 괄호를 노트에 남기지 않는다', () => {
  const plan = parseReviewText(T16)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseNote, '레드베리, 요거트, 오렌지필, 플로럴, 마른나무, 후추')
  assert.equal(plan.tasteNote, '백설탕, 배, 나무, 대추야자, 바질, 감초')
  assert.equal(plan.finishNote, '마른나무, 요오드')
  assert.ok(plan.comment.includes('밝고 가벼운 이미지의 위스키'))
})

// ── T17: 영문 라벨 오타(Palete) + 끝에 점수만 (디시 1771731) ────

const T17 = `Nose : 구운아몬드 피트 요거트 레몬 딸기
아몬드같은 구수한 연기 속에
요거트 레몬같은 시러스트 향들이 올라온다 , 베리류의 상큼하고 달달한 향이 올라온다

Palete : 태운레몬 , 자두 , 베리 , 소금

바디감은 충분하다 , 짭짭한피트 향과 , 셰리 캐스크의 달달하고 베리류 의 맛들이 올리온다

Finish : 피트가 은은하게 깔리고 여운이 긴편
셰리 캐스크의 오키함에서 매운맛 , 후추 같은게 입안에 맴돌며 구수하게 끝난다

상당히 맛있는한잔 평소 쿨일리를 그렇게 좋아하진않있지만 , 은은하면서 바디감이 묵직힌 한입이였다

보틀로 하나들일까 고민이지만
카디어스를 사는게 더경제적일거같다.

위배식 88점`

test('T17 — Palete 오타를 맛으로 읽는다', () => {
  const plan = parseReviewText(T17)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('구운아몬드 피트'))
  assert.ok(plan.tasteNote.startsWith('태운레몬'))
  assert.ok(plan.finishNote.startsWith('피트가 은은하게'))
})

test('T17 — 점수만 달랑 적은 마지막 줄은 총평의 시작이 아니다', () => {
  const plan = parseReviewText(T17)
  // `위배식 88점` 을 경계로 삼으면 그 앞의 감상이 통째로 피니시 노트에 남는다.
  assert.ok(plan.comment.includes('상당히 맛있는한잔'))
  assert.ok(plan.comment.includes('위배식 88점'))
  assert.ok(!plan.finishNote.includes('보틀로 하나들일까'))
})

// ── T18: 스펙(바틀/상태) + 라벨 없는 여러 문단 총평 (디시 1771833) ──

const T18 = `바틀 : 위스키테일즈 작가소개 글렌버기 9년
상태 : 바이알
도수 : 60.4%

N:
높은도수라 그런지 강렬한 알코올이 코를찌른다
민티함이 코를 스쳐지나간다
생포도같이 달큰한 향

P:
강렬한 스파이시함
끝에서 향긋한 민티
부드러운 바닐라크림이 입안 가득

F:
건자두가 혀끝에 머무른다
오키함이 뭉근하게 깔림
한약을 먹고나서 씻어낸 다음의 남는 약간의 씁쓸함

저숙성특유의 스파이시함이 지배적인데 그걸 걷어내고 주장하는 향과 맛이 연약하다

생각보다 자체 도수를 제외하고는 임팩트가 없이 너무 잔잔하고 미약한 느낌

나눔받은 것중 제일 실망스러운 녀석`

test('T18 — 바틀/상태 같은 스펙 줄은 총평에 섞이지 않는다', () => {
  const plan = parseReviewText(T18)
  assert.equal(plan.outcome, 'ok')
  assert.ok(!plan.comment.includes('위스키테일즈 작가소개'))
  assert.ok(!plan.comment.includes('바이알'))
})

test('T18 — 총평 라벨이 없으면 피니시 첫 문단만 남기고 나머지를 총평으로 옮긴다', () => {
  const plan = parseReviewText(T18)
  assert.ok(plan.finishNote.includes('건자두가 혀끝에'))
  assert.ok(!plan.finishNote.includes('저숙성특유의'))
  assert.ok(plan.comment.includes('저숙성특유의'))
  assert.ok(plan.comment.includes('나눔받은 것중 제일 실망스러운 녀석'))
})

// ── T19: 영문 라벨에 본문이 곧바로 붙는다 (디시 1771753) ────────

const T19 = `NOT FOR SALE DUTY PAID CASK SAMPLE
Sansibar Free Label No.2 Highland Single malt (Clynelish) 1996

샘플 번호: 미기재

종류: 하이랜드 싱글 몰트 위스키

도수: 미확인

점수: 78점

Nose전체적으로 발향이 약하다. 백합의 플로럴함을 중심으로 멜론, 레몬 필, 블러드 오렌지, 살구가 은은하게 나타난다.

Palate매우 달콤한 머핀을 연상시키는 풍미로 시작한다. 약한 왁시함과 오일리한 질감이 입안을 감싼다.

Finish화이트초콜릿의 부드럽고 달콤한 풍미가 길게 이어진다.

종합 평가현재 상태만 놓고 보면 잠재력이 충분히 드러나지 않은 Clynelish다.`

test('T19 — 굵은 글씨 뒤에 본문이 붙은 Nose/Palate/Finish 를 읽는다', () => {
  const plan = parseReviewText(T19)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('전체적으로 발향이 약하다'))
  assert.ok(plan.tasteNote.startsWith('매우 달콤한 머핀'))
  assert.ok(plan.finishNote.startsWith('화이트초콜릿의'))
  assert.ok(plan.comment.includes('현재 상태만 놓고 보면'))
})

test('T19 — NOT FOR SALE 은 N 라벨이 아니다', () => {
  const plan = parseReviewText(T19)
  assert.ok(!plan.noseNote.includes('OT FOR SALE'))
})

test('T19 — 총점 78점만 있으면 구간 점수를 채우지 않는다', () => {
  const plan = parseReviewText(T19)
  assert.equal(plan.noseScore, null)
  assert.ok(warn(plan, 'overallOnly'))
})

// ── T20: N (85점) + 총평에 등장하는 '버티컬' (디시 1771711) ─────

const T20 = `"The Native Cask Nagahama #3.1 Koval Maple Cask, 60.8%"

AGE : 5 Years 5 months
Cask : KOVAL MAPLE CASK
Cask No. 2852
Distilled 2020.09
Bottled 2026.02
Non Peated

* 나눔해주신 '그늘바라기'님께 감사드립니다.

N (85점)
- 메이플 시럽, 바닐라, 카라멜, 알코올, 사과, 시나몬
시간이 지나도 코를 때리는 알코올
직관적으로 달달한 향이 꽤나 강하게 느껴짐

P (82점)
- 바닐라, 오크, 시나몬, 밤
도수에서 오는 강한 매운맛
입안을 빨아들이는 듯한 강한 탄닌함

F (82점)
- 메이플 시럽, 바닐라, 오크, 계피
적당한 피니시
바닐라의 달달함과 은은한 우디함이 올라온다

---------------------------------------------------

총평

- 숙성기간이 4달 가량 차이나는 자매 캐스크인 증류소 핸드필과 버티컬 했을때 핸드필이 훨씬 부드러웠음
- 처음부터 끝까지 매운맛이 강하게 느껴짐`

test('T20 — 괄호 안 `85점` 표기에서도 구간 점수를 회수한다', () => {
  const plan = parseReviewText(T20)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 85)
  assert.equal(plan.tasteScore, 82)
  assert.equal(plan.finishScore, 82)
})

test('T20 — 총평에서 지난 시음을 회고하며 쓴 `버티컬` 로는 막지 않는다', () => {
  const plan = parseReviewText(T20, { title: '위위리) 더 네이티브 캐스크 나가하마 #3.1' })
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.includes('숙성기간이 4달 가량'))
})

test('T20 — 제목에 버티컬이 있으면 비교 리뷰로 막는다', () => {
  const plan = parseReviewText(T20, { title: '위나리) 97 링크우드 셰리캐스크 버티컬' })
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'versus')
})

test('T20 — 스펙(AGE/Cask/Distilled)·구분선·나눔 인사는 어디에도 남지 않는다', () => {
  const plan = parseReviewText(T20)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('KOVAL MAPLE CASK'))
  assert.ok(!all.includes('-----'))
  assert.ok(!all.includes('그늘바라기'))
})

// ── T21: 꺾쇠 라벨 (아카라이브 181410660) ───────────────────────

const T21 = `하이랜드 파크 21 46%

<향>
청사과, 시트러스, 옅은 피트, 꿀, 오렌지 껍질, 꽃

바이알을 열자마자 직관적인 청사과, 오렌지 등 과일향이 솟구친다.
묘하게 보랏빛 계열 꽃향기도 느껴지고, 생각보다 피트는 존재감이 옅다.

<맛>
피트 스모키, 바닐라, 꿀, 오크, 소금기, 스파이시
달콤한 꿀 맛과 피트 스모키가 제일 먼저 느껴진다.

<피니시>
피트, 바닐라, 꿀, 소금, 오크
중간에서 긴 정도의 피니시

평소 피트를 잘 즐기지 않는데 하팍21은 과일향과 시트러스가 잘 조화되어서 굉장히 취향이었음.`

test('T21 — 꺾쇠로 감싼 라벨(<향>)을 읽는다', () => {
  const plan = parseReviewText(T21)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('청사과, 시트러스'))
  assert.ok(plan.tasteNote.startsWith('피트 스모키, 바닐라'))
  assert.ok(plan.finishNote.startsWith('피트, 바닐라, 꿀'))
  assert.ok(plan.comment.includes('굉장히 취향이었음'))
})

// ── T22: 닫는 괄호만 붙인 라벨 (아카라이브 181357823) ───────────

const T22 = `노즈) 알콜, 반건조 포도, 피톤치드?
알콜감이 부담스럽지 않게 치고들어오고, 그 사이를 찾아 내려가다보면 과실향이 잡힘

팔레트) 새콤한 베리, 나뭇잎
단맛이 조금 있는 신맛 과실과 함께 살짝의 쓴맛이 올라온다

피니시) 상쾌한 나무, 씁쓸함
포도나 베리같은 과실의 뉘앙스만 남기고 빠져나간 피니시를 채워주는 상쾌한 나무

셰리 캐릭터가 안보이는건 아닌데 상쾌하고 시원한 느낌이 셰리를 좀 덮었다는 느낌?`

test('T22 — 닫는 괄호만 붙인 라벨(노즈))을 읽는다', () => {
  const plan = parseReviewText(T22)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('알콜, 반건조 포도'))
  assert.ok(plan.tasteNote.startsWith('새콤한 베리'))
  assert.ok(plan.finishNote.startsWith('상쾌한 나무, 씁쓸함'))
  assert.ok(plan.comment.includes('셰리를 좀 덮었다는 느낌'))
})

// ── T23: A(색상) 스펙 + N/P/F + 총평 (아카라이브 181322756) ─────

const T23 = `수령후 며칠지난 후 리뷰..

가장 먼저 좋은 술 나눔해주신 @da11as 님에게 감사드립니다.

스펙은.. NAS, 43도.

A : 밝은 노랑색. 버번캐스러운 색상. 레그는 빨리 떨어진다.

N: 바닐라, 달큰, 유산취, 사과, 시트러스, 스파이스
부드러운 바닐라향과 약간의 시트러스. 달큰한 향과 유산취가 섞여 청사과같은 뉘앙스가 느껴진다.

P: 묽은 질감, 사과, 달달, 향신료, 스파이시
도수가 낮은것 때문인지 첫 맛이 상당히 묽다는 느낌이 강하다.

F: 바닐라, 스파이시
바닐라향과 스파이시한 느낌이 빠르게 지나간다.

총평: 도수감 없이 부드럽고 달달한 블렌디드. 그레인 느낌이 강하진 않고 부담없는 술처럼 느껴지네옹`

test('T23 — A(색상) 줄은 향 노트에 섞이지 않는다', () => {
  const plan = parseReviewText(T23)
  assert.equal(plan.outcome, 'ok')
  assert.ok(!plan.noseNote.includes('밝은 노랑색'))
  assert.ok(plan.noseNote.startsWith('바닐라, 달큰'))
  assert.ok(plan.comment.includes('도수감 없이 부드럽고'))
})

test('T23 — 문장 가운데 있는 나눔 인사도 걸러 낸다', () => {
  const plan = parseReviewText(T23)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('감사드립니다'))
})

// ── T24: Nose / Taste / Finish 단독 줄 (아카라이브 181417230) ───

const T24 = `카발란 솔리스트 px

주종 : 타이완 위스키
도수 : 57.8%
증류소 : Kavalan Distillery

Nose
강한 아세톤. 에스테르. 건망고? 시원한 과일향? 오랫동안 맡아보니 향이 점점 풀리면서 재미있다.

Taste
높은 도수감. 화끈하다. 오래 머금기 어렵다.
질감이 진하다. 달고 의외로 새콤하다.

Finish
여운이 길다. 졸인 포도잼의 단맛이 목구멍쪽에 오래동안 남는다.

향은 뚜따컨디션이라 아직 덜풀렸다고 생각하고 맛은 화끈하고 새콤달콤하다고 생각함. 단순히 달달한 위스키는 아니다.`

test('T24 — Taste 를 맛 라벨로 읽는다', () => {
  const plan = parseReviewText(T24)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('강한 아세톤'))
  assert.ok(plan.tasteNote.startsWith('높은 도수감'))
  assert.ok(plan.finishNote.startsWith('여운이 길다'))
  assert.ok(plan.comment.includes('단순히 달달한 위스키는 아니다'))
})

// ── T25: 물음표가 낀 라벨 + 결론 (아카라이브 181337429) ─────────

const T25 = `오늘 일본여행 마지막 밤이라서 짐 정리하는 김에 낮에 사온 맥주 마셔보고 리뷰 적어봄

향 : IPA 특유의 강렬한 홉향과 산미

맛 : 강렬한 홉의맛, 하지만 걸 잡아주는 산미와 묵직한 씁쓸함. 교자같은 느끼한 음식이랑 잘 어울림.

피니쉬? : 맛에서 나온 산미가 끝까지 이어지면서 맛을 잡아주는 느낌.

결론 : 맛있음. 하지만 가격은 안착함. 저 병 하나에 820엔임`

test('T25 — 라벨 뒤에 물음표가 낀 `피니쉬? :` 도 읽는다', () => {
  const plan = parseReviewText(T25)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.finishNote.startsWith('맛에서 나온 산미가'))
  assert.ok(plan.comment.includes('맛있음'))
})

test('T25 — 820엔 같은 가격을 점수로 읽지 않는다', () => {
  const plan = parseReviewText(T25)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.finishScore, null)
})

// ── T26: 두 병을 나란히 (아카라이브 181426040) ──────────────────

const T26 = `사장님에게 셰리 캐스크 위스키 처음인데 추천해 주실 수 있으신지 물어봤더니 이거 두 개 추천 해주셔서 마셔보고 리뷰 남겼어!

글렌모렌지 15y 래산타
향: 달달하고 시트러스의 새콤한 향
맛: 향에서 느껴진 달달한 맛과 스파이시한 맛
피니쉬: 초콜릿, 짧은 스모키 이 정도가 느껴졌어

글렌드로낙 12y
향: 얘도 똑같이 달달한 향이 나는데 시트러스의 상큼한 느낌 대신 초콜릿 같은 향 났어
맛: 똑같이 향에서 느껴진 달달한 맛과 다크초콜릿 맛이 났어.
피니쉬: 포도의 단맛이 중심적으로 느껴졌고, 추가로 다크초콜릿 같은 향이 뒤에 느낌이었어

전체적으로 느낀 건 이 정도인 것 같아`

test('T26 — 두 병을 나란히 적은 글은 비교 리뷰로 막는다', () => {
  const plan = parseReviewText(T26)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'labelRepeated')
  assert.equal(plan.noseNote, '')
})

// ── T27: N - / P - / F - + 한줄평 (아카라이브 181346426) ────────

const T27 = `오늘의 리뷰는 눔나 받은 러셀 싱배 라이임
암튼 리뷰를 해보자면

N - 시나몬, 카라멜, 바닐라, 민트
잔에 따르고 돌리니까 가장 먼저 반겨주는 시나몬, 민트향
거기에 카라멜향이 나는데 왜 수정과가 떠오르지 흠...

P - 시나몬, 바닐라, 민트, 빵, 오크
시나몬과 시원한 민트, 거기에 고소한 빵 먹는 느낌
끝이 좀 매운맛이 있는데 라이라이의 특징인듯

F - 시나몬, 시럽, 스파이시, 오크, 바닐라, 민트
민트와 풍선껌, 그라고 시나몬까지 끝에 남고
마무리는 은은한 민트로 끝남

한줄평 : 하이라이는 아니지만 라이 위스키가 뭔지 알기에는 좋은 바틀 일지도?

악! 눔나해주신 @나뮤 님 감사합니다!`

test('T27 — `N - ` 하이픈 구분자를 읽고 한줄평을 총평에 넣는다', () => {
  const plan = parseReviewText(T27)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('시나몬, 카라멜'))
  assert.ok(plan.tasteNote.startsWith('시나몬, 바닐라, 민트, 빵'))
  assert.ok(plan.finishNote.startsWith('시나몬, 시럽'))
  assert.ok(plan.comment.includes('라이 위스키가 뭔지 알기에는'))
})

test('T27 — 눔나 인사말은 총평에 남기지 않는다', () => {
  const plan = parseReviewText(T27)
  assert.ok(!plan.comment.includes('@나뮤'))
})

// ─────────────────────────────────────────────────────────────────
// 네이버 카페 시음기 (N1~N4).
//
// 카페는 회원 전용이라 링크로 가져올 수 없고 붙여넣기로만 들어온다.
// 아래는 실제 카페 글을 그대로 옮긴 것이다 — 도입부가 길고, 라벨을 한 줄에 홀로 쓰며,
// 마침표 하나로 구분하는 습관이 디시·아카라이브와 다르다.
// ─────────────────────────────────────────────────────────────────

// ── N1: 라벨 단독 줄 + 서너 문단짜리 도입부 ─────────────────────

const N1 = `주말근무가 끝나고나면 보상?을 받고 싶은 욕심이
듭니다 ㅎㅎ~ 상큼한게 땡기네요

하쿠슈 비터스윗 뚜따

일본에서 19000엔 할인받고 한국가격16만원대
일본에서는 블초, 카발란과 경쟁 한국에서는
맥15, 드로낙 다크, 15년 같은게 있습니다(셰리파)
여행가서 슬롯1개 차지할 놈인지~

우선 예전에 비터스윗 처음 마실때는 좋은기억이 있습니다 18000엔할때, 최근 이것도 예전만 못하다는
말이 있어서 병 라벨 올려봅니다.
(2026년 7월에구입)

향

병에서 달달한 냄새부터 납니다.
잔에서 올라오는 정향  셰리 위스키를 떠올리게합니다
과일 달달향이 올라오는데 향자체는 강하지 않습니다.

맛

한모금 첫 맛부터 꿀입니다 앞쪽에 꿀맛이 지배적이고 이후 약간 오렌지 마멀레이드
(많이 과장해서 편의점 꿀 드링크 같은)
그리고 뒤가 없습니다.....

피니쉬

첫 잔 피니시에서 쓴맛이 났어요
이게 뭐지.. 하고 테이스팅노트를 봤는데
이후 몇 모금 더 마시면서 더이상 쓴맛은 못느꼈습니다. 피니시는 그저그래요

달고 맛있습니다. 술술 넘어간다~(3잔째)
위스키가 주는 여운 풍미가 적은건 아쉽습니다
비터스윗 가볍다~`

test('N1 — 라벨만 홀로 있는 줄(향/맛/피니쉬)을 읽는다', () => {
  const plan = parseReviewText(N1)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('병에서 달달한 냄새부터'))
  assert.ok(plan.tasteNote.startsWith('한모금 첫 맛부터 꿀입니다'))
  assert.ok(plan.finishNote.startsWith('첫 잔 피니시에서 쓴맛이'))
})

test('N1 — 긴 도입부가 총평을 밀어내지 않는다', () => {
  const plan = parseReviewText(N1)
  // 카페 글은 구매 경위·가격 이야기로 길게 시작한다. 그걸 앞세우면 정작 총평이 안 보인다.
  assert.ok(plan.comment.startsWith('달고 맛있습니다'))
  assert.ok(warn(plan, 'overallInferred'))
})

test('N1 — 그렇다고 도입부를 버리지도 않는다', () => {
  const plan = parseReviewText(N1)
  assert.ok(plan.comment.includes('일본에서 19000엔'))
  assert.ok(warn(plan, 'leftoverMerged'))
})

test('N1 — 19000엔·16만원 같은 숫자를 점수로 읽지 않는다', () => {
  const plan = parseReviewText(N1)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.tasteScore, null)
  assert.equal(plan.finishScore, null)
})

// ── N2: 한 구간 안에서 세 병을 나란히 (하위 라벨 반복) ──────────

const N2 = `좌 싱배 가운데 골포 우 러셀13 이지만....배경 지운다고 AI한번 돌린거라 색은 변화가 있을 수 있으니 참고만...

향
러셀싱배 : 화사한 향, 과일향, 프루티함, 바닐라향, 카라멜향
러셀13년 : 더 화사한향, 더 싱그러운향, 바닐라향, 카라멜향
골드포일 : 훨씬 화사함, 살짝 알콜, 달달한 꿀같은 향, 상큼상큼한 과일이 생각나는 향

향의 깊이는 골드포일이 가장 강하긴 하네요.

맛
러셀싱배 : 약간의 알콜침, 바닐라향은 살짝 약하고, 상큼한 맛이 더 큼
러셀13년 : 상큼한맛, 꿀같은 달달함, 오키함, 새콤한 과일맛, 바닐라향
골드포일 : 약간의 스파이시함, 상큼한 과일향, 체리같은 과실향, 꿀같은 달달함

피니쉬
러셀싱배 : 앞에것들을 먹어서 더 그런지 그냥 가볍게 끝.
러셍13년 : 약간의 오일리한 느낌과 달달한 맛으로 적당한 피니쉬
골드포일 : 약간 스파이시함과 달달함이 남고 약간의 탄맛이 느껴짐.

전체적으로 보면 체급은 확실히 골드포일이 러셀13보다 우위로 보입니다.`

test('N2 — 구간마다 같은 이름으로 갈라 쓴 3종 비교를 막는다', () => {
  const plan = parseReviewText(N2)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'subLabels')
  assert.equal(plan.noseNote, '')
  assert.equal(plan.comment, '')
})

// ── N3: `향 . ` 처럼 마침표로 구분 (짧은 도입부) ────────────────

const N3 = `글렌드로낙 12년 올로로소는 첫 번째 글렌 드로낙으로 제가 가장 아껴 마시는 바틀 중 하나입니다. 위스키 초보 시절에 구입했는데 그때 몇 병 더 사지 않은 것을 지금 후회하고 있습니다.

향 . 직관적인 달달함보다는 신선하고 상큼한 붉은 과일과 오렌지 껍질 계열의 스트러스한 향이 은은하게 퍼집니다.

맛 . 도수 비해 질감이 꽤 크리미하고 오일리하여 목넘이 부드럽고
편하게 착 감기는 느낌이 좋고 은은한 포도의 단맛 뒤로 스파이시함이 느껴집니다

피니시 . 은은한 포도즙의 단맛 뒤로 오렌지 계열 시트러스함과 씁쓸한 오크 탄닌이 빠져나가면서 혀끝에 쌉싸름한 탄닌감이 살짝 남아 깔끔하게 마무리됩니다

낮에 아들 장난감 정리 및 애들방 거실 청소하면서
31일 발매 소식에 아껴먹은 드로낙 12년 올로로쏘 막 마시고
시음기 작성 완료 하였습니다.

위스키 매력은 진짜.`

test('N3 — 마침표 하나로 구분한 `향 . ` 을 읽는다', () => {
  const plan = parseReviewText(N3)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('직관적인 달달함보다는'))
  assert.ok(plan.tasteNote.startsWith('도수 비해 질감이'))
  assert.ok(plan.finishNote.startsWith('은은한 포도즙의'))
})

test('N3 — 짧은 도입부는 총평 앞에 그대로 둔다', () => {
  const plan = parseReviewText(N3)
  assert.ok(plan.comment.startsWith('글렌드로낙 12년 올로로소는'))
  assert.ok(plan.comment.includes('낮에 아들 장난감'))
})

// ── N4: 향·맛·평만 있고 피니시가 없다 ──────────────────────────

const N4 = `[Russell's Reserve Single Barrel]

- 110 Proof (55% ABV)

- Alligator Char

- Non-Chill Filtered

향.

다 아는 그 향. 진한 캐러멜과 바닐라, 흑설탕의 달콤함에 체리 같은 검붉은 과실이 올라옵니다.

뒤이어 시나몬과 후추 같은 스파이스, 구운 견과류와 묵직한 오크가 겹쳐집니다.

맛.

캐러멜과 토피의 진한 단맛을 중심으로 바닐라와 체리, 시나몬이 이어집니다.

뒤로 갈수록 가죽의 묵직한 풍미가 더해집니다.

평.

와일드터키 101을 좀 더 진하고 묵직하게 농축해 놓은 듯한 맛. 이라고 하면 이해가 빠를 것 같습니다.

아쉽게도 재구매는 없을 예정입니다.`

test('N4 — 피니시를 따로 적지 않아도 향·맛·총평은 채운다', () => {
  const plan = parseReviewText(N4)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('다 아는 그 향'))
  assert.ok(plan.tasteNote.startsWith('캐러멜과 토피의'))
  assert.equal(plan.finishNote, '')
  assert.ok(plan.comment.includes('와일드터키 101을 좀 더'))
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
})

test('N4 — Non-Chill Filtered 는 N 라벨이 아니다', () => {
  // 피니시만 채워 주면 나머지가 제대로 갈리는지까지 확인한다.
  const plan = parseReviewText(N4.replace('평.', '피니시.\n\n단맛 뒤로 시나몬과 후추, 오크의 드라이함이 길게 남습니다.\n\n평.'))
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('다 아는 그 향'))
  assert.ok(plan.tasteNote.startsWith('캐러멜과 토피의'))
  assert.ok(!plan.noseNote.includes('on-Chill'))
})

test('N4 — 한 글자 `평.` 도 총평 라벨로 읽는다', () => {
  const plan = parseReviewText(N4.replace('평.', '피니시.\n\n단맛 뒤로 시나몬과 후추, 오크의 드라이함이 길게 남습니다.\n\n평.'))
  assert.ok(plan.comment.includes('와일드터키 101을 좀 더'))
  // 라벨로 읽었다는 증거 — 라벨을 못 읽으면 총평을 문단 위치로 추측하고(overallInferred)
  // `평.` 이 총평 본문에 글자로 남는다.
  assert.ok(!warn(plan, 'overallInferred'))
  assert.ok(!plan.comment.includes('평.'))
})

// ─────────────────────────────────────────────────────────────────
// 3차 수집분 (L1~L9) — 사용자가 지정한 실제 게시글 13편.
// 디시 위스키 갤러리 7편 + 아카라이브 주류 채널 6편.
// ─────────────────────────────────────────────────────────────────

// ── L1: 맛을 `T :` 로 적는다 (아카 146141809) ───────────────────

const L1 = `이름 : THE GLENGRANT ARBORALIS CASK STRENGTH LIMITED EDITION
용량 : 70cl(700ml)
도수 : 58.5% alc/vol

레그 : 엄청 끈적하지 않지만 적당히 잔을타고 내려오면서 물처럼 끝난다.

N : 바닐라, 부드러운 솜사탕, 레몬껍질, 시트러스, 셰리의 향신료, 알콜, 살짝의 건포도

첫 오픈 때의 코르크와 병 입구의 향을 맡으면 이게 설탕시럽인가 헷갈릴 정도로 달콤한 향이 올라온다.

T : 설탕, 꿀, 몰트, 쓴, 탄닌, 향신료, 카라멜

맛은 굉장히 직관적인 느낌이다 버번캐의 특징인 설탕과 꿀을 넣은듯한 달콤한 맛들이 처음에 지배적이다.

F : 몰트, 쓴, 탄닌, 설탕, 쓴 카라멜

피니시는 몰트의 맛이랑 쓴맛 탄닌이 지배적이다가 이후 입안을 굴리고 있으면 단맛이 사악 돈다

총평 : 향과 맛은 전체적으로 잘 뽑힌거 같다고 느껴지는데 중간마다 약간 아쉬운 느낌이 든다.`

test('L1 — 맛 라벨 `T :` 를 읽는다', () => {
  const plan = parseReviewText(L1)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('바닐라, 부드러운 솜사탕'))
  assert.ok(plan.tasteNote.startsWith('설탕, 꿀, 몰트'))
  assert.ok(plan.finishNote.startsWith('몰트, 쓴, 탄닌'))
  assert.ok(plan.comment.startsWith('향과 맛은 전체적으로'))
})

test('L1 — 이름/용량/레그 같은 머리말은 총평에 섞이지 않는다', () => {
  const plan = parseReviewText(L1)
  assert.ok(!plan.comment.includes('THE GLENGRANT'))
  assert.ok(!plan.comment.includes('70cl'))
  assert.ok(!plan.comment.includes('잔을타고'))
})

// ── L2: 라벨 뒤에 괄호 없이 점수 + SUMMARY (디시 1754541) ───────

const L2 = `류카 2026 후쿠오카 위스키 토크 핸드필

위베번호 (미등록)
시음일자 270726
보틀잔량 (바이알)

ABV 55.4% Aged 3Y 6M
Distillery Suzaki
Bottler Suzaki
Cask Type PX Octave

NOSE 86.00 포도, 메탈릭, 달콤, 향신료, 우디, 알콜부즈, 시트러스, 가죽
코를 자극해 조리돌림하는 포도향
가죽, 에스프레소 같은 무거운 질감의 향

PALATE 84.25 씁쓸, 떫음, 건과일, 포도, 달콤, 탄닌, 오키, 오렌지필
그저 쓰고 떫은 맛이 강하게 올라옴
매우 강한 탄닌은 오키와 연관된 맛

FINISH 84.25 건과일, 셰리, 파우더리, 커피
속에서부터 올라오는 살짝 불에 태운 듯한 건과일
커피를 먹고 난 듯한 느낌

SUMMARY 84.833 맛없음, 장점이 없음.
핸드필로 자신있게 낸 그 자신감이 대단할 정도의 맛으로, 상당히 부담스러운 노트의 집합.`

test('L2 — 괄호 없이 라벨 뒤에 붙은 점수를 구간 점수로 읽는다', () => {
  const plan = parseReviewText(L2)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 86)
  assert.equal(plan.tasteScore, 84.3)
  assert.equal(plan.finishScore, 84.3)
})

test('L2 — 점수를 뗀 나머지가 노트로 들어간다', () => {
  const plan = parseReviewText(L2)
  assert.ok(plan.noseNote.startsWith('포도, 메탈릭, 달콤'))
  assert.ok(!plan.noseNote.startsWith('86'))
  assert.ok(plan.finishNote.startsWith('건과일, 셰리, 파우더리'))
})

test('L2 — SUMMARY 를 총평으로 읽고 스펙 머리말은 버린다', () => {
  const plan = parseReviewText(L2)
  assert.ok(plan.comment.includes('핸드필로 자신있게 낸'))
  // 라벨로 읽었다는 증거 — 못 읽으면 총평 위치를 문단으로 추측하고 `SUMMARY` 가 글자로 남는다.
  assert.ok(!warn(plan, 'overallInferred'))
  assert.ok(!plan.comment.includes('SUMMARY'))
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('Suzaki'))
  assert.ok(!all.includes('270726'))
  assert.ok(!all.includes('보틀잔량'))
})

// ── L3: 세 점수를 `89/88/88` 한 줄로 (디시 1754793) ─────────────

const L3 = `카발란 솔리스트 버진오크

Distillery: Kavalan Distillery
Aged: NAS
ABV: 53.2%
Cask Type: Vrigin Oak
Date: 26.08.13

N: 흑설탕, 무화과, 포도, 오렌지, 라임, 버터, 크림브륄레, 육두구, 후추, 콜라

첫인상은 3mk 길상여의가 떠오르는 헤이즐번 15같은 노징이 다가온다.

P: 콜라, 흑설탕, 후추, 계피, 포도, 오렌지, 오크, 탄닌

오크와 탄닌의 떫은 씁쓸함이 꽤 강한데 단맛이 충분히 받쳐줘서 부담스럽진 않다.

F: 흑설탕, 오렌지, 오크, 탄닌, 콜라, 건초

중간 정도의 길이.
오크와 탄닌이 입안에 남는다.

이 바틀을 포함해서 카발란 버진을 3번째 마셔보는데
그리고 이 바틀은 라이 위스키가 떠오른다.

89/88/88
88/100`

test('L3 — `89/88/88` 한 줄에서 세 점수를 회수한다', () => {
  const plan = parseReviewText(L3)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 89)
  assert.equal(plan.tasteScore, 88)
  assert.equal(plan.finishScore, 88)
})

test('L3 — 아로마 나열 뒤 설명 문단은 피니시에 남는다', () => {
  const plan = parseReviewText(L3)
  // 나열만 남기면 `중간 정도의 길이` 같은 설명이 총평으로 샌다.
  assert.ok(plan.finishNote.includes('중간 정도의 길이'))
  assert.ok(plan.finishNote.includes('오크와 탄닌이 입안에 남는다'))
  assert.ok(plan.comment.includes('카발란 버진을 3번째'))
})

// ── L4: 피니시를 `목 넘김 및 여운:` 으로 (디시 1754678) ─────────

const L4 = `Linkwood 1997 25 Years Single Cask #7579 Signatory Vintage

주종: Speyside Single Malt Scotch Whisky
원료: Malted Barley
증류기: (Copper) Pot Still
도수: 55.1% / Cask Strength
병입자: Signatory Vintage
싱글 캐스크: O
냉각 여과: X
색소 첨가: X

색: 갈색을 띠며 레그는 잔 중간에 맺혀 천천히 떨어진다.

향: 알코올이 제법 치고 나오며, 피망 특유의 알싸함과 쌉싸름함이 퍼진다. 메이플 시럽, 시나몬롤, 허니브레드처럼 디저트를 떠올리게 하는 아로마가 주를 이룬다.

맛: 시러피한 질감에 중간 정도의 바디감을 지녔다. 벌꿀, 메이플 시럽, 살구 마멀레이드 등 강렬한 달콤함이 입안을 가득 메운다.

목 넘김 및 여운: 목 넘김은 살짝 자극적인 편이다. 생강 젤리의 맵싸한 느낌이 빠르게 목을 훑고 지나간 뒤, 타르트 타탱의 여운이 길게 남는다.`

test('L4 — `목 넘김 및 여운:` 을 피니시로 읽는다', () => {
  const plan = parseReviewText(L4)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.finishNote.startsWith('목 넘김은 살짝 자극적인'))
  assert.ok(plan.noseNote.startsWith('알코올이 제법 치고'))
})

test('L4 — 원료/증류기/색 같은 머리말은 노트에 섞이지 않는다', () => {
  const plan = parseReviewText(L4)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('Malted Barley'))
  assert.ok(!all.includes('Pot Still'))
  assert.ok(!all.includes('갈색을 띠며'))
})

test('`목넘김도 부드럽다` 는 피니시 라벨이 아니다', () => {
  const plan = parseReviewText(`N
건포도, 스모크한 피트, 흑설탕 이후 약한 시트러스함이 느껴집니다.
P
맛은 은은한 스모키함부터 느껴지고 이후 짧은 강한 단맛이 있네요.
목넘김도 되게 부드럽습니다.
F
오키함 살짝 쌉싸름한 맛과 약한 스파이스가 이어지면서 드라이하게 끝나네요.`)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.tasteNote.includes('목넘김도 되게 부드럽습니다'))
})

// ── L5: F 를 P 로 잘못 쓴 오타 (디시 1754911) ───────────────────

const L5 = `시그나토리 벤리네스 2010 12년 LMDW

Distillery: Benrinnes
Bottler: Signatory Vintage
ABV: 57.6%
Rating: 87.98/100 (64 votes)

N 88 버터, 향신료, 사과, 오렌지, 유산취, 가죽, 초콜릿

버터리하고 오일리한 붉은 과일과 향신료들이 직관적으로 들어온다.

P 89 스파이스, 후추, 체리, 오렌지, 허브, 감칠맛

우드 스파이스가 직관적으로 들어오고, 체리와 오렌지같은 과일 노트들이 느껴진다.

P 88 스파이스, 감칠맛, 오렌지

혀에 남은 우드 스파이스와 함께 벤리네스 특유의 감칠맛이 든다.

총평 88.333

레드 캐스크 벤리네스를 먹어보고 여행가자마자 사온 인생 첫 독병이다.`

test('L5 — 한 구간만 두 번이면 비교가 아니라 오타로 보고 찾은 것만 채운다', () => {
  const plan = parseReviewText(L5)
  // 글쓴이가 F 를 P 로 잘못 적은 글이다. `비교 리뷰입니다` 라고 안내하면 엉뚱한 말이 된다.
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('버터, 향신료'))
  assert.equal(plan.finishNote, '')
  assert.ok(plan.warnings.some((w) => w.field === 'taste' && w.code === 'duplicated'))
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
})

test('두 구간 이상 반복되면 그때는 비교 리뷰다', () => {
  const plan = parseReviewText(`A 위스키
N 88 버터, 향신료, 사과
P 89 스파이스, 후추, 체리
F 87 오크, 탄닌

B 위스키
N 85 꿀, 바닐라, 사과
P 84 흑설탕, 오크
F 83 스파이시, 우디`)
  assert.equal(plan.outcome, 'comparison')
  assert.equal(plan.reason, 'labelRepeated')
})

// ── L6: 총평을 `후기` 로 (아카 176618481) ───────────────────────

const L6 = `어제 밤 마신 조니워커 그린 후기
N
배, 약한 병원냄새 조금 지나니 꿀, 바닐라도 올라옵니다. 조니블루도 힘든데 얘는 그래도 버틸만합니다.
P
꿀의 달달함 이후 곡물맛 약한 스파이스와 짭쪼름한맛이 납니다. 목넘김은 되게 부드럽네요
F
달달함 이후 이어지는 약한 스파이스 짭쪼름함 약한 병원냄새

후기
조니 블루도 피트때문에 못마시는데 얘는 마실 수는 있네요. 가격대비 훌륭한 위스키라고 생각듭니다.`

test('L6 — 총평 라벨로 쓴 `후기` 를 읽는다', () => {
  const plan = parseReviewText(L6)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.includes('가격대비 훌륭한 위스키'))
  // 라벨로 읽었으면 위치를 추측할 필요가 없고, `후기` 가 본문에 글자로 남지도 않는다.
  assert.ok(!warn(plan, 'overallInferred'))
  assert.ok(!plan.finishNote.includes('후기'))
})

// ── L7: `총점 (0~5) : 4.6점` + 나열 뒤 불릿 (디시 1753149) ──────

const L7 = `82번째 리뷰 - 시그나토리 스페이사이드 (M) 17년 100proof
도수 : 57.1%

NOSE : 달고나(강), 황도(중), 자두(중), 오렌지(약), 오크(약), 딸기(강)

- 살짝 탄 부분이 있는 달고나의 달달한 향
- 시간이 좀 지나고 딸기향이 진하게 올라온다

PALATE : 설탕물(강), 황도(강), 자두(강), 오렌지(중), 포도(중), 오크(약)

- 첫 입을 먹자마자 설탕물같은 단맛이 느껴진다
- 복숭아 풍미도 꽤 느껴지면서 단맛도 쭉 올라온다

FINISH : 포도(강), 자두(중), 오크(중)

- 와인을 먹는듯한 포도풍미가 진하게 올라온다
- 오크의 쌉싸름함도 은은하게 이어진다

총점 (0~5) : 4.6점`

test('L7 — 아로마 나열만 남기고 불릿 설명을 총평으로 보내지 않는다', () => {
  const plan = parseReviewText(L7)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.finishNote.includes('와인을 먹는듯한 포도풍미'))
  assert.ok(plan.finishNote.includes('오크의 쌉싸름함'))
  assert.ok(!warn(plan, 'tooShort'))
})

test('L7 — `총점 (0~5) : 4.6점` 을 5점 만점으로 보고 알린다', () => {
  const plan = parseReviewText(L7)
  // 구간 점수가 없으므로 채우지는 않는다. 4.6/5 → 92 로 환산해 알리기만 한다.
  assert.equal(plan.noseScore, null)
  const overall = plan.warnings.find((w) => w.code === 'overallOnly')
  assert.ok(overall)
  assert.equal(overall.params.value, 92)
  // 점수 칸으로 읽었으면 `총점` 줄이 총평 본문에 글자로 남지 않는다.
  assert.ok(!plan.comment.includes('총점'))
})

// ── L8: 지표 목록 + 스펙(잔/특이사항) (디시 1753216) ────────────

const L8 = `TWA X 칵테일 갤러리 겨울 독병 윌리암슨 12년 50.9%

테이스팅 날짜 2026-08-12

잔 : 글렌캐런

특이사항 : 카샤샤님 나눔, CS

N
소금, 요오드, 감칠맛, 장작, 캐러멜, 오크, 몰트, 사과, 베리

코에 달라붙는 감칠맛과 스모키한 단향

P
소금, 재, 요오드, 오크, 스모키, 흙, 올리브 오일, 감칠맛

짠맛과 재, 스모키함이 위로 올라오고 오크와 섞인 감칠맛으로 마무리

F
요오드, 스모키
요오드 느낌이 감돌지만 강한 훈연향이 지배적

총평
다재다능하게 이거저거 다보여주지만 제일의 맛은 스모키한 감칠맛

카샤샤님 나눔 감사합니다

- dc official App`

test('L8 — 잔/특이사항/테이스팅 날짜 머리말을 버린다', () => {
  const plan = parseReviewText(L8)
  assert.equal(plan.outcome, 'ok')
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('글렌캐런'))
  assert.ok(!all.includes('2026-08-12'))
  assert.ok(!all.includes('감사합니다'))
  assert.ok(plan.comment.includes('제일의 맛은 스모키한 감칠맛'))
})

test('L8 — `잔에서 올라오는` 은 스펙 라벨이 아니다', () => {
  const plan = parseReviewText(`향
잔에서 올라오는 정향이 셰리 위스키를 떠올리게 합니다.
맛
한모금 첫 맛부터 꿀입니다. 앞쪽에 꿀맛이 지배적입니다.
피니시
첫 잔 피니시에서 쓴맛이 났어요. 이후로는 그저 그렇습니다.`)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('잔에서 올라오는 정향'))
})

// ── L9: 향·맛만 적고 피니시가 없다 (아카 177299895) ─────────────

test('L9 — 향·맛만 있는 짧은 후기도 그 둘은 채운다', () => {
  const plan = parseReviewText(`주종 : 싱글몰트 위스키/재패니즈 위스키
증류소 : 닛카 위스키(일본)
도수 : 45도

향 : 처음 따르고 나서는 사과 같은 과실향이 꽤 나다가 스모키가 지배적으로 바뀜
맛 : 처음에 상큼달달한 뉘앙스가 나다가 점차 스모키로 바뀜

나름대로 먹을만한 위스키이지만 700ml 1병에 10만원 넘게 주고 살만한가에는 물음표가 많이 뜬다`)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('처음 따르고 나서는 사과'))
  assert.ok(plan.tasteNote.includes('상큼달달한 뉘앙스'))
  assert.equal(plan.finishNote, '')
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
})

// ─────────────────────────────────────────────────────────────────
// 4차 (M1~M5) — 링크로 가져오기가 통째로 실패한다는 제보에서 나온 것들.
// 근본 원인은 서버의 HTML→평문 변환이 줄바꿈을 잃던 버그였고(ReviewSourceClientTest),
// 그걸 고친 뒤에도 남아 있던 파서 쪽 결함을 여기에 못 박는다.
// ─────────────────────────────────────────────────────────────────

// ── M1: 라벨 줄에 점수만 적고 줄을 바꾼다 (디시 1772358) ────────

const M1 = `Glengoyne 2007 ED

ABV: 55.3%

캐스크: 와인 배럴 (Cask# 19730)

숙성연수: 15년 (2007 - 2022)

기타: Edition Spirits, 291병 병입

색: 1.4 (Tawny)

N: 87
건포도 / 포도주스 / 건무화과 / 토피 / 헤이즐넛 / 오렌지필 / 바닐라 / 정향

- 처음부터 말린과일과 포도 계열의 향이 강하게 느껴진다.
- 총평: 오프노트 없이 부드럽고 달콤하다. 레이어도 충분하여 향을 맡는데 즐겁다.

P: 88
건포도 / 건살구 / 사과 / 황 / 토피 / 아몬드 / 오렌지필 / 정향 / 감초

- 말린 과일의 뉘앙스가 강하게 느껴진다.
- 총평: 밸런스가 좋고 마시기 편하다.

F: 86
건포도 / 토피 / 정향 / 다크초콜렛

- 말린 과일의 여운이 길게 남는다.
- 총평: 적당한 길이의 피니시.`

test('M1 — 라벨 줄에 점수만 있어도(`N: 87`) 구간 점수로 읽는다', () => {
  const plan = parseReviewText(M1)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 87)
  assert.equal(plan.tasteScore, 88)
  assert.equal(plan.finishScore, 86)
  assert.ok(plan.noseNote.startsWith('건포도 / 포도주스'))
})

test('M1 — 구간마다 붙은 `- 총평:` 은 마지막 것만 총평 칸에 넣는다', () => {
  const plan = parseReviewText(M1)
  assert.ok(plan.comment.includes('적당한 길이의 피니시'))
  assert.ok(!plan.comment.includes('오프노트 없이 부드럽고'))
  assert.ok(plan.noseNote.includes('오프노트 없이 부드럽고'))
  assert.ok(warn(plan, 'overallRepeated'))
})

test('M1 — 숙성연수/기타/색 머리말은 노트에 섞이지 않는다', () => {
  const plan = parseReviewText(M1)
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('Edition Spirits'))
  assert.ok(!all.includes('Tawny'))
})

// ── M2: 짧은 아로마 나열 + 불릿 설명 (디시 1772454) ─────────────

const M2 = `조니워커 블렌더스 배치 No.2 40%

N : 바닐라, 꿀, 풀향, 스파이스

- 바닐라의 느낌
- 낮은 도수에도 불구하고 풀향 + 스파이시함 + 알코올 느낌으로 코가 맵다

P : 꿀, 곡물의 단맛, 오일리함, 스파이스

- 단맛이 은은하게 입안에 퍼진다
- 스파이시함이 다른 맛들에 비해 강하게 치고들어온다

F : 스파이스, 달달함, 씁쓸함

- 중간 정도 길이의 피니시
- 입안에 옅게 감도는 달달함
- 중간 이후부터 약간 쓴 맛이 입안에 머문다

먹어본 블렌디드 위스키의 종류가 많진 않지만, 굉장히 특이한 케릭터의 블렌디드 위스키였다
브리딩 좀 해서 라이의 캐릭터가 조금 약해지면 벨런스가 더 좋을 것 같다`

test('M2 — `스파이스, 달달함, 씁쓸함` 같은 짧은 나열도 목록으로 본다', () => {
  const plan = parseReviewText(M2)
  assert.equal(plan.outcome, 'ok')
  // 목록으로 못 보면 그 뒤 불릿 설명이 통째로 총평으로 새고, 피니시가 16자만 남아 저장이 막힌다.
  assert.ok(plan.finishNote.includes('중간 정도 길이의 피니시'))
  assert.ok(plan.finishNote.includes('입안에 옅게 감도는 달달함'))
  assert.ok(!warn(plan, 'tooShort'))
  assert.ok(plan.comment.includes('먹어본 블렌디드 위스키의 종류가'))
})

// ── M3: `나눔해주신 …` 인사가 통째로 걸러지는지 (디시 1772306) ──

const M3 = `나눔해주신 Hasi님께 감사드립니다.

이카와 파우나 2026
N:
-. 인도 위스키 같은 누룩, 장향, 거의 마오타이 수준
-. 바나나, 파파야, 꿀, 바닐라, 코코넛, 요거트의 유산취

P:
-. 크리미한 코코넛 주스
-. 바나나잎을 태운듯한 스모키

F:
-. 가볍고 단조로운 팔레트에 비해 피니쉬가 맛있다
-. 미지근한 꿀물의 달짝지근함, 백후추, 고수, 허브 등의 향신료 스파이시

84/100. 재패니즈 위스키 답게 좋은 밸런스. 바이알이나 잔술로 경험해보면 좋을 것 같다.

미래가 기대되는 증류소. 고숙성이나 논피트는 어떻게 쓸지 궁금해진다.

- dc official App`

test('M3 — 글머리의 나눔 인사는 통째로 걸러 낸다', () => {
  const plan = parseReviewText(M3)
  assert.equal(plan.outcome, 'ok')
  // 옛 규칙은 제목 접두로 보고 `나눔` 두 글자만 잘라 내, 남은 문장이 잡음 필터를 피해 총평에 남았다.
  assert.ok(!plan.comment.includes('감사드립니다'))
  assert.ok(!plan.comment.includes('해주신'))
  assert.ok(plan.comment.includes('미래가 기대되는 증류소'))
})

test('제목 접두는 닫는 기호가 있을 때만 걷어 낸다', () => {
  const plan = parseReviewText(`나눔 받은 술이라 더 맛있게 마셨다.

향: 잘 익은 사과와 시나몬이 은은하게 올라온다
맛: 흑설탕과 다크초콜릿이 두텁게 깔린다
피니시: 오크의 우디함이 길게 남는다
총평: 무난하다.`)
  assert.ok(plan.comment.includes('나눔 받은 술이라'))
})

// ── M4: 총평을 `Total` 로, 머리말을 `Spec` 으로 (디시 1772490) ──

const M4 = `Spec
증류소 : 더프타운
캐스크 : 혹스헤드
지역 : 스페이사이드
도수 : 52.5% abv
바틀 컨디션 : 뚜따 후 약 일주일 경과
가격 : 16500엔(세후 18150엔)

Nose
오렌지, 귤, 파인애플, 레몬, 허브, 사탕/젤리

- 큰인상은 오렌지 젤리
- 파인애플, 덜익은망고 > 밝은 열대과일도 ㅇ

Palate
오렌지 껍질, 시럽, 사탕, 빙과, 오크

- 첫모금 대자마자 느껴지는 시원하고 단 감각 > 빙과?
- 시럽, 사탕 쪽의 단맛

Finish
오렌지, 포도, 오크, 장미?

- 팔렛에서 자연히 이어지는 피니시
- 살짝은 쓴맛도 남는다(-)

Total
오렌지젤리같은 노트가 특색있는 맛있는 버번캐

개인적으론 만족스러운 독병가챠였고 만엔대 슬롯으로도 추천할만하다`

test('M4 — 총평 라벨 `Total` 을 읽고 Spec 머리말은 버린다', () => {
  const plan = parseReviewText(M4)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.comment.startsWith('오렌지젤리같은 노트가'))
  assert.ok(!warn(plan, 'overallInferred'))
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('혹스헤드'))
  assert.ok(!all.includes('스페이사이드'))
  assert.ok(!all.includes('16500엔'))
})

test('M4 — 16500엔·52.5% 를 점수로 읽지 않는다', () => {
  const plan = parseReviewText(M4)
  assert.equal(plan.noseScore, null)
  assert.equal(plan.finishScore, null)
})

// ── M5: 향·맛만 적고 피니시가 없다 (디시 1772484) ───────────────

test('M5 — `향)` `맛)` 만 있어도 찾은 것과 총평은 채운다', () => {
  const plan = parseReviewText(`1792 풀 프루프 62.5%

향)
나무, 시나몬.
얘는 유독 시나몬이나 계피처럼 알싸한 향이 튄다.

맛)
단맛. 폭력적인 달콤함
그리고 역대급으로 짧은 여운.

총평:
할인하면 99000원에 62.5도 BP급 스펙
저 가격에 구할 수 있으면 사야제. 맛돌이다.`)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.noseNote.startsWith('나무, 시나몬'))
  assert.ok(plan.tasteNote.startsWith('단맛. 폭력적인 달콤함'))
  assert.equal(plan.finishNote, '')
  assert.ok(plan.comment.includes('저 가격에 구할 수 있으면'))
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
})

test('`평소에`·`평가` 는 총평 라벨이 아니다', () => {
  const plan = parseReviewText(`향: 잘 익은 사과와 시나몬이 은은하게 올라온다
맛: 흑설탕과 다크초콜릿이 두텁게 깔린다
피니시: 오크의 우디함이 길게 남는다
평소에 즐기던 스타일은 아니지만 이번엔 꽤 만족스러웠다`)
  assert.equal(plan.outcome, 'ok')
  assert.ok(plan.finishNote.includes('평소에 즐기던'))
})

// ── 빈 입력 ──────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
// 서식 스트레스 (S) — 사람마다 제각각인 표기를 폭넓게 흉내 낸 표.
//
// 실제 글에서 배운 어휘·장식·구분자를 조합해 만들었다. 네 칸의 내용은 모두 같으므로
// <b>어떻게 적어도 같은 결과가 나오는지</b>만 본다. 라벨 어휘를 늘릴 때 여기에 한 줄 추가할 것.
// ─────────────────────────────────────────────────────────────────

const NOSE_TEXT = '잘 익은 사과와 시나몬이 은은하게 올라온다'
const TASTE_TEXT = '흑설탕과 다크초콜릿이 두텁게 깔린다'
const FINISH_TEXT = '오크의 우디함이 길게 남는다'
const OVERALL_TEXT = '가격 생각하면 훌륭하다'

const STYLES = [
  ['한글 기본', `향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`],
  ['노즈/팔레트/피니쉬/결론', `노즈: ${NOSE_TEXT}
팔레트: ${TASTE_TEXT}
피니쉬: ${FINISH_TEXT}
결론: ${OVERALL_TEXT}`],
  ['코/입/끝', `코: ${NOSE_TEXT}
입: ${TASTE_TEXT}
끝: ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`],
  ['향기/여운/느낀점', `향기: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
여운: ${FINISH_TEXT}
느낀점: ${OVERALL_TEXT}`],
  ['아로마/테이스트/마무리', `아로마: ${NOSE_TEXT}
테이스트: ${TASTE_TEXT}
피니쉬: ${FINISH_TEXT}
마무리: ${OVERALL_TEXT}`],
  ['한줄요약', `향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
한줄요약: ${OVERALL_TEXT}`],
  ['정리', `향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
정리: ${OVERALL_TEXT}`],
  ['화살표 구분자', `향 > ${NOSE_TEXT}
맛 > ${TASTE_TEXT}
피니시 > ${FINISH_TEXT}
총평 > ${OVERALL_TEXT}`],
  ['엠대시 구분자', `향 — ${NOSE_TEXT}
맛 — ${TASTE_TEXT}
피니시 — ${FINISH_TEXT}
총평 — ${OVERALL_TEXT}`],
  ['등호 구분자', `향 = ${NOSE_TEXT}
맛 = ${TASTE_TEXT}
피니시 = ${FINISH_TEXT}
총평 = ${OVERALL_TEXT}`],
  ['물결 구분자', `향~ ${NOSE_TEXT}
맛~ ${TASTE_TEXT}
피니시~ ${FINISH_TEXT}
총평~ ${OVERALL_TEXT}`],
  ['구분자 없이 공백만', `향 ${NOSE_TEXT}
맛 ${TASTE_TEXT}
피니시 ${FINISH_TEXT}
총평 ${OVERALL_TEXT}`],
  ['번호 매김', `1. 향
${NOSE_TEXT}
2. 맛
${TASTE_TEXT}
3. 피니시
${FINISH_TEXT}
4. 총평
${OVERALL_TEXT}`],
  ['양쪽 겹장식', `■ 향 ■
${NOSE_TEXT}
■ 맛 ■
${TASTE_TEXT}
■ 피니시 ■
${FINISH_TEXT}
■ 총평 ■
${OVERALL_TEXT}`],
  ['검은 괄호', `【향】 ${NOSE_TEXT}
【맛】 ${TASTE_TEXT}
【피니시】 ${FINISH_TEXT}
【총평】 ${OVERALL_TEXT}`],
  ['별표 강조', `*향* ${NOSE_TEXT}
*맛* ${TASTE_TEXT}
*피니시* ${FINISH_TEXT}
*총평* ${OVERALL_TEXT}`],
  ['파이프 표', `| 향 | ${NOSE_TEXT} |
| 맛 | ${TASTE_TEXT} |
| 피니시 | ${FINISH_TEXT} |
| 총평 | ${OVERALL_TEXT} |`],
  ['이모지 머리', `🥃 향: ${NOSE_TEXT}
👅 맛: ${TASTE_TEXT}
🔚 피니시: ${FINISH_TEXT}
📝 총평: ${OVERALL_TEXT}`],
  ['한영 병기 슬래시', `향/Nose: ${NOSE_TEXT}
맛/Palate: ${TASTE_TEXT}
피니시/Finish: ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`],
  ['영문에 한글 병기', `Nose(향): ${NOSE_TEXT}
Palate(맛): ${TASTE_TEXT}
Finish(피니시): ${FINISH_TEXT}
Overall(총평): ${OVERALL_TEXT}`],
  ['초성체 섞임', `향ㅋㅋ ${NOSE_TEXT}
맛ㅋㅋ ${TASTE_TEXT}
피니시ㅋㅋ ${FINISH_TEXT}
총평ㅋㅋ ${OVERALL_TEXT}`],
  ['들여쓰기', `  향: ${NOSE_TEXT}
  맛: ${TASTE_TEXT}
  피니시: ${FINISH_TEXT}
  총평: ${OVERALL_TEXT}`],
  ['라벨 뒤 빈 줄', `향

${NOSE_TEXT}

맛

${TASTE_TEXT}

피니시

${FINISH_TEXT}

총평

${OVERALL_TEXT}`],
]

for (const [name, body] of STYLES) {
  test(`S 서식 — ${name}`, () => {
    const plan = parseReviewText(body)
    assert.equal(plan.outcome, 'ok', `${name}: ${plan.reason ?? ''}`)
    assert.equal(plan.noseNote, NOSE_TEXT, name)
    assert.equal(plan.tasteNote, TASTE_TEXT, name)
    assert.equal(plan.finishNote, FINISH_TEXT, name)
    assert.equal(plan.comment, OVERALL_TEXT, name)
  })
}

test('S 점수 — 라벨 뒤 별점을 100점으로 환산한다', () => {
  const plan = parseReviewText(`향 ★★★★☆
${NOSE_TEXT}
맛 ★★★★☆
${TASTE_TEXT}
피니시 ★★★☆☆
${FINISH_TEXT}
총평: ${OVERALL_TEXT}`)
  assert.equal(plan.outcome, 'ok')
  assert.equal(plan.noseScore, 80)
  assert.equal(plan.tasteScore, 80)
  assert.equal(plan.finishScore, 60)
  assert.equal(plan.noseNote, NOSE_TEXT)
})

test('S 점수 — 라벨 괄호 안 10점 만점을 환산한다', () => {
  const plan = parseReviewText(`향 (9/10): ${NOSE_TEXT}
맛 (8.5/10): ${TASTE_TEXT}
피니시 (8/10): ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`)
  assert.equal(plan.noseScore, 90)
  assert.equal(plan.tasteScore, 85)
  assert.equal(plan.finishScore, 80)
})

test('S 스펙 — `가격 생각하면` 같은 본문을 스펙 줄로 오인하지 않는다', () => {
  // `가격`·`색`·`상태` 는 스펙 라벨이면서 문장 첫머리에도 흔히 온다.
  // 구분자 없이 한글이 이어지면 본문이다 — 이걸 못 가리면 문장이 통째로 사라진다.
  const plan = parseReviewText(`향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
총평:
가격 생각하면 훌륭하다
색 하나는 정말 예쁘다`)
  assert.ok(plan.comment.includes('가격 생각하면 훌륭하다'))
  assert.ok(plan.comment.includes('색 하나는 정말 예쁘다'))
})

test('S 스펙 — 구분자나 값이 이어지면 스펙으로 본다', () => {
  const plan = parseReviewText(`제품명: 글렌알라키 15년
가격 : 12만원
ABV 46%
구입처: 면세점

향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`)
  assert.equal(plan.outcome, 'ok')
  const all = [plan.noseNote, plan.tasteNote, plan.finishNote, plan.comment].join(' ')
  assert.ok(!all.includes('12만원'))
  assert.ok(!all.includes('면세점'))
  assert.ok(!all.includes('46%'))
})

// ── applied — 화면이 어느 칸을 강조할지 정하는 계약 ──────────────

test('applied 에는 실제로 채운 칸만 담긴다', () => {
  const plan = parseReviewText(`향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
총평: ${OVERALL_TEXT}`)
  assert.equal(plan.outcome, 'ok')
  // 피니시는 못 찾았으니 강조 대상이 아니다.
  assert.deepEqual([...plan.applied].sort(), ['comment', 'nose', 'taste'])
  assert.ok(plan.warnings.some((w) => w.field === 'finish' && w.code === 'notFound'))
})

test('세 칸을 다 찾으면 applied 에 셋과 총평이 담긴다', () => {
  const plan = parseReviewText(`향: ${NOSE_TEXT}
맛: ${TASTE_TEXT}
피니시: ${FINISH_TEXT}
총평: ${OVERALL_TEXT}`)
  assert.deepEqual([...plan.applied].sort(), ['comment', 'finish', 'nose', 'taste'])
  assert.ok(!plan.warnings.some((w) => w.code === 'notFound'))
})

test('구분을 하나도 못 찾으면 여전히 아무것도 채우지 않는다', () => {
  const plan = parseReviewText(`어제 바에서 한 잔 했는데 첫 향이 진짜 좋았다.
사과랑 시나몬 같은 게 확 올라오고, 마시면 흑설탕 단맛이 두텁게 깔린다.
끝맛은 오크가 길게 남는데 전체적으로 가격 생각하면 훌륭한 위스키였다.`)
  assert.equal(plan.outcome, 'unlabeled')
  assert.equal(plan.reason, 'missingLabels')
  assert.deepEqual(plan.applied, [])
})

test('빈 입력은 직접 입력으로 보낸다', () => {
  assert.equal(parseReviewText('').outcome, 'unlabeled')
  assert.equal(parseReviewText('   \n\n  ').reason, 'empty')
})
