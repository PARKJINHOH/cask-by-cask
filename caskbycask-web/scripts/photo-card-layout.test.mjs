import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = join(HERE, '..', 'src', 'domain', 'photo-card')

const {
  PHOTO_CARD_BINDINGS, PHOTO_CARD_MAX_LAYERS, PHOTO_CARD_MAX_TEXT_LENGTH,
  PHOTO_CARD_MAX_EXTEND, PHOTO_CARD_SCHEMA_VERSION, normalizeLayer, normalizeLayout,
} = await import('../src/domain/photo-card/utils/layoutSchema.ts')

const { BUILTIN_LAYOUTS, defaultPhotoCardLayout } =
  await import('../src/domain/photo-card/constants/builtinLayouts.ts')

const {
  formatAperture, formatCamera, formatFocalLength, formatIso, formatShotAt, formatShutter,
} = await import('../src/domain/photo-card/utils/exifReader.ts')

const { getDrawableLayers, resolveBindingValue, resolveLayerText } =
  await import('../src/domain/photo-card/utils/resolveBindings.ts')

const {
  frameSizeOf, measureLayerBounds, findLayerAtPoint, photoRectOf, toPx,
  drawPhoto, photoPlacementOf, reanchorLayersForExtend, reflowLayersForFrame, shortSideOf, textBaselineYOf,
  drawWatermark, watermarkRectOf,
  WATERMARK_MARGIN_RATIO, WATERMARK_OPACITY, WATERMARK_WIDTH_RATIO,
} = await import('../src/domain/photo-card/utils/photoCardRender.ts')

const { buildPhotoCardDraft } = await import('../src/domain/photo-card/utils/photoCardDraft.ts')

const { buildDraftContent, parseDraftContent } =
  await import('../src/domain/photo-card/utils/photoCardServerDraft.ts')

const { alignLayers, applySnap, collectSnapTargets, distributeLayers } =
  await import('../src/domain/photo-card/utils/photoCardSnap.ts')

const { USER_BINDINGS, placeCarriedLayers } =
  await import('../src/domain/photo-card/hooks/usePhotoCardEditor.ts')

const { TEXT_FONT_OPTIONS } = await import('../src/shared/components/imageEditorText.ts')

// ── 캔버스 대역 ──────────────────────────────────────────────
function fakeContext(widthPerCharacter = 10) {
  const calls = []
  return {
    calls,
    font: '', textAlign: 'start', textBaseline: 'alphabetic', lineJoin: 'miter',
    lineWidth: 1, fillStyle: '', strokeStyle: '', globalAlpha: 1,
    measureText: (t) => ({ width: t.length * widthPerCharacter }),
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {},
    moveTo() {}, lineTo() {}, quadraticCurveTo() {}, fill() {}, stroke() {},
    // 클립 영역을 확인해야 해서 rect 는 인자를 남긴다.
    rect: (...a) => calls.push(['rect', ...a]),
    translate() {}, rotate() {}, clearRect() {},
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    drawImage: (...a) => calls.push(['drawImage', ...a]),
    strokeText: (t, x, y) => calls.push(['stroke', t, x, y]),
    fillText: (t, x, y) => calls.push(['fill', t, x, y]),
  }
}

const emptyContext = () => ({
  exif: null,
  spirit: null,
  user: { place: '', memo: '', date: '' },
})

describe('포토카드 레이아웃 스키마', () => {
  test('스키마 버전은 서버 상수로 고정된다 (클라이언트 값 무시)', () => {
    const layout = normalizeLayout({ ...defaultPhotoCardLayout(), schemaVersion: 999 })
    assert.equal(layout.schemaVersion, PHOTO_CARD_SCHEMA_VERSION)
  })

  test('레이어 수 상한을 넘기면 잘라 낸다', () => {
    const layers = Array.from({ length: PHOTO_CARD_MAX_LAYERS + 8 }, (_, i) => ({
      id: `l${i}`, type: 'TEXT', position: { x: 0.5, y: 0.5 },
    }))
    assert.equal(normalizeLayout({ ...defaultPhotoCardLayout(), layers }).layers.length,
      PHOTO_CARD_MAX_LAYERS)
  })

  test('좌표·비율이 범위를 벗어나면 잘라 낸다', () => {
    const layer = normalizeLayer({
      id: 'x', type: 'TEXT', position: { x: 5, y: -3 }, fontSizeRatio: 99, rotation: 900,
    })
    assert.equal(layer.position.x, 1)
    assert.equal(layer.position.y, 0)
    assert.equal(layer.fontSizeRatio, 0.3)
    assert.equal(layer.rotation, 180)
  })

  test('텍스트는 상한 길이로 자른다', () => {
    // 상한을 올려도 깨지지 않게 상한보다 긴 입력을 만든다
    const layer = normalizeLayer({
      id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 },
      text: 'ㄱ'.repeat(PHOTO_CARD_MAX_TEXT_LENGTH + 100),
    })
    assert.equal(layer.text.length, PHOTO_CARD_MAX_TEXT_LENGTH)
  })

  test('자간은 백엔드와 같은 범위로 자르고, 없으면 넣지 않는다', () => {
    // 백엔드 normalizeTextLayer 의 clamp(-0.5, 1.0) 와 같아야 저장 단계에서 400 이 나지 않는다.
    const base = { id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 } }
    assert.equal(normalizeLayer({ ...base, letterSpacing: 0.2 }).letterSpacing, 0.2)
    assert.equal(normalizeLayer({ ...base, letterSpacing: 9 }).letterSpacing, 1)
    assert.equal(normalizeLayer({ ...base, letterSpacing: -9 }).letterSpacing, -0.5)
    // 값이 없으면 undefined 로 남아 직렬화에서 빠진다 — 기존 템플릿 JSON 이 이유 없이 커지지 않게.
    assert.equal(normalizeLayer(base).letterSpacing, undefined)
  })

  test('허용되지 않은 글꼴·색상은 기본값으로 되돌린다', () => {
    const layer = normalizeLayer({
      id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 },
      fontKey: 'ComicSans', color: 'red', outlineColor: '#12345',
    })
    assert.equal(layer.fontKey, 'pretendardBold')
    assert.equal(layer.color, '#ffffff')
    assert.equal(layer.outlineColor, '#000000')
  })

  test('문단 정렬은 더 이상 저장하지 않는다', () => {
    // 글자는 언제나 가운데 기준으로 그린다. 옛 템플릿 JSON 에 남아 있는 align 은
    // 여기서 조용히 떨어져야 저장할 때마다 쓰지 않는 값이 따라다니지 않는다.
    const layer = normalizeLayer({
      id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 }, align: 'right',
    })
    assert.equal('align' in layer, false)
  })

  test('글꼴 화이트리스트가 백엔드 FONT_KEYS 와 일치한다', () => {
    // 시스템 폰트가 섞이면 사용자마다 다른 이미지가 나온다. 프론트에만 글꼴을 추가하면
    // 편집은 되는데 '내 템플릿으로 저장'에서 400 이 난다 — 양쪽을 붙여 둔다.
    const allowed = new Set(TEXT_FONT_OPTIONS.map((f) => f.key))
    for (const key of allowed) {
      assert.equal(normalizeLayer({
        id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 }, fontKey: key,
      }).fontKey, key)
    }

    const java = readFileSync(join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java',
      'com', 'caskbycask', 'domain', 'photocard', 'service', 'PhotoCardTemplateService.java'), 'utf8')
    const body = java.slice(java.indexOf('FONT_KEYS = Set.of('))
    const javaKeys = [...body.slice(0, body.indexOf(');')).matchAll(/"([A-Za-z]+)"/g)].map((m) => m[1])
    assert.deepEqual([...allowed].sort(), javaKeys.sort())
  })

  test('등록한 글꼴은 self-host CSS 에 실제로 들어 있다', () => {
    // 목록에만 추가하고 `npm run fonts:sync-editor` 를 잊으면 브라우저 기본 글꼴로 그려진다.
    const css = readFileSync(join(HERE, '..', 'public', 'fonts', 'editor', 'editor-fonts.css'), 'utf8')
    const families = new Set([...css.matchAll(/font-family:\s*["']([^"']+)["']/g)].map((m) => m[1]))
    for (const font of TEXT_FONT_OPTIONS) {
      // Pretendard 는 본문 서체라 editor-fonts.css 가 아니라 별도 번들에서 온다.
      const family = font.family.match(/^'([^']+)'/)?.[1]
      if (!family || family.startsWith('Pretendard')) continue
      assert.ok(families.has(family), `${family} 가 editor-fonts.css 에 없다 (fonts:sync-editor 실행 필요)`)
    }
  })

  test('UPLOAD 이외의 이미지 레이어는 uploadUrl 을 지운다', () => {
    const layer = normalizeLayer({
      id: 'x', type: 'IMAGE', position: { x: 0.5, y: 0.5 },
      source: 'PRODUCER_LOGO', uploadUrl: 'https://evil.example/x.png',
    })
    assert.equal(layer.uploadUrl, null)
  })

  test('GPS 는 바인딩으로만 존재하고 기본 템플릿에는 들어가지 않는다', () => {
    // 좌표는 집·직장을 드러낼 수 있다. 값 자체는 읽지만, 카드에 얹는 것은
    // 사용자가 EXIF 목록에서 직접 ＋ 를 눌렀을 때뿐이어야 한다.
    assert.ok(PHOTO_CARD_BINDINGS.includes('EXIF_GPS'))
    for (const builtin of BUILTIN_LAYOUTS) {
      const gpsLayers = builtin.layout.layers.filter((layer) => layer.binding === 'EXIF_GPS')
      assert.equal(gpsLayers.length, 0, `${builtin.key} 가 GPS 를 자동으로 넣는다`)
    }
  })

  test('바인딩 목록이 백엔드 enum 과 일치한다', () => {
    const java = readFileSync(join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java',
      'com', 'caskbycask', 'domain', 'photocard', 'dto', 'PhotoCardBinding.java'), 'utf8')
    const body = java.slice(java.indexOf('{'), java.lastIndexOf('}'))
    // 마지막 값에는 쉼표가 없다. 숫자가 들어간 값(EXIF_FOCAL_LENGTH_35)도 놓치지 않게 0-9 를 포함한다.
    const javaValues = [...body.matchAll(/^\s{4}([A-Z][A-Z0-9_]*)\s*(?:,|;|$)/gm)].map((m) => m[1])
    assert.deepEqual([...PHOTO_CARD_BINDINGS].sort(), javaValues.sort())
  })
})

