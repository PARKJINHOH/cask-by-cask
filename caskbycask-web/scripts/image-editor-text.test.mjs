import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const {
  TEXT_FONT_OPTIONS,
  clampTextPosition,
  createDefaultTextStyle,
  drawText,
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
  test('self-host Pretendard 굵기만 제공한다', () => {
    assert.deepEqual(TEXT_FONT_OPTIONS.map((font) => font.weight), [400, 600, 700, 900])
    for (const font of TEXT_FONT_OPTIONS) {
      assert.match(font.family, /Pretendard Variable/)
      assert.match(font.labelKey, /^imageEditor\.fontPretendard/)
    }
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

  test('Windows 줄바꿈을 여러 줄로 정규화한다', () => {
    assert.deepEqual(getTextLines('첫 줄\r\n둘째 줄'), ['첫 줄', '둘째 줄'])
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
    })
  }
})
