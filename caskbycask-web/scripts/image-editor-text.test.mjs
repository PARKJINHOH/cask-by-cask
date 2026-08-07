import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const {
  TEXT_FONT_FAMILIES,
  TEXT_FONT_GROUPS,
  TEXT_FONT_OPTIONS,
  TEXT_FONT_WEIGHT_LABEL_KEYS,
  getTextFontFamily,
  resolveTextFontKey,
  TEXT_LAYER_MAX,
  TEXT_OUTLINE_WIDTH_MAX,
  clampTextPosition,
  createDefaultTextStyle,
  createTextLayer,
  drawText,
  drawTextLayers,
  findTextLayerAtPoint,
  getDrawableTextLayers,
  getTextLines,
  measureTextBounds,
} = await import('../src/shared/components/imageEditorText.ts')

function fakeContext(widthPerCharacter = 20) {
  const calls = []
  return {
    calls,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    lineJoin: 'miter',
    lineWidth: 1,
    fillStyle: '',
    strokeStyle: '',
    measureText(text) {
      return { width: text.length * widthPerCharacter }
    },
    save() {
      calls.push(['save'])
    },
    restore() {
      calls.push(['restore'])
    },
    strokeText(text, x, y) {
      calls.push(['stroke', text, x, y, this.lineWidth, this.strokeStyle])
    },
    fillText(text, x, y) {
      calls.push(['fill', text, x, y, this.fillStyle])
    },
  }
}