describe('기본 템플릿', () => {
  test('5종이 모두 정규화를 통과한다', () => {
    assert.equal(BUILTIN_LAYOUTS.length, 5)
    for (const builtin of BUILTIN_LAYOUTS) {
      const normalized = normalizeLayout(builtin.layout)
      assert.equal(normalized.schemaVersion, PHOTO_CARD_SCHEMA_VERSION)
      assert.ok(normalized.layers.length > 0, builtin.key)
      // 정규화가 값을 바꾸지 않아야 한다 = 애초에 유효한 정의라는 뜻
      assert.deepEqual(normalized, normalizeLayout(normalized), builtin.key)
    }
  })

  test('목록 순서가 미니멀부터다', () => {
    assert.deepEqual(BUILTIN_LAYOUTS.map((b) => b.key),
      ['minimal', 'stacked', 'classic', 'polaroid', 'darkBar'])
  })

  test('처음 열면 미니멀의 틀만 있고 요소는 비어 있다', () => {
    // 자동 채움 텍스트를 미리 깔아 두면 주류를 고르기 전에는 카드에 안 보이는데
    // 레이어 목록에만 남아 "이게 왜 있지"가 된다.
    const initial = defaultPhotoCardLayout()
    assert.deepEqual(initial.frame, BUILTIN_LAYOUTS[0].layout.frame)
    assert.deepEqual(initial.layers, [])
    // 템플릿 자체는 그대로 — 직접 고르면 요소가 들어와야 한다.
    assert.ok(BUILTIN_LAYOUTS[0].layout.layers.length > 0)
  })

  test('레이어 id 가 템플릿 안에서 중복되지 않는다', () => {
    for (const builtin of BUILTIN_LAYOUTS) {
      const ids = builtin.layout.layers.map((l) => l.id)
      assert.equal(new Set(ids).size, ids.length, builtin.key)
    }
  })

  test('하단 밴드가 있는 템플릿은 사진 아래 여백을 확보한다', () => {
    const classic = BUILTIN_LAYOUTS.find((b) => b.key === 'classic')
    assert.ok(classic.layout.frame.padding.bottom > classic.layout.frame.padding.top)
  })
})

describe('EXIF 표기', () => {
  test('조리개·셔터·ISO·초점거리를 사진 관용 표기로 만든다', () => {
    assert.equal(formatAperture(1.8), 'ƒ/1.8')
    assert.equal(formatAperture(2), 'ƒ/2')
    assert.equal(formatShutter(0.004), '1/250s')
    assert.equal(formatShutter(2.5), '2.5s')
    assert.equal(formatShutter(1), '1s')
    assert.equal(formatIso(800), 'ISO 800')
    assert.equal(formatFocalLength(35), '35mm')
  })

  test('제조사가 모델명에 이미 들어 있으면 중복을 뺀다', () => {
    assert.equal(formatCamera({ cameraMake: 'SONY', cameraModel: 'SONY α7C II' }), 'SONY α7C II')
    assert.equal(formatCamera({ cameraMake: 'NIKON CORPORATION', cameraModel: 'Z 6_2' }),
      'NIKON CORPORATION Z 6_2')
    assert.equal(formatCamera(null), '')
  })

  test('값이 없으면 빈 문자열이다 (EXIF 없는 사진도 편집 가능해야 한다)', () => {
    assert.equal(formatAperture(null), '')
    assert.equal(formatShutter(null), '')
    assert.equal(formatIso(null), '')
    assert.equal(formatShotAt(null), '')
  })
})

