/**
 * 내보낸 이미지에 메타데이터(태그)를 심는다.
 *
 * 왜 직접 바이트를 다루는가
 *   Canvas 의 toBlob 은 픽셀만 담은 파일을 만든다. EXIF·XMP 같은 메타데이터가 전혀 없어서
 *   윈도우 탐색기의 '태그', 맥 미리보기의 키워드, 사진 관리 프로그램의 검색에 아무것도 잡히지 않는다.
 *   외부 라이브러리(piexifjs 등)를 붙일 만큼 복잡한 일이 아니라 필요한 세그먼트만 직접 끼워 넣는다.
 *
 * 무엇을 쓰는가
 *   XMP 의 `dc:subject` — 윈도우 탐색기가 '태그'로 읽는 표준 필드다. IPTC Keywords 와도 대응된다.
 *   JPEG 는 APP1 세그먼트로, PNG 는 iTXt 청크로 같은 XMP 패킷을 넣는다.
 *   PNG 는 탐색기가 XMP 를 잘 읽지 않으므로 tEXt(Keywords) 도 함께 넣어 호환 범위를 넓힌다.
 *
 * 실패해도 원본을 그대로 돌려준다 — 태그 때문에 다운로드가 막히면 안 된다.
 */

export interface ImageMetadata {
  /** 윈도우 '태그' / IPTC 키워드 */
  keywords: string[]
  /** 제작 도구 */
  creatorTool?: string
  /** 이미지 설명 */
  description?: string
}

export const CASKBYCASK_TAG = 'CaskByCask'

const XMP_NAMESPACE = 'http://ns.adobe.com/xap/1.0/'
const PNG_XMP_KEYWORD = 'XML:com.adobe.xmp'

const escapeXml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/** XMP 패킷 — dc:subject 가 '태그'로 읽히는 자리다. */
export const buildXmpPacket = (metadata: ImageMetadata): string => {
  const keywords = metadata.keywords
    .map((keyword) => `<rdf:li>${escapeXml(keyword)}</rdf:li>`)
    .join('')
  const creatorTool = metadata.creatorTool
    ? `<xmp:CreatorTool>${escapeXml(metadata.creatorTool)}</xmp:CreatorTool>`
    : ''
  const description = metadata.description
    ? `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapeXml(metadata.description)}</rdf:li></rdf:Alt></dc:description>`
    : ''

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>`
    + `<x:xmpmeta xmlns:x="adobe:ns:meta/">`
    + `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">`
    + `<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/">`
    + `<dc:subject><rdf:Bag>${keywords}</rdf:Bag></dc:subject>`
    + description
    + creatorTool
    + `</rdf:Description></rdf:RDF></x:xmpmeta>`
    + `<?xpacket end="w"?>`
}

// ── JPEG ────────────────────────────────────────────────────

/**
 * JPEG 에 XMP APP1 세그먼트를 끼워 넣는다.
 * SOI(FFD8) 바로 뒤에 넣는다 — JFIF/EXIF 앞이어도 규격상 문제가 없고 위치 계산이 단순하다.
 */
const injectJpeg = (bytes: Uint8Array, xmp: string): Uint8Array | null => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null

  const header = new TextEncoder().encode(`${XMP_NAMESPACE}\0`)
  const payload = new TextEncoder().encode(xmp)
  const segmentLength = header.length + payload.length + 2 // 길이 필드 2바이트 포함
  if (segmentLength > 0xffff) return null // 64KB 를 넘으면 확장 XMP 가 필요하다 — 태그만 넣으므로 올 일이 없다

  const segment = new Uint8Array(segmentLength + 2)
  segment[0] = 0xff
  segment[1] = 0xe1 // APP1
  segment[2] = (segmentLength >> 8) & 0xff
  segment[3] = segmentLength & 0xff
  segment.set(header, 4)
  segment.set(payload, 4 + header.length)

  const out = new Uint8Array(bytes.length + segment.length)
  out.set(bytes.subarray(0, 2), 0)          // SOI
  out.set(segment, 2)
  out.set(bytes.subarray(2), 2 + segment.length)
  return out
}

// ── PNG ─────────────────────────────────────────────────────

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

