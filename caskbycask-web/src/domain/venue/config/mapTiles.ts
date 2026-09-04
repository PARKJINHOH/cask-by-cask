// 지도 타일 소스 — 벤더를 바꿀 때 손대는 유일한 파일.
//
// 왜 벡터 타일인가: 독도·동해를 한/영 양쪽으로 올바르게 표기해야 하는데, 래스터 타일은
// 라벨이 PNG 에 구워져 있어 물리적으로 덮어쓸 수 없다. 벡터 타일 + 자체 스타일이어야
// 라벨 필드(name:ko / name:en)를 고르고 오버라이드 레이어를 얹을 수 있다.
//
// 기본값 OpenFreeMap: API 키 없음, 사용량 제한 없음, 상업용 무료, 귀속 표기만 필요.
// 다만 기부로 운영되어 SLA 가 없다 — 그래서 지도는 progressive enhancement 로 다룬다.
// 타일이 안 떠도 목록·주소·전화·지도앱 링크는 그대로 동작해야 한다.
//
// 자체 호스팅(Protomaps .pmtiles)으로 옮길 때는 이 값만 바꾸면 되지만,
// 그건 "설정 한 줄"이 아니라 배포 작업이다 — 수백 MB 파일을 HTTP Range 로 서빙해야 하고
// Cloudflare 무료 플랜의 기본 캐시 확장자에 .pmtiles 가 없다. 그리고 Protomaps 자체
// basemap 은 스키마가 달라 geoLabelOverrides 의 source-layer 매칭도 함께 손봐야 한다.

/**
 * 자체 호스팅하는 MapLibre 워커의 버전.
 *
 * maplibre-gl 6 은 ESM 워커를 `new URL('./maplibre-gl-worker.mjs', import.meta.url)` 로 만드는데
 * Next 번들러가 그 파일을 산출물에 내보내지 않는다. 그러면 워커 요청이 dev 서버의 HTML 404 로
 * 떨어져 브라우저가 MIME 오류로 거부하고, 지도는 스타일·스프라이트까지 받아 놓고도
 * 타일만 영원히 안 그려진다. 그래서 워커를 public/ 에 두고 setWorkerUrl() 로 직접 가리킨다.
 *
 * 이 값은 `npm run map:sync-worker` 가 복사한 폴더 이름과 반드시 같아야 한다 —
 * scripts/maplibre-worker.test.mjs 가 어긋남을 잡는다.
 */
export const MAPLIBRE_VERSION = '6.6.0'

/** 자체 호스팅 워커 경로. same-origin 이라 MapLibre 가 blob 우회 없이 그대로 module worker 로 띄운다. */
export const MAP_WORKER_URL = `/maplibre/${MAPLIBRE_VERSION}/maplibre-gl-worker.mjs`

/** MapLibre 스타일 JSON URL. 환경변수로 덮어쓸 수 있다. */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty'

/** 지도 하단 귀속 표기 — OpenStreetMap 데이터(ODbL) 사용 조건이라 지울 수 없다. */
export const MAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer noopener">OpenFreeMap</a> · ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer noopener">© OpenStreetMap</a>'

/**
 * 클러스터 설정.
 *
 * clusterMaxZoom 을 16 까지 올린 것은 한국 상가 건물 때문이다 — 같은 건물 2층·3층에
 * 서로 다른 바가 있으면 좌표가 사실상 겹쳐서 낮은 값에서는 끝까지 안 풀린다.
 * 그래도 안 풀리는 완전 동일 좌표는 클러스터를 눌렀을 때 패널에 그룹 목록을 띄워 해소한다.
 */
export const CLUSTER_OPTIONS = {
  cluster: true,
  clusterRadius: 50,
  clusterMaxZoom: 16,
} as const

/** 지도를 못 그릴 때 쓰는 기본 시야 — 서울 도심. */
export const FALLBACK_CENTER: [number, number] = [126.978, 37.5665]
export const FALLBACK_ZOOM = 11
