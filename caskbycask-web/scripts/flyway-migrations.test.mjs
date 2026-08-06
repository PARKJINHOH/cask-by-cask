import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Flyway 마이그레이션 파일 규칙 검사.
 *
 * 회귀 배경: 브랜치 두 개가 각각 V71 을 만들어 머지된 적이 있다. 컴파일도 테스트도 통과하고
 * 애플리케이션을 올릴 때가 되어서야 "Found more than one migration with version 71" 로 죽는다.
 * 이미 적용한 서버가 있으면 번호를 미는 순간 체크섬이 전부 어긋나 수동 복구가 필요해진다
 * (deploy/db-repair/2026-08-05-photocard-version-shift.sql 참고).
 * 머지 직후 여기서 잡는 게 가장 싸다.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const DIR = join(HERE, '..', '..', 'caskbycask-api', 'src', 'main', 'resources', 'db', 'migration')

const files = readdirSync(DIR).filter((name) => name.endsWith('.sql'))

const parsed = files.map((name) => {
  const match = /^V(\d+)__([a-z0-9_]+)\.sql$/.exec(name)
  return { name, version: match ? Number(match[1]) : null, description: match?.[2] ?? null }
})

describe('Flyway 마이그레이션', () => {
  test('파일명이 V{번호}__{설명}.sql 규칙을 따른다', () => {
    const broken = parsed.filter((file) => file.version === null)
    assert.deepEqual(broken.map((file) => file.name), [],
      '규칙을 벗어난 파일은 Flyway 가 아예 인식하지 못하거나 순서가 뒤바뀐다')
  })

  test('버전 번호가 중복되지 않는다', () => {
    const byVersion = new Map()
    for (const file of parsed) {
      const list = byVersion.get(file.version) ?? []
      list.push(file.name)
      byVersion.set(file.version, list)
    }
    const duplicates = [...byVersion.entries()].filter(([, names]) => names.length > 1)
    assert.deepEqual(duplicates, [],
      '같은 번호가 둘이면 부팅이 실패한다. 나중에 만든 쪽의 번호를 올릴 것 '
      + '(단, 이미 서버에 적용된 번호는 바꾸지 말고 새 번호를 받을 것)')
  })

  test('설명이 중복되지 않는다', () => {
    // 같은 설명이 두 번 나오면 이력 표에서 어느 것이 무엇인지 구분되지 않는다.
    const seen = new Map()
    const duplicates = []
    for (const file of parsed) {
      if (seen.has(file.description)) duplicates.push(`${seen.get(file.description)} / ${file.name}`)
      else seen.set(file.description, file.name)
    }
    assert.deepEqual(duplicates, [])
  })

  test('버전이 1부터 빠짐없이 이어진다', () => {
    // 중간이 비면 나중에 그 번호를 쓴 파일이 들어왔을 때 out-of-order 문제가 된다.
    const versions = parsed.map((file) => file.version).sort((a, b) => a - b)
    const gaps = []
    for (let i = 1; i < versions.length; i += 1) {
      if (versions[i] !== versions[i - 1] + 1) gaps.push(`V${versions[i - 1]} → V${versions[i]}`)
    }
    assert.equal(versions[0], 1, '첫 마이그레이션은 V1 이어야 한다')
    assert.deepEqual(gaps, [], '빠진 번호가 있다')
  })
})