describe('바인딩 해석', () => {
  const context = {
    exif: {
      cameraMake: 'SONY', cameraModel: 'ILCE-7CM2', lensModel: 'FE 35mm F1.4 GM',
      aperture: 1.8, shutterSpeed: 0.008, iso: 800, focalLength: 35,
      shotAt: new Date(2026, 7, 2),
    },
    spirit: {
      spiritId: 1, nameKo: '아드벡 우거다일', nameEn: 'Ardbeg Uigeadail', category: 'WHISKY',
      abv: '54.2', volumeMl: '700', vintageYear: '', producerNameKo: '아드벡',
      producerNameEn: 'Ardbeg', producerCountry: '스코틀랜드',
      producerLogoUrl: '/api/producers/images/a.webp', spiritImageUrl: null,
    },
    user: { place: '이태원 Bar Cham', memo: '오늘의 한 잔', date: '2026.08.02' },
  }

  test('EXIF·주류·생산자·사용자 입력을 모두 해석한다', () => {
    assert.equal(resolveBindingValue('EXIF_CAMERA', context), 'SONY ILCE-7CM2')
    assert.equal(resolveBindingValue('EXIF_APERTURE', context), 'ƒ/1.8')
    assert.equal(resolveBindingValue('EXIF_SHUTTER', context), '1/125s')
    assert.equal(resolveBindingValue('SPIRIT_NAME_KO', context), '아드벡 우거다일')
    assert.equal(resolveBindingValue('SPIRIT_ABV', context), '54.2%')
    assert.equal(resolveBindingValue('SPIRIT_VOLUME', context), '700ml')
    assert.equal(resolveBindingValue('PRODUCER_NAME_EN', context), 'Ardbeg')
    assert.equal(resolveBindingValue('USER_PLACE', context), '이태원 Bar Cham')
    assert.equal(resolveBindingValue('NONE', context), '')
  })

  test('사용자가 고친 값이 자동값보다 우선한다', () => {
    const layer = {
      id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 },
      binding: 'SPIRIT_NAME_KO', overridden: true, text: '직접 쓴 이름',
    }
    assert.equal(resolveLayerText(layer, context), '직접 쓴 이름')
    assert.equal(resolveLayerText({ ...layer, overridden: false }, context), '아드벡 우거다일')
  })

  test('값이 비는 자동 텍스트는 그리지 않는다', () => {
    // EXIF 없는 사진에서 빈 줄·구분선만 남는 어색한 카드를 막는다.
    const layers = [
      { id: 'a', type: 'TEXT', position: { x: 0.5, y: 0.5 }, binding: 'EXIF_LENS' },
      { id: 'b', type: 'TEXT', position: { x: 0.5, y: 0.6 }, binding: 'NONE', text: '고정 문구' },
      { id: 'c', type: 'TEXT', position: { x: 0.5, y: 0.7 }, binding: 'NONE', text: '  ' },
      { id: 'd', type: 'IMAGE', position: { x: 0.5, y: 0.8 }, source: 'PRODUCER_LOGO' },
      { id: 'e', type: 'DIVIDER', position: { x: 0.5, y: 0.9 } },
    ]
    assert.deepEqual(getDrawableLayers(layers, emptyContext()).map((l) => l.id), ['b', 'e'])
    assert.deepEqual(getDrawableLayers(layers, context).map((l) => l.id), ['a', 'b', 'd', 'e'])
  })

  test('visible=false 인 레이어는 빠진다', () => {
    const layers = [{ id: 'a', type: 'DIVIDER', position: { x: 0.5, y: 0.5 }, visible: false }]
    assert.equal(getDrawableLayers(layers, emptyContext()).length, 0)
  })
})

describe('렌더 기하', () => {
  test('비율별 프레임 크기 — 긴 변이 상한이다', () => {
    assert.deepEqual(frameSizeOf({ ratio: '1:1' }, 1000), { width: 1000, height: 1000 })
    assert.deepEqual(frameSizeOf({ ratio: '4:5' }, 1000), { width: 800, height: 1000 })
    assert.deepEqual(frameSizeOf({ ratio: '16:9' }, 1000), { width: 1000, height: 563 })
    assert.deepEqual(frameSizeOf({ ratio: '9:16' }, 1000), { width: 563, height: 1000 })
  })

  test('크기는 프레임 짧은 변 기준이라 비율이 달라도 글자가 같아 보인다', () => {
    // 4:5(짧은 변 800)와 1:1(짧은 변 1000)에서 같은 비율이 서로 다른 px 가 되는 것이 정상이고,
    // 짧은 변이 같으면 결과도 같아야 한다.
    assert.equal(toPx(0.04, 800), 32)
    assert.equal(toPx(0.04, 1000), 40)
    assert.equal(toPx(undefined, 1000, 0.05), 50)
  })

  test('하단 밴드 템플릿의 사진 영역이 여백만큼 줄어든다', () => {
    const layout = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    const size = frameSizeOf({ ratio: '4:5' }, 1000)          // 800 x 1000, 짧은 변 800
    const rect = photoRectOf(layout, size)
    assert.equal(Math.round(rect.left), 36)         // 0.045 * 800
    assert.equal(Math.round(rect.top), 36)
    assert.equal(Math.round(rect.width), 728)       // 800 - 36*2
    assert.equal(Math.round(rect.height), 756)      // 1000 - 36 - 208(=0.26*800)
    assert.ok(rect.top + rect.height < size.height, '사진 아래에 정보 밴드 자리가 남아야 한다')
  })

  test('비율을 바꾸면 요소가 새 액자를 따라간다', () => {
    // 회귀 배경: 좌표는 프레임 대비, 글자 크기·여백은 짧은 변 대비다. 그대로 두고 비율만 바꾸면
    // 밴드에 앉아 있던 줄이 사진 위로 올라가거나(세로로 긴 비율) 줄끼리 겹쳤다(정사각·가로 비율).
    const layout = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    for (const ratio of ['1:1', '3:4', '9:16', '16:9']) {
      const frame = { ...layout.frame, ratio }
      const layers = reflowLayersForFrame(layout, frame)
      const size = frameSizeOf({ ratio }, 1000)
      const rect = photoRectOf({ ...layout, frame }, size)
      const photoBottom = rect.top + rect.height

      for (const layer of layers) {
        assert.ok(layer.position.y * size.height > photoBottom,
          `${ratio}: ${layer.id} 가 사진 위로 올라갔다`)
        assert.ok(layer.position.y <= 1, `${ratio}: ${layer.id} 가 카드 밖으로 나갔다`)
      }

      // 줄 간격은 글자 크기와 같은 기준(짧은 변)으로 유지된다 — 그래야 겹치지 않는다.
      const gapOf = (list, first, second, canvas) => {
        const a = list.find((l) => l.id === first)
        const b = list.find((l) => l.id === second)
        return ((b.position.y - a.position.y) * canvas.height) / shortSideOf(canvas)
      }
      const base = frameSizeOf(layout.frame, 1000)
      assert.ok(
        Math.abs(gapOf(layers, 'classic-name', 'classic-producer', size)
          - gapOf(layout.layers, 'classic-name', 'classic-producer', base)) < 0.002,
        `${ratio}: 줄 간격이 글자 크기와 따로 논다`,
      )
    }
  })

  test('밴드가 얇아져도 요소는 밴드 안에 남는다', () => {
    // 「사진 비율에 맞추기」는 남는 자리를 그대로 밴드로 쓴다 — 밴드가 원래보다 얇아질 수 있다.
    // 사진 아래 거리를 그대로 유지하면 글이 카드 밖으로 밀려나므로, 밴드 안에서의 자리를 지킨다.
    const layout = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    const frame = { ...layout.frame, padding: { top: 0, right: 0, bottom: 0.1, left: 0 } }
    const size = frameSizeOf(frame, 1000)
    const rect = photoRectOf({ ...layout, frame }, size)
    const photoBottom = rect.top + rect.height

    for (const layer of reflowLayersForFrame(layout, frame)) {
      const y = layer.position.y * size.height
      assert.ok(y > photoBottom, `${layer.id} 가 사진 위로 올라갔다`)
      assert.ok(y < size.height, `${layer.id} 가 카드 아래로 나갔다`)
    }
  })

  test('텍스트 경계는 position 을 가운데로 잡는다', () => {
    // 글자는 가운데 기준으로만 그린다 — 옛 align 값이 섞여 들어와도 경계가 흔들리면 안 된다.
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const base = {
      id: 'x', type: 'TEXT', position: { x: 0.5, y: 0.5 },
      fontSizeRatio: 0.04, binding: 'NONE', text: '1234567890',
    }
    const bounds = measureLayerBounds(ctx, size, base, emptyContext())
    assert.equal((bounds.left + bounds.right) / 2, 400)
    assert.deepEqual(
      measureLayerBounds(ctx, size, { ...base, align: 'right' }, emptyContext()),
      bounds,
    )
  })

  test('겹친 레이어는 위에 그려진 것을 먼저 집는다', () => {
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const under = { id: 'under', type: 'TEXT', position: { x: 0.5, y: 0.5 }, binding: 'NONE', text: 'AAAA', fontSizeRatio: 0.04 }
    const over = { id: 'over', type: 'TEXT', position: { x: 0.5, y: 0.5 }, binding: 'NONE', text: 'BBBB', fontSizeRatio: 0.04 }
    const hit = findLayerAtPoint(ctx, size, [under, over], emptyContext(), { x: 400, y: 500 })
    assert.equal(hit?.id, 'over')
  })

  test('회전한 구분선은 화면에 보이는 방향으로 집는다', () => {
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const divider = {
      id: 'vertical-divider', type: 'DIVIDER', position: { x: 0.5, y: 0.5 },
      widthRatio: 0.5, thicknessRatio: 0.002, rotation: 90,
    }

    assert.equal(
      findLayerAtPoint(ctx, size, [divider], emptyContext(), { x: 400, y: 650 })?.id,
      divider.id,
      '세로 구분선의 끝부분을 선택할 수 없다',
    )
    assert.equal(
      findLayerAtPoint(ctx, size, [divider], emptyContext(), { x: 550, y: 500 }),
      null,
      '회전 전 가로 경계가 선택 영역으로 남아 있다',
    )
  })

  test('아직 글을 안 쓴 빈 텍스트도 집을 수 있다', () => {
    // 회귀 배경: 히트 테스트가 '그리는 목록'을 쓰는 바람에, 방금 얹은 빈 텍스트는
    // 화면에 안 보이는 것을 넘어 클릭조차 되지 않아 옮길 방법이 없었다.
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const empty = {
      id: 'empty', type: 'TEXT', position: { x: 0.5, y: 0.5 },
      binding: 'NONE', text: '', fontSizeRatio: 0.04,
    }
    assert.equal(getDrawableLayers([empty], emptyContext()).length, 0, '빈 텍스트를 그리면 안 된다')
    assert.equal(
      findLayerAtPoint(ctx, size, [empty], emptyContext(), { x: 400, y: 500 })?.id,
      'empty',
      '빈 텍스트가 집히지 않는다',
    )
  })

  test('가리키는 그림이 없는 이미지 레이어는 집히지 않는다', () => {
    // 이쪽은 자리 자체가 없다. 빈 곳을 눌렀는데 보이지도 않는 요소가 잡히면 그게 더 이상하다.
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const image = { id: 'img', type: 'IMAGE', position: { x: 0.5, y: 0.5 }, source: 'PRODUCER_LOGO' }
    assert.equal(findLayerAtPoint(ctx, size, [image], emptyContext(), { x: 400, y: 500 }), null)
  })

  test('아무 요소도 없는 곳은 null 이다', () => {
    const ctx = fakeContext(10)
    const size = { width: 800, height: 1000 }
    const layer = { id: 'a', type: 'TEXT', position: { x: 0.1, y: 0.1 }, binding: 'NONE', text: 'AB', fontSizeRatio: 0.03 }
    assert.equal(findLayerAtPoint(ctx, size, [layer], emptyContext(), { x: 790, y: 990 }), null)
  })
})

