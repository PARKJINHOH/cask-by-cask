/**
 * exifr 의 dist 서브패스에는 타입 선언이 없다.
 * lite 빌드만 쓰므로(포토카드 페이지에서 동적 import) 필요한 만큼만 선언한다.
 * 전체 빌드(full)는 GPS 파서까지 포함하므로 의도적으로 쓰지 않는다.
 */
declare module 'exifr/dist/lite.esm.mjs' {
  interface ExifrParseOptions {
    /** 읽을 태그 화이트리스트 — 여기 없는 값(특히 GPS)은 파싱하지 않는다. */
    pick?: string[]
    [key: string]: unknown
  }
  export function parse(
    input: File | Blob | ArrayBuffer | Uint8Array | string,
    options?: ExifrParseOptions,
  ): Promise<Record<string, unknown> | undefined>
  const exifr: { parse: typeof parse }
  export default exifr
}
