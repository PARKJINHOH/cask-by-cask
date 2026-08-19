import { strict as assert } from 'node:assert'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('./numberInput.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { sanitizeNumberInput } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

test('앞자리 0 을 걷어낸다', () => {
  assert.equal(sanitizeNumberInput('01'), '1')
  assert.equal(sanitizeNumberInput('007'), '7')
  assert.equal(sanitizeNumberInput('0900'), '900')
  assert.equal(sanitizeNumberInput('00'), '0')
})

test('값으로서의 0 과 소수의 0 은 남긴다', () => {
  assert.equal(sanitizeNumberInput('0'), '0')
  assert.equal(sanitizeNumberInput('0.5'), '0.5')
  assert.equal(sanitizeNumberInput('0.'), '0.')
  assert.equal(sanitizeNumberInput('00.5'), '0.5')
})

test('숫자가 아닌 글자를 버린다', () => {
  assert.equal(sanitizeNumberInput('1e5'), '15')
  assert.equal(sanitizeNumberInput('12abc'), '12')
  assert.equal(sanitizeNumberInput('+3'), '3')
  assert.equal(sanitizeNumberInput('1,234'), '1234')
})

test('소수점은 하나만 남긴다', () => {
  assert.equal(sanitizeNumberInput('1.2.3'), '1.23')
  assert.equal(sanitizeNumberInput('12.5', { decimal: false }), '125')
})

test('음수는 허용할 때만 부호를 남긴다', () => {
  assert.equal(sanitizeNumberInput('-5'), '5')
  assert.equal(sanitizeNumberInput('-5', { negative: true }), '-5')
  assert.equal(sanitizeNumberInput('-05', { negative: true }), '-5')
})

test('빈 값과 입력 도중 상태를 그대로 둔다', () => {
  assert.equal(sanitizeNumberInput(''), '')
  assert.equal(sanitizeNumberInput('.5'), '.5')
})