describe('이미지 에디터 텍스트 스타일', () => {
  test('self-host 서체만 제공한다 (시스템 폰트 금지)', () => {
    // 브라우저마다 결과가 달라지는 시스템 폰트가 섞이면 출력 이미지가 재현되지 않는다.
    const allowed = [
      'Pretendard Variable', 'Black Han Sans', 'Do Hyeon', 'Jua',
      'Nanum Pen Script', 'Gowun Batang', 'Gowun Dodum', 'Song Myung', 'Noto Sans KR',
      // 영문 위주 서체 — 전부 self-host. 라이선스 근거는 assets/editor-fonts/<slug>/LICENSE* 참고.
      'Wanted Sans', 'IBM Plex Sans Condensed', 'Bebas Neue', 'Pacifico',
      'Stilu', 'Kalamkari', 'Cool Story', 'Magnolia Script', 'Exmouth',
      'Allura', 'Great Vibes', 'Dancing Script',
    ]
    for (const font of TEXT_FONT_OPTIONS) {
      const primary = font.family.match(/^'([^']+)'/)?.[1]
      assert.ok(allowed.includes(primary), `허용되지 않은 서체: ${font.family}`)
      assert.match(font.labelKey, /^imageEditor\.font[A-Z]/)
    }
  })

  test('서체 가족은 굵기를 묶고, 같은 가족은 이름·CSS 가족이 일치한다', () => {
    // 목록에는 가족만 두고 굵기는 그 안에서 고른다. 같은 familyKey 인데 이름이나
    // CSS 가족이 다르면 목록에서 같은 서체가 둘로 보이거나 미리보기가 엉뚱해진다.
    const byFamily = new Map()
    for (const font of TEXT_FONT_OPTIONS) {
      assert.ok(font.familyKey, `${font.key}: familyKey 가 없다`)
      assert.match(font.familyLabelKey, /^imageEditor\.family[A-Z]/, `${font.key}: familyLabelKey 규칙 위반`)
      const seen = byFamily.get(font.familyKey)
      if (!seen) { byFamily.set(font.familyKey, font); continue }
      assert.equal(font.familyLabelKey, seen.familyLabelKey, `${font.familyKey}: 가족 이름이 다르다`)
      assert.equal(font.family, seen.family, `${font.familyKey}: CSS 가족이 다르다`)
      assert.equal(font.groupKey, seen.groupKey, `${font.familyKey}: 그룹이 다르다`)
    }
    assert.equal(TEXT_FONT_FAMILIES.length, byFamily.size)

    // 가족 안에서 굵기는 중복 없이 가벼운 것부터
    for (const family of TEXT_FONT_FAMILIES) {
      const weights = family.weights.map((w) => w.weight)
      assert.deepEqual(weights, [...weights].sort((a, b) => a - b), `${family.key}: 굵기 정렬이 어긋난다`)
      assert.equal(new Set(weights).size, weights.length, `${family.key}: 굵기가 중복된다`)
      for (const entry of family.weights) {
        assert.ok(TEXT_FONT_WEIGHT_LABEL_KEYS[entry.weight], `${entry.fontKey}: ${entry.weight} 굵기 이름이 없다`)
      }
    }
  })

  test('가족을 바꾸면 가장 가까운 굵기로 이어진다', () => {
    // 굵은 글씨를 쓰다 가족만 바꿨는데 갑자기 가늘어지면 배치가 무너진다.
    assert.equal(resolveTextFontKey('pretendard', 700), 'pretendardBold')
    assert.equal(resolveTextFontKey('pretendard', 300), 'pretendardRegular')
    // 그 굵기가 없는 가족은 가장 가까운 것으로
    assert.equal(resolveTextFontKey('jua', 900), 'jua')
    assert.equal(resolveTextFontKey('notoSansKr', 900), 'notoSansKrBold')
    assert.equal(resolveTextFontKey('notoSansKr', 300), 'notoSansKrLight')
    // 아무 fontKey 로도 자기 가족을 찾을 수 있다
    for (const font of TEXT_FONT_OPTIONS) {
      assert.equal(getTextFontFamily(font.key).key, font.familyKey, font.key)
    }
  })

  test('글꼴 목록 CSS 를 immutable 로 캐시하지 않는다', () => {
    // 회귀 배경: `/fonts/:path*` 를 통째로 immutable 로 캐시했더니, 경로에 버전이 없는
    // editor-fonts.css 까지 굳어 버려 서체를 추가해도 브라우저가 옛 목록을 계속 썼다.
    // (immutable 은 재검증을 안 하므로 새로고침·서버 재기동으로도 풀리지 않는다)
    const config = readFileSync(join(HERE, '..', 'next.config.js'), 'utf8')
    assert.ok(
      !/source:\s*'\/fonts\/:path\*'/.test(config),
      '`/fonts/:path*` 포괄 규칙은 editor-fonts.css 까지 immutable 로 만든다',
    )
    assert.match(
      config,
      /'\/fonts\/editor\/editor-fonts\.css'[\s\S]{0,300}?must-revalidate/,
      'editor-fonts.css 에는 재검증 규칙이 있어야 한다',
    )
  })

  test('글꼴 CSS 주소에 붙는 내용 해시가 최신이다', () => {
    // 해시가 어긋나면 서체를 바꾸고 `npm run fonts:sync-editor` 를 다시 돌리지 않은 것이다.
    const loader = readFileSync(join(HERE, '..', 'src', 'shared', 'components', 'imageEditorFontCss.ts'), 'utf8')
    assert.match(loader, /EDITOR_FONT_CSS_VERSION/, '로더가 버전 쿼리를 붙이지 않는다')

    const css = readFileSync(join(HERE, '..', 'public', 'fonts', 'editor', 'editor-fonts.css'), 'utf8')
    const expected = createHash('sha256').update(css).digest('hex').slice(0, 8)
    const version = readFileSync(join(HERE, '..', 'src', 'shared', 'components', 'editorFontCssVersion.ts'), 'utf8')
    assert.match(version, new RegExp(`'${expected}'`), 'fonts:sync-editor 를 다시 실행해야 한다')
  })

  test('Pretendard 는 굵기 4단계를 유지한다', () => {
    const pretendard = TEXT_FONT_OPTIONS.filter((font) => font.key.startsWith('pretendard'))
    assert.deepEqual(pretendard.map((font) => font.weight), [400, 600, 700, 900])
    for (const font of pretendard) {
      assert.match(font.family, /Pretendard Variable/)
    }
  })

  test('장식용 서체는 Pretendard 로 폴백한다', () => {
    const decorative = TEXT_FONT_OPTIONS.filter((font) => !font.key.startsWith('pretendard'))
    assert.ok(decorative.length >= 6, '장식용 서체가 6종 이상이어야 한다')
    for (const font of decorative) {
      // 자소가 빠진 글자에서 네모칸(tofu)이 나오지 않게 한다.
      assert.match(font.family, /Pretendard Variable/, font.key)
    }
  })

  test('모든 서체가 그룹에 속한다', () => {
    const groupKeys = new Set(TEXT_FONT_GROUPS.map((group) => group.key))
    for (const font of TEXT_FONT_OPTIONS) {
      assert.ok(groupKeys.has(font.groupKey), `${font.key} 의 그룹이 없다: ${font.groupKey}`)
    }
  })

  test('폰트 키가 중복되지 않는다', () => {
    const keys = TEXT_FONT_OPTIONS.map((font) => font.key)
    assert.equal(new Set(keys).size, keys.length)
  })

  test('Pretendard 저작권 고지와 OFL 전문을 함께 배포한다', () => {
    const license = readFileSync(
      join(HERE, '..', 'public', 'fonts', 'pretendard', 'LICENSE.txt'),
      'utf8',
    )
    assert.match(license, /Copyright \(c\) 2021, Kil Hyung-jin/)
    assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/)
    assert.match(license, /with Reserved Font Name Pretendard/)
  })

  test('에디터 전용 서체도 self-host 자산과 OFL 전문을 함께 배포한다', () => {
    // OFL 은 재배포 시 라이선스 사본 동봉을 요구한다. 자산이 없으면 CSS 만 남아 폴백된다.
    const editorRoot = join(HERE, '..', 'public', 'fonts', 'editor')
    const css = readFileSync(join(editorRoot, 'editor-fonts.css'), 'utf8')
    assert.ok(!css.includes('fonts.gstatic.com'), 'CSS 에 외부 CDN 경로가 남아 있다')

    for (const slug of ['blackhansans', 'dohyeon', 'jua', 'nanumpenscript', 'gowunbatang', 'songmyung']) {
      const license = readFileSync(join(editorRoot, slug, 'LICENSE.txt'), 'utf8')
      assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/, slug)
      assert.ok(css.includes(`/fonts/editor/${slug}/`), `${slug} 의 @font-face 가 없다`)
    }

    // CSS 가 참조하는 woff2 가 실제로 저장소에 있는지 확인한다.
    const refs = [...css.matchAll(/url\((\/fonts\/editor\/[^)]+\.woff2)\)/g)].map((m) => m[1])
    assert.ok(refs.length > 0, 'CSS 에서 woff2 참조를 찾지 못했다')
    for (const ref of refs) {
      assert.ok(existsSync(join(HERE, '..', 'public', ref)), `누락된 폰트 파일: ${ref}`)
    }
  })

  test('기본값은 흰색 굵은 글자와 검은 외곽선이다', () => {
    const style = createDefaultTextStyle(72)
    assert.equal(style.fontSize, 72)
    assert.equal(style.fontKey, 'pretendardBold')
    assert.equal(style.color, '#ffffff')
    assert.equal(style.outlineEnabled, true)
    assert.equal(style.outlineColor, '#000000')
    assert.equal(style.position.x, 0.5)
    assert.equal(style.position.y, 0.5)
  })

  test('외곽선 굵기 상한은 30px 이다', () => {
    assert.equal(TEXT_OUTLINE_WIDTH_MAX, 30)
  })

  test('Windows 줄바꿈을 여러 줄로 정규화한다', () => {
    assert.deepEqual(getTextLines('첫 줄\r\n둘째 줄'), ['첫 줄', '둘째 줄'])
  })
})