describe('카드 크기 확장', () => {
  const classic = () => BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout

  test('늘리지 않은 카드는 예전과 같은 값이다 (기존 템플릿 회귀)', () => {
    // extend 가 붙었다고 기존 템플릿의 렌더가 1px 이라도 달라지면 안 된다.
    const zero = { top: 0, right: 0, bottom: 0, left: 0 }
    assert.deepEqual(frameSizeOf({ ratio: '4:5', extend: zero }, 1000), { width: 800, height: 1000 })
    assert.deepEqual(frameSizeOf({ ratio: '4:5' }, 1000), { width: 800, height: 1000 })
  })

  test('늘린 만큼 캔버스가 커지고, 전체가 상한 안에 들어간다', () => {
    // 4:5 기준 프레임은 짧은 변 = 가로다. 아래로 짧은 변의 0.25 만큼 늘리면 카드는 1:1.5 가 된다.
    const size = frameSizeOf({ ratio: '4:5', extend: { top: 0, right: 0, bottom: 0.25, left: 0 } }, 1000)
    assert.equal(Math.max(size.width, size.height), 1000, '긴 변이 상한을 넘었다')
    assert.equal(size.width, 667)                     // 1 / 1.5 * 1000
    assert.equal(size.height, 1000)
    assert.equal(Math.round(size.base.height), 833)   // 기준 프레임(4:5)의 세로 = 짧은 변 * 1.25
    assert.equal(Math.round(size.base.top), 0)
  })

  test('환산 기준은 기준 프레임 짧은 변이다 — 늘려도 글자·여백이 그대로다', () => {
    // 회귀 배경: 캔버스 짧은 변으로 환산하면 좌우를 넓힐 때 글자까지 같이 커진다.
    const extend = { top: 0, right: 0.2, bottom: 0, left: 0.2 }
    const size = frameSizeOf({ ratio: '4:5', extend }, 1000)
    assert.ok(Math.abs(shortSideOf(size) - size.base.width) < 1,
      '환산 기준이 캔버스를 따라갔다')
    // 늘어난 자리는 배경일 뿐이므로 사진 크기는 확장 전과 같은 비례를 지킨다.
    const grown = photoRectOf(classic(), size)
    const plain = photoRectOf(classic(), frameSizeOf({ ratio: '4:5' }, 1000))
    const scale = size.base.width / 800
    assert.ok(Math.abs(grown.width - plain.width * scale) < 1, '사진 가로가 따로 논다')
    assert.ok(Math.abs(grown.height - plain.height * scale) < 1, '사진 세로가 따로 논다')
  })

  test('사진은 늘어난 자리로 번지지 않고 기준 프레임 안에 남는다', () => {
    const extend = { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 }
    const size = frameSizeOf({ ratio: '4:5', extend }, 1000)
    const rect = photoRectOf(classic(), size)
    assert.ok(rect.left >= size.base.left - 0.5, '사진이 왼쪽 여백을 침범했다')
    assert.ok(rect.top >= size.base.top - 0.5, '사진이 위쪽 여백을 침범했다')
    assert.ok(rect.left + rect.width <= size.base.left + size.base.width + 0.5)
    assert.ok(rect.top + rect.height <= size.base.top + size.base.height + 0.5)
  })

  test('카드를 늘려도 요소는 사진 대비 제자리에 남는다', () => {
    // 회귀 배경: 좌표는 캔버스 대비 비율이라, 아래로 늘리기만 해도 밴드의 글이 위로 딸려 올라간다.
    const layout = classic()
    const frame = { ...layout.frame, extend: { top: 0, right: 0, bottom: 0.3, left: 0 } }
    const layers = reanchorLayersForExtend(layout, frame)

    const before = frameSizeOf(layout.frame, 1000)
    const after = frameSizeOf(frame, 1000)
    const photoBottom = photoRectOf({ ...layout, frame }, after)
    for (const layer of layers) {
      const source = layout.layers.find((l) => l.id === layer.id)
      // 기준 프레임 안에서 잰 거리(짧은 변 대비)가 그대로여야 제자리다.
      const wasY = (source.position.y * before.height) / shortSideOf(before)
      const nowY = (layer.position.y * after.height - after.base.top) / shortSideOf(after)
      assert.ok(Math.abs(wasY - nowY) < 0.002, `${layer.id} 가 카드와 함께 밀렸다`)
      assert.ok(layer.position.y * after.height > photoBottom.top + photoBottom.height,
        `${layer.id} 가 사진 위로 올라갔다`)
    }
  })

  test('저장할 때 늘리지 않은 카드는 extend 필드를 남기지 않는다', () => {
    const layout = normalizeLayout(classic())
    assert.equal('extend' in layout.frame, false)

    const grown = normalizeLayout({
      ...classic(),
      frame: { ...classic().frame, extend: { top: 0, right: 0, bottom: 0.2, left: 0 } },
    })
    assert.deepEqual(grown.frame.extend, { top: 0, right: 0, bottom: 0.2, left: 0 })
  })

  test('저장할 때 확장값은 상한 안으로 잘린다', () => {
    const layout = normalizeLayout({
      ...classic(),
      frame: { ...classic().frame, extend: { top: 99, right: -5, bottom: null, left: 0.4 } },
    })
    assert.deepEqual(layout.frame.extend, {
      top: PHOTO_CARD_MAX_EXTEND, right: 0, bottom: 0, left: 0.4,
    })
  })
})

