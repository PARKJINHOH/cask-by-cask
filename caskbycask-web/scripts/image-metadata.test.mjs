import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const { CASKBYCASK_TAG, buildXmpPacket, __internal } =
  await import('../src/domain/photo-card/utils/imageMetadata.ts')

const { injectJpeg, injectPng, crc32, pngChunk } = __internal
const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder()

/** 최소 JPEG: SOI + APP0(JFIF) + EOI */
const makeJpeg = () => Uint8Array.from([
  0xff, 0xd8,                                     // SOI
  0xff, 0xe0, 0x00, 0x10,                         // APP0, 길이 16
  0x4a, 0x46, 0x49, 0x46, 0x00,                   // "JFIF\0"
  0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xd9,                                     // EOI
])

/** 최소 PNG: 시그니처 + IHDR + IEND */
const makePng = () => {
  const ihdrData = new Uint8Array(13)
  new DataView(ihdrData.buffer).setUint32(0, 1)   // width
  new DataView(ihdrData.buffer).setUint32(4, 1)   // height
  ihdrData[8] = 8                                  // bit depth
  ihdrData[9] = 6                                  // color type RGBA
  const ihdr = pngChunk('IHDR', ihdrData)
  const iend = pngChunk('IEND', new Uint8Array(0))
  const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const out = new Uint8Array(signature.length + ihdr.length + iend.length)
  out.set(signature, 0)
  out.set(ihdr, signature.length)
  out.set(iend, signature.length + ihdr.length)
  return out
}

/** PNG 청크를 순회하며 CRC 를 검증한다 */
const readPngChunks = (bytes) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const chunks = []
  let offset = 8
  while (offset < bytes.length) {
    const length = view.getUint32(offset)
    const type = decoder.decode(bytes.subarray(offset + 4, offset + 8))
    const data = bytes.subarray(offset + 8, offset + 8 + length)
    const stored = view.getUint32(offset + 8 + length)
    const computed = crc32(bytes.subarray(offset + 4, offset + 8 + length))
    chunks.push({ type, data, crcOk: stored === computed })
    offset += 12 + length
  }
  return chunks
}

describe('XMP 패킷', () => {
  test('태그가 dc:subject 로 들어간다 (윈도우 탐색기가 읽는 자리)', () => {
    const xmp = buildXmpPacket({ keywords: [CASKBYCASK_TAG] })
    assert.match(xmp, /<dc:subject><rdf:Bag><rdf:li>CaskByCask<\/rdf:li><\/rdf:Bag><\/dc:subject>/)
    assert.match(xmp, /^<\?xpacket begin=/)
    assert.match(xmp, /<\?xpacket end="w"\?>$/)
  })

  test('여러 태그를 순서대로 담는다', () => {
    const xmp = buildXmpPacket({ keywords: [CASKBYCASK_TAG, '아드벡 우거다일', '아드벡'] })
    const items = [...xmp.matchAll(/<rdf:li>([^<]*)<\/rdf:li>/g)].map((m) => m[1])
    assert.deepEqual(items, ['CaskByCask', '아드벡 우거다일', '아드벡'])
  })

  test('XML 특수문자를 이스케이프한다 (패킷이 깨지면 아무 뷰어도 못 읽는다)', () => {
    const xmp = buildXmpPacket({ keywords: ['A & B <tag> "q"'] })
    assert.match(xmp, /<rdf:li>A &amp; B &lt;tag&gt; &quot;q&quot;<\/rdf:li>/)
  })

  test('제작 도구·설명은 있을 때만 넣는다', () => {
    const bare = buildXmpPacket({ keywords: ['x'] })
    assert.ok(!bare.includes('CreatorTool'))
    assert.ok(!bare.includes('dc:description'))
    const full = buildXmpPacket({ keywords: ['x'], creatorTool: 'CaskByCask', description: '설명' })
    assert.match(full, /<xmp:CreatorTool>CaskByCask<\/xmp:CreatorTool>/)
    assert.match(full, /<rdf:li xml:lang="x-default">설명<\/rdf:li>/)
  })
})