describe('텍스트 레이어', () => {
  const canvas = { width: 1000, height: 500 }

  test('레이어마다 고유 id 를 부여한다', () => {
    const ids = Array.from({ length: 5 }, () => createTextLayer().id)
    assert.equal(new Set(ids).size, ids.length)
  })

  test('레이어마다 글꼴을 따로 지정할 수 있다', () => {
    const layer = createTextLayer(40, { fontKey: 'blackHanSans', color: '#ff0000' })
    assert.equal(layer.fontKey, 'blackHanSans')
    assert.equal(layer.color, '#ff0000')
    assert.equal(layer.fontSize, 40)
  })

  test('서식을 물려받아도 id 는 새로 만든다', () => {
    // 편집 중인 레이어를 통째로 넘겨 새 레이어를 만드는 경로가 있다. id 가 복사되면
    // 두 레이어가 같은 키를 갖게 되어 선택·삭제가 엉킨다.
    const source = createTextLayer(40, { content: '원본', fontKey: 'jua' })
    const copied = createTextLayer(40, source)
    assert.notEqual(copied.id, source.id)
    assert.equal(copied.fontKey, 'jua')
  })

  test('상한이 정의되어 있다', () => {
    assert.equal(typeof TEXT_LAYER_MAX, 'number')
    assert.ok(TEXT_LAYER_MAX >= 2)
  })

  test('빈 레이어는 그리지 않는다', () => {
    const layers = [
      createTextLayer(40, { content: '첫째' }),
      createTextLayer(40, { content: '   ' }),
      createTextLayer(40, { content: '둘째' }),
    ]
    assert.deepEqual(getDrawableTextLayers(layers).map((l) => l.content), ['첫째', '둘째'])
  })

  test('레이어를 추가된 순서대로 그린다 (뒤쪽이 위)', () => {
    const context = fakeContext()
    const layers = [
      createTextLayer(40, { content: 'one', outlineEnabled: false, position: { x: 0.25, y: 0.5 } }),
      createTextLayer(40, { content: 'two', outlineEnabled: false, position: { x: 0.75, y: 0.5 } }),
    ]
    drawTextLayers(context, canvas, layers)

    assert.deepEqual(
      context.calls.filter(([type]) => type === 'fill').map(([, text, x]) => [text, x]),
      [['one', 250], ['two', 750]],
    )
  })

  test('겹친 레이어는 위에 그려진 것을 먼저 집는다', () => {
    const context = fakeContext(10)
    const under = createTextLayer(40, { content: 'AAAA', outlineEnabled: false, position: { x: 0.5, y: 0.5 } })
    const over = createTextLayer(40, { content: 'BBBB', outlineEnabled: false, position: { x: 0.5, y: 0.5 } })
    const hit = findTextLayerAtPoint(context, canvas, [under, over], { x: 500, y: 250 })
    assert.equal(hit?.id, over.id)
  })

  test('어느 레이어에도 닿지 않으면 null 이다', () => {
    const context = fakeContext(10)
    const layer = createTextLayer(40, { content: 'AB', outlineEnabled: false, position: { x: 0.1, y: 0.1 } })
    assert.equal(findTextLayerAtPoint(context, canvas, [layer], { x: 950, y: 480 }), null)
  })

  test('내용이 빈 레이어는 집히지 않는다', () => {
    const context = fakeContext(10)
    const layer = createTextLayer(40, { content: '', position: { x: 0.5, y: 0.5 } })
    assert.equal(findTextLayerAtPoint(context, canvas, [layer], { x: 500, y: 250 }), null)
  })
})