describe('오브젝트 정렬 · 스냅', () => {
  const SIZE = { width: 800, height: 1000 }   // 4:5, 짧은 변 800

  /** 같은 글자수의 텍스트. 크기를 달리 주면 실제 폭이 달라진다. */
  const text = (id, x, fontSizeRatio = 0.04) => ({
    id, type: 'TEXT', position: { x, y: 0.5 },
    binding: 'NONE', text: 'ABCDE', fontSizeRatio,
  })

  test('정렬은 글자 폭이 달라도 실제 경계를 맞춘다', () => {
    // position 은 글의 가운데다. 그대로 대입하면 폭이 다른 글끼리 왼쪽 끝이 어긋난다.
    const ctx = fakeContext(10)
    const layers = [text('a', 0.1), text('b', 0.5, 0.06), text('c', 0.9, 0.03)]
    const moved = alignLayers(ctx, SIZE, layers, emptyContext(), 'left')

    const lefts = layers.map((layer) => {
      const position = moved.get(layer.id) ?? layer.position
      return measureLayerBounds(ctx, SIZE, { ...layer, position }, emptyContext()).left
    })
    // 가장 왼쪽에 있던 a 의 왼쪽 끝(0.1*800 - 폭/2)에 나머지가 붙는다.
    assert.deepEqual(lefts.map((value) => Math.round(value)), [55, 55, 55])
  })

  test('기준선 정렬은 글자 크기가 달라도 밑줄을 한 줄로 맞춘다', () => {
    // 세로 위치는 '시각 중심'이라, 크기가 다르면 중심을 맞춰도 밑줄이 어긋난다.
    const ctx = fakeContext(10)
    const small = text('small', 0.2, 0.03)
    const large = text('large', 0.6, 0.08)
    const moved = alignLayers(ctx, SIZE, [small, large], emptyContext(), 'baseline')

    const baselineOf = (layer) => textBaselineYOf(
      ctx, SIZE, { ...layer, position: moved.get(layer.id) ?? layer.position }, emptyContext(),
    )
    assert.ok(Math.abs(baselineOf(small) - baselineOf(large)) < 0.001)
    // 큰 글자가 기준이다 — 제목에 부제를 맞추는 쪽이 자연스럽다.
    assert.equal(moved.has('large'), false)
  })

  test('가로 분배는 양 끝을 두고 사이 간격을 똑같이 만든다', () => {
    const ctx = fakeContext(10)
    const layers = [text('a', 0.1), text('b', 0.25), text('c', 0.8375)]
    const moved = distributeLayers(ctx, SIZE, layers, emptyContext(), 'x')

    const boxes = layers.map((layer) => measureLayerBounds(
      ctx, SIZE, { ...layer, position: moved.get(layer.id) ?? layer.position }, emptyContext(),
    )).sort((a, b) => a.left - b.left)
    const gaps = boxes.slice(1).map((box, index) => box.left - boxes[index].right)
    assert.ok(Math.abs(gaps[0] - gaps[1]) < 1, `간격이 다르다: ${gaps}`)
    // 양 끝은 움직이지 않는다
    assert.equal(moved.has('a'), false)
    assert.equal(moved.has('c'), false)
  })

  test('두 개 미만이면 정렬할 것이 없다', () => {
    const ctx = fakeContext(10)
    assert.equal(alignLayers(ctx, SIZE, [text('a', 0.1)], emptyContext(), 'left').size, 0)
    assert.equal(distributeLayers(ctx, SIZE, [text('a', 0.1), text('b', 0.5)],
      emptyContext(), 'x').size, 0)
  })

  test('허용 오차 안에서만 자석이 붙는다', () => {
    const targets = [{ axis: 'x', value: 104, kind: 'layer' }]
    const bounds = { left: 100, top: 0, right: 200, bottom: 40 }
    assert.equal(applySnap(bounds, null, targets, 6).dx, 4)
    assert.equal(applySnap(bounds, null, targets, 2).dx, 0)
    assert.equal(applySnap(bounds, null, targets, 2).guides.length, 0)
  })

  test('축마다 가이드는 하나만 나온다 (선이 여러 개 겹쳐 보이지 않게)', () => {
    const targets = [
      { axis: 'x', value: 101, kind: 'layer' },
      { axis: 'x', value: 103, kind: 'frame' },
      { axis: 'y', value: 2, kind: 'frame' },
    ]
    const snap = applySnap({ left: 100, top: 0, right: 200, bottom: 40 }, null, targets, 8)
    assert.equal(snap.guides.filter((guide) => guide.axis === 'x').length, 1)
    assert.equal(snap.dx, 1, '더 가까운 선을 골라야 한다')
    assert.equal(snap.guides.filter((guide) => guide.axis === 'y').length, 1)
  })

  test('밑줄은 밑줄끼리만 붙는다 (남의 상자 모서리에 들러붙지 않게)', () => {
    const targets = [{ axis: 'y', value: 500, kind: 'baseline' }]
    // 상자 경계(top/middle/bottom)는 baseline 선을 무시한다
    assert.equal(applySnap({ left: 0, top: 498, right: 10, bottom: 520 }, null, targets, 6).dy, 0)
    // baseline 앵커는 붙는다
    assert.equal(applySnap({ left: 0, top: 400, right: 10, bottom: 420 }, 497, targets, 6).dy, 3)
  })

  /** 카드·여백·사진 경계가 서로 겹치지 않는 레이아웃(겹치면 중복 제거로 하나만 남는다). */
  const insetLayout = (layers = []) => ({
    schemaVersion: 1,
    frame: {
      ratio: '4:5', backgroundColor: '#ffffff', radius: 0,
      padding: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
      photo: { fit: 'COVER', radius: 0, x: 0.5, y: 0.5, w: 0.6, h: 0.6 },
    },
    layers,
  })

  test('자석 목록에 카드·여백·사진 경계가 들어간다', () => {
    const ctx = fakeContext(10)
    const targets = collectSnapTargets(ctx, SIZE, insetLayout(), emptyContext())
    const kinds = new Set(targets.map((target) => target.kind))
    for (const kind of ['frame', 'padding', 'photo']) {
      assert.ok(kinds.has(kind), `${kind} 기준선이 없다`)
    }
    // 카드 한가운데는 늘 있어야 한다
    assert.ok(targets.some((target) => target.axis === 'x' && target.value === 400))
    // 여백 안쪽(0.05 × 짧은 변 800 = 40)도
    assert.ok(targets.some((target) => target.axis === 'x' && target.value === 40))
  })

  test('같은 자리의 선은 한 번만 담는다', () => {
    // 클래식은 사진 영역이 여백 안쪽과 정확히 같다. 두 번 담으면 화면에 같은 줄이 겹쳐 그려진다.
    const ctx = fakeContext(10)
    const layout = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    const targets = collectSnapTargets(ctx, SIZE, layout, emptyContext())
    const xs = targets.filter((target) => target.axis === 'x').map((target) => target.value)
    assert.equal(new Set(xs).size, xs.length)
  })

  test('끌고 있는 요소는 자기 자신에게 붙지 않는다', () => {
    const ctx = fakeContext(10)
    // 두 텍스트의 경계가 서로 겹치지 않게 떨어뜨린다 — 겹치면 제외해도 같은 값이 남아 확인이 안 된다.
    const moving = text('moving', 0.1)
    const layout = insetLayout([moving, text('other', 0.7)])
    const own = measureLayerBounds(ctx, SIZE, moving, emptyContext())

    const withMoving = collectSnapTargets(ctx, SIZE, layout, emptyContext())
    const without = collectSnapTargets(ctx, SIZE, layout, emptyContext(), [moving.id])
    const hasOwnLeft = (targets) => targets.some(
      (target) => target.axis === 'x' && Math.abs(target.value - own.left) < 0.5,
    )
    assert.ok(hasOwnLeft(withMoving), '테스트 전제: 제외하지 않으면 자기 경계가 있어야 한다')
    assert.ok(!hasOwnLeft(without), '자기 경계가 자석 목록에 남아 있다')
  })
})

