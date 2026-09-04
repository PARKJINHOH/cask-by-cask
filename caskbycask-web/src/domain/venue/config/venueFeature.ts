/**
 * 장소 기능 노출 플래그.
 *
 * 서버의 `venue.enabled` 와 짝을 이룬다 — 서버가 꺼져 있으면 API 가 404 이고,
 * 여기가 꺼져 있으면 진입점(GNB·주류 상세 섹션·리뷰 폼의 장소 선택)이 숨는다.
 *
 * 라우트 자체는 항상 등록해 둔다. 출시 전에 주소로 직접 열어 QA 할 수 있어야 하고,
 * 그때 API 가 404 면 페이지가 알아서 404 로 떨어진다(= 출시 전의 올바른 동작).
 *
 * Next 는 빌드 시점에 `process.env.NEXT_PUBLIC_*` 를 리터럴로 치환하므로
 * 반드시 전체 표현식을 그대로 써야 한다(구조 분해하면 치환되지 않는다).
 */
export const VENUE_FEATURE_ENABLED = process.env.NEXT_PUBLIC_VENUE_ENABLED === 'true'
