/**
 * node --test 에서 `@/...` 경로 별칭과 확장자 없는 TS import 를 해석하는 훅.
 *
 * Node 24 는 `.ts` 를 직접 실행할 수 있지만(타입 스트리핑) tsconfig 의 path alias 와
 * 확장자 생략은 모르기 때문에, src 아래 모듈을 테스트하려면 이 훅이 필요하다.
 *
 * 사용법: node --import ./scripts/test-alias-register.mjs --test scripts/xxx.test.mjs
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const SRC_URL = `${pathToFileURL(SRC_DIR).href}/`

/** 확장자가 없으면 .ts / .tsx / /index.ts 순으로 실제 파일을 찾아 붙인다 */
function withExtension(url) {
  if (/\.[a-z]+$/i.test(url)) return url
  for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const candidate = url + suffix
    if (existsSync(fileURLToPath(candidate))) return candidate
  }
  return url
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    return nextResolve(withExtension(SRC_URL + specifier.slice(2)), context)
  }
  // 상대 경로도 확장자 생략을 허용한다 (src 내부 모듈끼리의 import)
  if (specifier.startsWith('.') && context.parentURL?.startsWith(SRC_URL)) {
    return nextResolve(withExtension(new URL(specifier, context.parentURL).href), context)
  }
  return nextResolve(specifier, context)
}