describe('사진 확대 · 이동', () => {
  const SIZE = { width: 800, height: 1000 }
  // 여백 없이 액자를 꽉 채우는 레이아웃 — 계산을 눈으로 따라갈 수 있게 단순하게 둔다.
  const layout = {
    schemaVersion: 1,
    frame: {
      ratio: '4:5', backgroundColor: '#ffffff', radius: 0,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      photo: { fit: 'COVER', radius: 0, x: 0.5, y: 0.5, w: 1, h: 1 },
    },
    layers: [],
  }
  const square = { width: 1000, height: 1000 }

  const covers = (placement) => placement.left <= 0.001 && placement.top <= 0.001
    && placement.left + placement.width >= SIZE.width - 0.001
    && placement.top + placement.height >= SIZE.height - 0.001

  test('확대하지 않아도 COVER 는 액자를 덮는다', () => {
    const placement = photoPlacementOf(layout, SIZE, square)
    assert.ok(covers(placement))
    assert.equal(Math.round(placement.slackX), 100)   // (1000-800)/2
    assert.equal(Math.round(placement.slackY), 0)     // 세로는 딱 맞는다
  })

  test('끝까지 밀어도 빈 틈이 생기지 않는다', () => {
    for (const offsetX of [-1, -0.5, 0, 0.5, 1]) {
      const placement = photoPlacementOf(layout, SIZE, square, { scale: 2, offsetX, offsetY: 0 })
      assert.ok(covers(placement), `offsetX=${offsetX} 에서 액자에 빈 틈이 생겼다`)
    }
    // offsetX = 1 이면 사진 왼쪽 끝이 액자 왼쪽에 딱 붙는다
    assert.equal(
      Math.round(photoPlacementOf(layout, SIZE, square, { scale: 2, offsetX: 1, offsetY: 0 }).left), 0,
    )
  })

  test('범위를 넘는 offset 은 잘라 낸다', () => {
    assert.deepEqual(
      photoPlacementOf(layout, SIZE, square, { scale: 2, offsetX: 5, offsetY: -5 }),
      photoPlacementOf(layout, SIZE, square, { scale: 2, offsetX: 1, offsetY: -1 }),
    )
  })

  test('확대하면 밀 수 있는 여유가 늘어난다', () => {
    const one = photoPlacementOf(layout, SIZE, square, { scale: 1, offsetX: 0, offsetY: 0 })
    const two = photoPlacementOf(layout, SIZE, square, { scale: 2, offsetX: 0, offsetY: 0 })
    assert.ok(two.slackX > one.slackX)
    assert.ok(two.slackY > one.slackY)
    assert.equal(Math.round(two.width), Math.round(one.width * 2))
  })

  test('전체 보기에서는 액자가 아니라 사진에 맞춰 잘라 낸다', () => {
    // 회귀 배경: 액자를 기준으로 모서리를 깎으면 '전체 보기'처럼 사진이 액자보다 작을 때
    // 빈 여백만 둥글게 깎이고 사진 모서리는 각진 채 남아 사선으로 깎인 것처럼 보였다.
    const contain = {
      ...layout,
      frame: { ...layout.frame, photo: { ...layout.frame.photo, fit: 'CONTAIN' } },
    }
    const ctx = fakeContext(10)
    drawPhoto(ctx, contain, SIZE, square)
    const clip = ctx.calls.find((entry) => entry[0] === 'rect')
    const placement = photoPlacementOf(contain, SIZE, square)

    assert.ok(clip, '클립 사각형이 없다')
    assert.deepEqual(clip.slice(1).map(Math.round),
      [placement.left, placement.top, placement.width, placement.height].map(Math.round))
    // 1:1 사진이 4:5 액자에 들어가면 위아래가 남는다 = 액자보다 낮아야 한다
    assert.ok(Math.round(placement.height) < SIZE.height, '전체 보기인데 사진이 액자를 꽉 채웠다')
  })

  test('채우기에서는 액자 밖으로 넘치는 부분을 잘라 낸다', () => {
    const ctx = fakeContext(10)
    drawPhoto(ctx, layout, SIZE, square)
    const clip = ctx.calls.find((entry) => entry[0] === 'rect')
    // 넘치는 쪽은 액자에서 끊기고, 모자라는 쪽은 없다 = 액자와 같다
    assert.deepEqual(clip.slice(1).map(Math.round), [0, 0, SIZE.width, SIZE.height])
  })

  test('drawPhoto 가 계산된 자리에 그대로 그린다', () => {
    // 미리보기와 출력이 같은 함수를 쓰므로, 여기가 맞으면 저장 결과도 맞는다.
    const ctx = fakeContext(10)
    const transform = { scale: 1.5, offsetX: 0.4, offsetY: -0.2 }
    drawPhoto(ctx, layout, SIZE, square, transform)
    const call = ctx.calls.find((entry) => entry[0] === 'drawImage')
    const placement = photoPlacementOf(layout, SIZE, square, transform)
    assert.deepEqual(call.slice(2).map(Math.round), [
      placement.left, placement.top, placement.width, placement.height,
    ].map(Math.round))
  })
})

