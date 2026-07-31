/** test-alias-hooks.mjs 를 모듈 해석 훅으로 등록한다 (node --import 로 사용) */
import { register } from 'node:module'

register('./test-alias-hooks.mjs', import.meta.url)