describe('텍스트 위치와 출력', () => {
  const canvas = { width: 1000, height: 500 }

  test('텍스트와 외곽선이 이미지 밖으로 나가지 않게 위치를 제한한다', () => {
    const context = fakeContext(100)
    const style = {
      ...createDefaultTextStyle(40),
      content: 'ABCD',
      outlineWidth: 5,
    }
    const leftTop = clampTextPosition(context, canvas, style, { x: 0, y: 0 })
    const rightBottom = clampTextPosition(context, canvas, style, { x: 1, y: 1 })

    assert.deepEqual(leftTop, { x: 0.205, y: 0.06 })
    assert.deepEqual(rightBottom, { x: 0.795, y: 0.94 })
  })

  test('여러 줄 높이와 중앙 위치를 계산한다', () => {
    const context = fakeContext(20)
    const style = {
      ...createDefaultTextStyle(40),
      content: 'one\ntwo',
      outlineWidth: 0,
      position: { x: 0.25, y: 0.75 },
    }
    assert.deepEqual(measureTextBounds(context, canvas, style), {
      left: 220,
      top: 325,
      right: 280,
      bottom: 425,
    })
  })

  test('각 줄에 외곽선을 먼저, 본문을 나중에 그린다', () => {
    const context = fakeContext()
    const style = {
      ...createDefaultTextStyle(40),
      content: 'one\ntwo',
      outlineWidth: 3,
      position: { x: 0.5, y: 0.5 },
    }
    drawText(context, canvas, style)

    assert.deepEqual(context.calls, [
      ['save'],
      ['stroke', 'one', 500, 225, 6, '#000000'],
      ['fill', 'one', 500, 225, '#ffffff'],
      ['stroke', 'two', 500, 275, 6, '#000000'],
      ['fill', 'two', 500, 275, '#ffffff'],
      ['restore'],
    ])
  })

  test('외곽선을 끄면 fill 만 그린다', () => {
    const context = fakeContext()
    const style = {
      ...createDefaultTextStyle(40),
      content: 'text',
      outlineEnabled: false,
    }
    drawText(context, canvas, style)
    assert.equal(context.calls.some(([type]) => type === 'stroke'), false)
    assert.equal(context.calls.some(([type]) => type === 'fill'), true)
  })
})

describe('텍스트 UI 번역', () => {
  const requiredKeys = [
    'text', 'textContent', 'textPlaceholder', 'font', 'fontSize', 'textColor',
    'outline', 'outlineColor', 'outlineWidth', 'positionX', 'positionY',
    'textDragHint', 'textPositionCanvas', 'fontLicense', 'applyText', 'applyingText',
    'textLayers', 'addTextLayer', 'removeTextLayer', 'textLayerName', 'emptyTextLayer',
    'textLayerLimit', 'textLayerHint',
  ]

  for (const language of ['ko', 'en']) {
    test(`${language} 번역 키가 모두 존재한다`, () => {
      const locale = JSON.parse(readFileSync(join(HERE, '..', 'src', 'locales', `${language}.json`), 'utf8'))
      for (const key of requiredKeys) {
        assert.equal(typeof locale.imageEditor[key], 'string', `${language}: imageEditor.${key}`)
        assert.ok(locale.imageEditor[key].length > 0, `${language}: imageEditor.${key} 값이 비어 있음`)
      }
      for (const font of TEXT_FONT_OPTIONS) {
        const key = font.labelKey.replace('imageEditor.', '')
        assert.equal(typeof locale.imageEditor[key], 'string', `${language}: ${font.labelKey}`)
      }
      for (const group of TEXT_FONT_GROUPS) {
        const key = group.labelKey.replace('imageEditor.', '')
        assert.equal(typeof locale.imageEditor[key], 'string', `${language}: ${group.labelKey}`)
      }
    })
  }
})