describe('비회원 저장본 · 임시저장', () => {
  test('워터마크는 어느 비율에서든 오른쪽 아래 같은 여백에 앉는다', () => {
    for (const ratio of ['1:1', '4:5', '9:16', '16:9']) {
      const size = frameSizeOf({ ratio }, 2048)
      const short = shortSideOf(size)
      const rect = watermarkRectOf(size)
      assert.equal(Math.round(rect.width), Math.round(short * WATERMARK_WIDTH_RATIO), ratio)
      assert.equal(
        Math.round(size.width - (rect.left + rect.width)),
        Math.round(short * WATERMARK_MARGIN_RATIO),
        `${ratio}: 오른쪽 여백`,
      )
      assert.equal(
        Math.round(size.height - (rect.top + rect.height)),
        Math.round(short * WATERMARK_MARGIN_RATIO),
        `${ratio}: 아래쪽 여백`,
      )
    }
  })

  test('마크는 반투명으로 얹고, 뒤에 그리는 것에 투명도를 흘리지 않는다', () => {
    const drawn = []
    const ctx = {
      globalAlpha: 1,
      drawImage(...args) { drawn.push({ alpha: this.globalAlpha, args }) },
    }
    const size = frameSizeOf({ ratio: '4:5' }, 1000)
    drawWatermark(ctx, size, { width: 512, height: 512 })

    assert.equal(drawn.length, 1)
    assert.equal(drawn[0].alpha, WATERMARK_OPACITY, '반투명으로 그려야 한다')
    assert.equal(ctx.globalAlpha, 1, '그린 뒤에는 투명도를 되돌려야 한다')
  })

  test('세로로 긴 마크도 오른쪽 아래 끝이 맞는다', () => {
    // 마크 그림의 비율은 바뀔 수 있다. 높이가 커져도 아래·오른쪽 끝은 그대로여야 한다.
    const size = frameSizeOf({ ratio: '4:5' }, 1000)
    const square = watermarkRectOf(size, 1)
    const tall = watermarkRectOf(size, 2)
    assert.equal(tall.height, tall.width * 2)
    assert.equal(square.left, tall.left)
    assert.equal(Math.round(square.top + square.height), Math.round(tall.top + tall.height))
  })

  test('임시저장은 저장 규칙으로 정리한 레이아웃과 직접 입력값을 함께 담는다', () => {
    const photo = { name: 'shot.jpg' }   // File 대역 — Node 에는 File 이 없다
    const draft = buildPhotoCardDraft({
      layout: {
        schemaVersion: 99,
        frame: { ratio: '4:5', backgroundColor: '#ffffff', radius: 0,
          padding: { top: 0, right: 0, bottom: 0.2, left: 0 },
          photo: { fit: 'COVER', radius: 0, x: 0.5, y: 0.5, w: 1, h: 1 } },
        layers: [{ id: 'a', type: 'TEXT', position: { x: 5, y: 0.5 }, binding: 'NONE', text: 'hi' }],
      },
      photoTransform: { scale: 1.5, offsetX: 0.2, offsetY: 0 },
      exif: null,
      spirit: null,
      userInput: { place: '이태원', memo: '한 잔', date: '' },
      photoFile: photo,
    })

    assert.equal(draft.layout.schemaVersion, PHOTO_CARD_SCHEMA_VERSION, '스키마 버전을 서버 값으로 맞춘다')
    assert.equal(draft.layout.layers[0].position.x, 1, '범위를 벗어난 좌표는 잘라 낸다')
    assert.equal(draft.photo, photo, '원본 사진이 있어야 이어서 편집할 수 있다')
    assert.equal(draft.photoName, 'shot.jpg')
    assert.deepEqual(draft.user, { place: '이태원', memo: '한 잔', date: '' })
    assert.equal(draft.photoTransform.scale, 1.5)
    assert.ok(draft.savedAt > 0)
  })

  test('사진을 아직 안 골랐어도 임시저장은 만들어진다', () => {
    const draft = buildPhotoCardDraft({
      layout: defaultPhotoCardLayout(),
      photoTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      exif: null,
      spirit: null,
      userInput: { place: '', memo: '', date: '' },
      photoFile: null,
    })
    assert.equal(draft.photo, null)
    assert.equal(draft.photoName, null)
  })

  test('서버 임시저장을 되살려도 촬영 시각은 Date 로 돌아온다', () => {
    // JSON 에는 Date 가 없다. 문자열인 채로 편집기에 얹히면 촬영일을 넣은 카드가
    // 되살아나는 순간 그리기가 터져 편집기 전체가 에러 화면으로 바뀐다.
    const exif = {
      cameraMake: 'SONY', cameraModel: 'ILCE-7CM2', lensModel: null,
      aperture: 1.8, shutterSpeed: 0.008, iso: 400, focalLength: 35, focalLength35: 35,
      latitude: null, longitude: null, shotAt: new Date(2026, 7, 7, 22, 22),
    }
    const restored = parseDraftContent(buildDraftContent({
      layout: defaultPhotoCardLayout(),
      photoTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      exif, spirit: null,
      userInput: { place: '', memo: '', date: '' },
      photoFile: null,
    }))

    assert.ok(restored.exif.shotAt instanceof Date, 'JSON 을 거쳐도 Date 여야 한다')
    assert.equal(restored.exif.shotAt.getTime(), exif.shotAt.getTime())
    assert.equal(
      resolveBindingValue('EXIF_SHOT_AT', { ...restored, user: restored.user }),
      formatShotAt(exif.shotAt),
    )
  })

  test('촬영 시각이 문자열로 남아 있어도 그리기는 멈추지 않는다', () => {
    // 되살리는 쪽이 놓쳐도 카드 한 줄이 비는 데서 그쳐야 한다 — 예외는 화면 전체를 날린다.
    const iso = '2026-08-07T13:22:41.000Z'
    const context = {
      exif: { cameraMake: null, cameraModel: null, lensModel: null, shotAt: iso },
      spirit: null, review: null, user: { place: '', memo: '', date: '' },
    }
    assert.equal(resolveBindingValue('EXIF_SHOT_AT', context), formatShotAt(new Date(iso)))
    assert.equal(formatShotAt('알 수 없는 값'), '')
  })
})

