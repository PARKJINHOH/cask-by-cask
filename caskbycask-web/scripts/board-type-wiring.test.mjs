import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 게시판(PHOTO)을 추가할 때 함께 고쳐야 하는 지점이 여러 파일에 흩어져 있다.
 * 하나라도 빠지면 조용히 SSR 404 가 나거나 링크가 /community/free/{id} 로 잘못 잡힌다.
 * 배포 전에 한 번에 잡기 위해 텍스트로 검사한다(admin-menu.test.mjs 와 같은 방식).
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const WEB = join(HERE, '..')
const API = join(HERE, '..', '..', 'caskbycask-api')

const read = (...segments) => readFileSync(join(...segments), 'utf8')

describe('PHOTO 게시판 배선', () => {
  test('백엔드 BoardType 에 PHOTO 와 path() 헬퍼가 있다', () => {
    const source = read(API, 'src/main/java/com/caskbycask/domain/community/entity/enums/BoardType.java')
    assert.match(source, /\bPHOTO\b/)
    assert.match(source, /String path\(\)/)
  })

  test('board_type ENUM 을 확장하는 마이그레이션이 5개 테이블을 모두 다룬다', () => {
    // board_type 은 varchar 가 아니라 네이티브 ENUM 이라 ALTER 없이는 PHOTO 저장이 실패한다.
    const sql = read(API, 'src/main/resources/db/migration/V72__add_photo_board_type.sql')
    for (const table of ['posts', 'deleted_posts', 'post_prefixes', 'series', 'user_board_permissions']) {
      assert.ok(new RegExp(`ALTER TABLE ${table}\\b`, 'i').test(sql), `${table} 누락`)
    }
    assert.match(sql, /enum \('FREE','NOTICE','PHOTO'\)/)
  })

  test('"전체" 게시판은 화이트리스트를 유지한다 (PHOTO 가 새면 안 된다)', () => {
    const source = read(API, 'src/main/java/com/caskbycask/domain/community/repository/PostQueryRepositoryImpl.java')
    assert.match(source, /boardType\.in\(BoardType\.NOTICE, BoardType\.FREE\)/)
    assert.ok(!/boardType\.ne\(BoardType\.PHOTO\)/.test(source), '블랙리스트로 바꾸면 게시판 추가 때마다 샌다')
  })

  test('PHOTO 글쓰기에 전용 점수 액션이 걸려 있다', () => {
    assert.match(read(API, 'src/main/java/com/caskbycask/domain/score/constant/ScoreActions.java'),
      /POST_WRITE_PHOTO/)
    assert.match(read(API, 'src/main/java/com/caskbycask/domain/community/service/PostService.java'),
      /BoardType\.PHOTO\.equals\(post\.getBoardType\(\)\)[\s\S]{0,120}POST_WRITE_PHOTO/)
    assert.match(read(API, 'src/main/resources/db/migration/V77__seed_photo_card_score_config.sql'),
      /'POST_WRITE_PHOTO'/)
  })

  test('사이트맵에 갤러리 목록이 등록되어 있다', () => {
    assert.match(read(API, 'src/main/java/com/caskbycask/domain/seo/service/SitemapService.java'),
      /"\/community\/photo"/)
  })

  test('프론트 라우트가 등록되어 있다 (정적 경로가 :boardType 보다 먼저)', () => {
    const app = read(WEB, 'src/App.tsx')
    const photoIndex = app.indexOf('path="community/photo"')
    const dynamicIndex = app.indexOf('path="community/:boardType/:id"')
    assert.ok(photoIndex > 0, 'community/photo 라우트 누락')
    assert.ok(dynamicIndex > 0)
    assert.ok(photoIndex < dynamicIndex, '정적 경로가 :boardType 뒤에 오면 매칭되지 않는다')
    assert.match(app, /path="photo-card"/)
    // PostFormPage 는 photo 를 FREE 로 저장하므로 글쓰기 진입 자체를 막는다.
    assert.match(app, /path="community\/photo\/write"[\s\S]{0,80}\/photo-card/)
  })

  test('parsePath 가 photo 를 인식한다 (누락 시 SSR 404)', () => {
    const seo = read(WEB, 'src/shared/utils/seoHelpers.ts')
    assert.match(seo, /\['all', 'notice', 'free', 'byob', 'photo'\]/)
    assert.match(seo, /BOARD_LIST_CONFIG[\s\S]{0,4000}?photo:\s*\{/)
    assert.match(seo, /'PHOTO'[\s\S]{0,60}Spirits Photos/)
    assert.match(seo, /boardType === 'photo'/)
  })

  test('BoardListType 과 noindex 경로에 photo 가 있다', () => {
    assert.match(read(WEB, 'src/shared/utils/seoIndexing.ts'), /'photo'/)
    const proxy = read(WEB, 'src/proxy.ts')
    assert.match(proxy, /all\|notice\|free\|byob\|photo/)
    assert.match(proxy, /\\\/photo-card/)
  })

  test('알림·신고·스크랩 링크가 PHOTO 를 free 로 보내지 않는다', () => {
    assert.match(read(WEB, 'src/domain/notification/components/NotificationDropdown.tsx'),
      /'PHOTO':\s*return `\/community\/photo\//)
    assert.match(read(WEB, 'src/views-spa/NotificationsPage.tsx'),
      /targetType === 'PHOTO'[\s\S]{0,60}\/community\/photo\//)
    for (const file of [
      'src/views-spa/admin/AdminPostReportPage.tsx',
      'src/domain/community/components/MyScrappedPosts.tsx',
    ]) {
      const source = read(WEB, file)
      assert.ok(!/=== 'NOTICE' \? 'notice' : 'free'/.test(source),
        `${file}: 하드코딩 분기가 남아 있다`)
    }
  })

  test('프론트 BoardType 유니온에 PHOTO 가 있다', () => {
    assert.match(read(WEB, 'src/domain/community/types/community.types.ts'),
      /BoardType = 'NOTICE' \| 'FREE' \| 'PHOTO'/)
    assert.match(read(WEB, 'src/domain/admin/types/admin.types.ts'),
      /BoardType = 'NOTICE' \| 'FREE' \| 'PHOTO'/)
  })

  test('GNB 와 관리자 메뉴에 등록되어 있다', () => {
    assert.match(read(WEB, 'src/layouts/MainLayout.tsx'), /to: '\/community\/photo'/)
    assert.match(read(WEB, 'src/layouts/MainLayout.tsx'), /to: '\/photo-card'/)
    // adminMenu.ts 는 `{ path: '...', label: '...' }` 형식을 정규식으로 파싱한다.
    assert.match(read(WEB, 'src/domain/admin/constants/adminMenu.ts'),
      /\{\s*path:\s*'\/admin\/photo-cards',\s*label:\s*'포토카드 템플릿'/)
  })

  test('주류 태그 삭제 연쇄가 걸려 있다 (없으면 전체 게시글 삭제가 실패한다)', () => {
    const post = read(API, 'src/main/java/com/caskbycask/domain/community/entity/Post.java')
    assert.match(post, /@OneToMany\(mappedBy = "post", cascade = CascadeType\.ALL, orphanRemoval = true\)[\s\S]{0,80}PostSpiritTag/)
  })
})