describe('JPEG 메타데이터 삽입', () => {
  const xmp = buildXmpPacket({ keywords: [CASKBYCASK_TAG] })

  test('SOI 를 유지하고 APP1(XMP) 세그먼트를 끼워 넣는다', () => {
    const out = injectJpeg(makeJpeg(), xmp)
    assert.ok(out)
    assert.equal(out[0], 0xff)
    assert.equal(out[1], 0xd8)          // SOI 보존
    assert.equal(out[2], 0xff)
    assert.equal(out[3], 0xe1)          // APP1
  })

  test('세그먼트 길이 필드가 실제 길이와 일치한다', () => {
    const out = injectJpeg(makeJpeg(), xmp)
    const declared = (out[4] << 8) | out[5]
    const namespaceAndPayload = encoder.encode(`http://ns.adobe.com/xap/1.0/\0${xmp}`).length
    assert.equal(declared, namespaceAndPayload + 2)
  })

  test('XMP 네임스페이스와 태그가 바이트에 남는다', () => {
    const out = injectJpeg(makeJpeg(), xmp)
    const text = decoder.decode(out)
    assert.ok(text.includes('http://ns.adobe.com/xap/1.0/'))
    assert.ok(text.includes('CaskByCask'))
  })

  test('원본 세그먼트(JFIF·EOI)를 잃지 않는다', () => {
    const original = makeJpeg()
    const out = injectJpeg(original, xmp)
    assert.ok(decoder.decode(out).includes('JFIF'))
    assert.equal(out[out.length - 2], 0xff)
    assert.equal(out[out.length - 1], 0xd9)   // EOI
  })

  test('JPEG 가 아니면 null 이라 원본이 그대로 나간다', () => {
    assert.equal(injectJpeg(Uint8Array.from([0x00, 0x01, 0x02, 0x03]), xmp), null)
    assert.equal(injectJpeg(new Uint8Array(0), xmp), null)
  })
})

describe('PNG 메타데이터 삽입', () => {
  const metadata = { keywords: [CASKBYCASK_TAG, '아드벡'], creatorTool: 'CaskByCask' }
  const xmp = buildXmpPacket(metadata)

  test('시그니처와 IHDR·IEND 순서를 지킨다', () => {
    const out = injectPng(makePng(), xmp, metadata)
    assert.ok(out)
    const types = readPngChunks(out).map((chunk) => chunk.type)
    assert.equal(types[0], 'IHDR')
    assert.equal(types[types.length - 1], 'IEND')
  })

  test('모든 청크의 CRC 가 유효하다 (깨지면 뷰어가 파일 자체를 거부한다)', () => {
    const out = injectPng(makePng(), xmp, metadata)
    for (const chunk of readPngChunks(out)) {
      assert.ok(chunk.crcOk, `${chunk.type} CRC 불일치`)
    }
  })

  test('XMP(iTXt)와 Keywords(tEXt)를 모두 넣는다', () => {
    const out = injectPng(makePng(), xmp, metadata)
    const chunks = readPngChunks(out)
    const itxt = chunks.find((chunk) => chunk.type === 'iTXt')
    const texts = chunks.filter((chunk) => chunk.type === 'tEXt')
    assert.ok(itxt, 'iTXt 없음')
    assert.ok(decoder.decode(itxt.data).includes('XML:com.adobe.xmp'))
    assert.ok(decoder.decode(itxt.data).includes('CaskByCask'))
    assert.ok(texts.some((chunk) => decoder.decode(chunk.data).startsWith('Keywords\0')),
      'Keywords tEXt 없음')
  })

  test('iTXt 헤더 형식이 규격과 맞는다 (키워드\\0 + 플래그 3바이트 + 언어\\0 + 번역\\0)', () => {
    const out = injectPng(makePng(), xmp, metadata)
    const itxt = readPngChunks(out).find((chunk) => chunk.type === 'iTXt')
    const keywordEnd = itxt.data.indexOf(0)
    assert.equal(decoder.decode(itxt.data.subarray(0, keywordEnd)), 'XML:com.adobe.xmp')
    assert.equal(itxt.data[keywordEnd + 1], 0)  // 압축 안 함
    assert.equal(itxt.data[keywordEnd + 2], 0)  // 압축 방식
    assert.equal(itxt.data[keywordEnd + 3], 0)  // languageTag 없음
    assert.equal(itxt.data[keywordEnd + 4], 0)  // translatedKeyword 없음
  })

  test('PNG 가 아니면 null 이라 원본이 그대로 나간다', () => {
    assert.equal(injectPng(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]), xmp, metadata), null)
    assert.equal(injectPng(new Uint8Array(4), xmp, metadata), null)
  })
})

describe('CRC32', () => {
  test('알려진 값과 일치한다', () => {
    // "IEND" 빈 청크의 CRC 는 PNG 파일마다 동일한 상수다.
    assert.equal(crc32(encoder.encode('IEND')), 0xae426082)
    assert.equal(crc32(encoder.encode('123456789')), 0xcbf43926)
  })
})