let crcTable: Uint32Array | null = null
const crc32 = (bytes: Uint8Array): number => {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let i = 0; i < 256; i += 1) {
      let value = i
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
      }
      crcTable[i] = value >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const pngChunk = (type: string, data: Uint8Array): Uint8Array => {
  const typeBytes = new TextEncoder().encode(type)
  const body = new Uint8Array(typeBytes.length + data.length)
  body.set(typeBytes, 0)
  body.set(data, typeBytes.length)

  const chunk = new Uint8Array(body.length + 8)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, data.length)
  chunk.set(body, 4)
  view.setUint32(chunk.length - 4, crc32(body))
  return chunk
}

/** 압축하지 않는 iTXt 청크 (compression flag = 0) */
const itxtChunk = (keyword: string, text: string): Uint8Array => {
  const encoder = new TextEncoder()
  const keywordBytes = encoder.encode(keyword)
  const textBytes = encoder.encode(text)
  // keyword \0 compressionFlag compressionMethod languageTag \0 translatedKeyword \0 text
  const data = new Uint8Array(keywordBytes.length + 5 + textBytes.length)
  let offset = 0
  data.set(keywordBytes, offset); offset += keywordBytes.length
  data[offset] = 0; offset += 1  // keyword 종료
  data[offset] = 0; offset += 1  // 압축 안 함
  data[offset] = 0; offset += 1  // 압축 방식
  data[offset] = 0; offset += 1  // languageTag 없음
  data[offset] = 0; offset += 1  // translatedKeyword 없음
  data.set(textBytes, offset)
  return pngChunk('iTXt', data)
}

/** Latin-1 만 담을 수 있는 tEXt — 탐색기·구형 뷰어 호환용 */
const textChunk = (keyword: string, text: string): Uint8Array => {
  const latin1 = (value: string) => Uint8Array.from(
    [...value].map((char) => {
      const code = char.charCodeAt(0)
      return code <= 0xff ? code : 0x3f // '?'
    }),
  )
  const keywordBytes = latin1(keyword)
  const textBytes = latin1(text)
  const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length)
  data.set(keywordBytes, 0)
  data[keywordBytes.length] = 0
  data.set(textBytes, keywordBytes.length + 1)
  return pngChunk('tEXt', data)
}

/**
 * PNG 의 IHDR 뒤에 메타데이터 청크를 끼워 넣는다.
 * IHDR 는 항상 첫 청크이므로 그 뒤가 규격상 안전한 자리다.
 */
const injectPng = (bytes: Uint8Array, xmp: string, metadata: ImageMetadata): Uint8Array | null => {
  if (bytes.length < 8) return null
  for (let i = 0; i < 8; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null
  }
  // 시그니처(8) + IHDR 길이(4) + 타입(4) + 데이터(13) + CRC(4)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ihdrLength = view.getUint32(8)
  const insertAt = 8 + 4 + 4 + ihdrLength + 4
  if (insertAt > bytes.length) return null

  const chunks = [
    itxtChunk(PNG_XMP_KEYWORD, xmp),
    textChunk('Keywords', metadata.keywords.join('; ')),
  ]
  if (metadata.creatorTool) chunks.push(textChunk('Software', metadata.creatorTool))
  if (metadata.description) chunks.push(textChunk('Description', metadata.description))

  const extraLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(bytes.length + extraLength)
  out.set(bytes.subarray(0, insertAt), 0)
  let offset = insertAt
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  out.set(bytes.subarray(insertAt), offset)
  return out
}

// ── 공개 API ────────────────────────────────────────────────

/**
 * Blob 에 메타데이터를 심어 새 Blob 을 돌려준다.
 * 포맷을 알아보지 못하거나 구조가 예상과 다르면 원본을 그대로 돌려준다.
 */
export const withImageMetadata = async (
  blob: Blob,
  metadata: ImageMetadata,
): Promise<Blob> => {
  if (metadata.keywords.length === 0) return blob
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const xmp = buildXmpPacket(metadata)
    const injected = blob.type === 'image/png'
      ? injectPng(bytes, xmp, metadata)
      : injectJpeg(bytes, xmp)
    if (!injected) return blob
    // Uint8Array 를 그대로 넘기면 SharedArrayBuffer 가능성 때문에 타입이 맞지 않는다.
    return new Blob([injected.buffer.slice(0) as ArrayBuffer], { type: blob.type })
  } catch {
    // 메타데이터를 못 넣는다고 다운로드를 막을 이유는 없다.
    return blob
  }
}

/** 테스트에서 쓰는 내부 구현 (브라우저 API 없이 검증하기 위해 노출한다) */
export const __internal = { injectJpeg, injectPng, crc32, pngChunk }
