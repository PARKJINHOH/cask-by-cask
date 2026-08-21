/**
 * 관리자 에디션 이름 변경 시 기존 DB 행의 ID가 수정 API까지 보존되는지 확인한다.
 * 이 연결이 끊기면 서버가 이름 변경을 삭제+신규 등록으로 오인해 기존 리뷰가 사라진다.
 *
 * 실행: npm run test:variant-identity
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const WEB_SRC = join(HERE, '..', 'src')
const API_SRC = join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'java', 'com',
  'caskbycask', 'domain', 'spirit')

test('관리자 폼이 기존 에디션 ID를 상태와 수정 페이로드에 유지한다', () => {
  const types = readFileSync(join(WEB_SRC, 'domain', 'admin', 'types', 'admin.types.ts'), 'utf8')
  const form = readFileSync(join(WEB_SRC, 'domain', 'admin', 'components', 'SpiritFormFields.tsx'), 'utf8')

  assert.match(types, /interface CreateVariantRequest\s*{[\s\S]*?id\?: number \| null/)
  assert.match(form, /\(s\.variants \?\? \[\]\)\.map\(\(v\) => \(\{\s*id: v\.id,/)
  assert.match(form, /variantsToSubmit\.map\(v => \(\{\s*\.\.\.v,/)
})

test('서버가 이름보다 기존 에디션 ID를 우선해 같은 행을 수정한다', () => {
  const dto = readFileSync(join(API_SRC, 'dto', 'CreateVariantRequest.java'), 'utf8')
  const service = readFileSync(join(API_SRC, 'service', 'SpiritService.java'), 'utf8')

  assert.match(dto, /Long id,\s*[\s\S]*?VariantType variantType,/)
  assert.match(service, /if \(vReq\.id\(\) != null\)[\s\S]*?vReq\.id\(\)\.equals\(v\.getId\(\)\)/)
})