describe('i18n 번역', () => {
  const requiredKeys = [
    'title', 'subtitle', 'uploadPhoto', 'uploadHint', 'exifSection', 'spiritSection',
    'templateSection', 'layerSection', 'exportSection', 'noExif', 'searchSpirit',
    'addText', 'addImage', 'addShape', 'removeLayer', 'download', 'publishToGallery',
    // 비회원 흐름 — 워터마크 안내와 임시저장 안내
    'downloadWithMark', 'downloadClean', 'guestMarkHint', 'guestMarkHoverHint', 'guestGateTitle',
    'guestGateCleanDownload', 'guestGatePublish', 'guestGateTemplate', 'guestGateDraftHint',
    'guestGateLogin', 'guestGateSignup', 'draftFoundTitle', 'draftFoundBody', 'draftSavedAt',
    'draftResume', 'draftDiscard', 'draftRestored', 'draftRestoreFailed', 'draftSaveFailed',
    'draftSaving', 'draftRestoring',
    'saveAsTemplate', 'templateOfficial', 'templateMine', 'templatePublic',
    // 문단 정렬(왼쪽·가운데·오른쪽)은 화면에서 뺐다 — 요소끼리 맞추는 alignObjects* 와는 다른 것이다.
    'makePublic', 'makePrivate', 'gpsNotice', 'fontLabel', 'fontSize',
    'textColor', 'outline', 'positionX', 'positionY',
    'place', 'memo', 'dragHint', 'templateLimit', 'builtinClassic', 'builtinPolaroid',
    'builtinMinimal', 'builtinDarkBar', 'builtinStacked',
    // 개편으로 들어온 화면들 — 도구 레일·정렬·사진 확대·여백
    'toolSelect', 'toolTemplate', 'toolPhoto', 'toolText', 'toolElement',
    'toolData', 'toolCard', 'toolLayer', 'toolExport',
    'undo', 'redo', 'zoomFit', 'stageHint',
    'alignObjects', 'alignObjectsLeft', 'alignObjectsBottom', 'alignBaseline',
    'distributeX', 'distributeY', 'selectedCount',
    'photoZoom', 'photoOffsetX', 'photoTransformReset',
    'paddingSection', 'paddingTop', 'paddingBottom', 'paddingHint',
    'backgroundColor', 'letterSpacing', 'lineHeight', 'rotation', 'opacity',
    'addBox', 'addDivider', 'lock', 'unlock', 'duplicate', 'moveUp', 'moveDown',
    // 템플릿을 고른 뒤 요소를 하나씩 채우는 흐름
    'fillTitle', 'fillIntro', 'fillProgress', 'fillPlaceholder', 'fillFromExif',
    'fillFromSpirit', 'fillNoValue', 'fillPrev', 'fillNext', 'fillSkip', 'fillDone',
    'fillClose', 'fillReopen',
    'overwriteTemplate', 'templateOverwriteConfirm', 'templateOverwritten', 'templateOverwriteFailed',
  ]

  for (const language of ['ko', 'en']) {
    test(`${language} 번역 키가 모두 존재한다`, () => {
      const locale = JSON.parse(readFileSync(join(HERE, '..', 'src', 'locales', `${language}.json`), 'utf8'))
      for (const key of requiredKeys) {
        assert.equal(typeof locale.photoCard?.[key], 'string', `${language}: photoCard.${key}`)
        assert.ok(locale.photoCard[key].length > 0, `${language}: photoCard.${key} 가 비어 있음`)
      }
    })
  }
})

describe('템플릿 변경 시 직접 입력값 유지', () => {
  // 회귀 배경: 메모는 폴라로이드에만, 장소는 어느 기본 템플릿에도 자리가 없다.
  // 레이어를 통째로 갈아 끼우면 사용자가 적어 둔 글이 조용히 사라졌다.
  const userContext = (place, memo) => ({
    exif: null, spirit: null, user: { place, memo, date: '' },
  })

  /** applyLayout 이 하는 일과 같은 순서로 실제 구현을 부른다(로직을 옮겨 적지 않는다). */
  const carryOverUserText = (next, context) => {
    const incoming = JSON.parse(JSON.stringify(next))
    const missing = USER_BINDINGS.filter((binding) => {
      if (!resolveBindingValue(binding, context).trim()) return false
      return !incoming.layers.some(
        (l) => l.type === 'TEXT' && l.binding === binding && l.visible !== false,
      )
    })
    const before = incoming.layers.length
    if (missing.length > 0) placeCarriedLayers(incoming, missing)
    incoming.layers.slice(before).forEach((l, i) => { l.id = `carry-${missing[i]}` })
    return incoming
  }

  test('현재 기본 템플릿 중 장소를 쓰는 것은 하나도 없다 (문제의 근거)', () => {
    for (const builtin of BUILTIN_LAYOUTS) {
      const bindings = builtin.layout.layers.map((l) => l.binding)
      assert.ok(!bindings.includes('USER_PLACE'), `${builtin.key} 에 장소 자리가 생겼다`)
    }
  })

  test('메모를 쓴 채 폴라로이드 → 클래식으로 바꿔도 메모가 남는다', () => {
    const context = userContext('', '오늘의 한 잔')
    const classic = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    const applied = carryOverUserText(classic, context)
    const drawn = getDrawableLayers(applied.layers, context)
    assert.ok(drawn.some((l) => resolveLayerText(l, context) === '오늘의 한 잔'),
      '템플릿을 바꾸자 메모가 사라졌다')
  })

  test('장소·메모 둘 다 쓰면 둘 다 남고 서로 겹치지 않는다', () => {
    const context = userContext('이태원 Bar Cham', '오늘의 한 잔')
    for (const builtin of BUILTIN_LAYOUTS) {
      const applied = carryOverUserText(builtin.layout, context)
      const drawn = getDrawableLayers(applied.layers, context)
      const values = drawn.map((l) => resolveLayerText(l, context))
      assert.ok(values.includes('이태원 Bar Cham'), `${builtin.key}: 장소 누락`)
      assert.ok(values.includes('오늘의 한 잔'), `${builtin.key}: 메모 누락`)

      const carried = applied.layers.filter((l) => String(l.id).startsWith('carry-'))
      // 크기는 '짧은 변' 기준, y 는 '높이' 기준이라 겹침·잘림을 보려면 환산해야 한다.
      const value = { '1:1': 1, '4:5': 0.8, '3:4': 0.75, '9:16': 0.5625, '16:9': 16 / 9 }[applied.frame.ratio]
      const lineHeight = (l) => (l.fontSizeRatio ?? 0.026) * (value <= 1 ? value : 1)

      const sorted = carried.slice().sort((a, b) => a.position.y - b.position.y)
      sorted.forEach((l, i) => {
        assert.ok(l.position.y + lineHeight(l) / 2 <= 1, `${builtin.key}: 글자 아래끝이 카드 밖으로 나갔다`)
        if (i === 0) return
        const gap = l.position.y - sorted[i - 1].position.y
        assert.ok(gap >= lineHeight(l), `${builtin.key}: 새로 얹은 줄이 서로 겹친다 (간격 ${gap.toFixed(3)})`)
      })
    }
  })

  test('이미 자리가 있는 템플릿에는 중복으로 얹지 않는다', () => {
    const context = userContext('', '오늘의 한 잔')
    const polaroid = BUILTIN_LAYOUTS.find((b) => b.key === 'polaroid').layout
    const applied = carryOverUserText(polaroid, context)
    const memoLayers = applied.layers.filter((l) => l.binding === 'USER_MEMO')
    assert.equal(memoLayers.length, 1)
  })

  test('빈 값은 얹지 않는다 (빈 줄만 생기는 것을 막는다)', () => {
    const context = userContext('', '')
    const classic = BUILTIN_LAYOUTS.find((b) => b.key === 'classic').layout
    const applied = carryOverUserText(classic, context)
    assert.equal(applied.layers.length, classic.layers.length)
  })

  test('어두운 템플릿에서는 밝은 글자색을 물려받는다 (검은 배경에 묻히지 않게)', () => {
    const context = userContext('이태원 Bar Cham', '')
    const darkBar = BUILTIN_LAYOUTS.find((b) => b.key === 'darkBar').layout
    const applied = carryOverUserText(darkBar, context)
    const carried = applied.layers.find((l) => l.binding === 'USER_PLACE')
    const donorColors = darkBar.layers.filter((l) => l.type === 'TEXT').map((l) => l.color)
    assert.ok(donorColors.includes(carried.color), '새 템플릿의 글자색을 따르지 않았다')
    assert.notEqual(carried.color, '#111111')
  })
})
