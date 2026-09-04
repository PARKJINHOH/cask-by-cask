-- 주류 장소 도시 카탈로그 초기 시드 (2026-09).
--
-- 국내 + 한국인이 주류를 사거나 마시러 가장 많이 가는 아시아 도시로 시작한다.
-- 도시 추가는 앞으로 관리자 화면에서 하며, 이 마이그레이션은 최초 1회분이다.
--
-- 이미 같은 (country_code, slug) 가 있으면 건너뛴다 — 운영에 수동으로 넣어 둔 행이 있어도 안전하다.
-- center_lat/lng 는 지도 초기 화면 기준점이라 시청·중심가 좌표를 쓴다(가게 분포와 무관하게 고정).
CREATE TEMPORARY TABLE tmp_venue_city_seed (
    country_code CHAR(2),
    slug VARCHAR(60),
    name_ko VARCHAR(80),
    name_en VARCHAR(80),
    center_lat DECIMAL(9,7),
    center_lng DECIMAL(10,7),
    default_zoom DECIMAL(4,2),
    sort_order INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_venue_city_seed
    (country_code, slug, name_ko, name_en, center_lat, center_lng, default_zoom, sort_order)
VALUES
    ('kr', 'seoul',     '서울',   'Seoul',     37.5665000, 126.9780000, 11.00, 10),
    ('kr', 'busan',     '부산',   'Busan',     35.1796000, 129.0756000, 11.00, 20),
    ('kr', 'incheon',   '인천',   'Incheon',   37.4563000, 126.7052000, 11.00, 30),
    ('kr', 'daegu',     '대구',   'Daegu',     35.8714000, 128.6014000, 11.00, 40),
    ('kr', 'daejeon',   '대전',   'Daejeon',   36.3504000, 127.3845000, 11.00, 50),
    ('kr', 'gwangju',   '광주',   'Gwangju',   35.1595000, 126.8526000, 11.00, 60),
    ('kr', 'jeju',      '제주',   'Jeju',      33.4996000, 126.5312000, 11.00, 70),
    ('jp', 'tokyo',     '도쿄',   'Tokyo',     35.6762000, 139.6503000, 11.00, 10),
    ('jp', 'osaka',     '오사카', 'Osaka',     34.6937000, 135.5023000, 11.00, 20),
    ('jp', 'kyoto',     '교토',   'Kyoto',     35.0116000, 135.7681000, 12.00, 30),
    ('jp', 'nagoya',    '나고야', 'Nagoya',    35.1815000, 136.9066000, 11.00, 40),
    ('jp', 'fukuoka',   '후쿠오카', 'Fukuoka', 33.5904000, 130.4017000, 11.00, 50),
    ('jp', 'sapporo',   '삿포로', 'Sapporo',   43.0618000, 141.3545000, 11.00, 60),
    ('tw', 'taipei',    '타이베이', 'Taipei',  25.0330000, 121.5654000, 12.00, 10),
    ('tw', 'taichung',  '타이중', 'Taichung',  24.1477000, 120.6736000, 12.00, 20),
    ('tw', 'kaohsiung', '가오슝', 'Kaohsiung', 22.6273000, 120.3014000, 12.00, 30),
    ('tw', 'tainan',    '타이난', 'Tainan',    22.9997000, 120.2270000, 12.00, 40),
    ('hk', 'hongkong',  '홍콩',   'Hong Kong', 22.3193000, 114.1694000, 12.00, 10),
    ('sg', 'singapore', '싱가포르', 'Singapore', 1.3521000, 103.8198000, 12.00, 10);

INSERT INTO venue_city
    (country_code, slug, name_ko, name_en, center_lat, center_lng, default_zoom,
     sort_order, is_active, created_at, updated_at)
SELECT
    seed.country_code, seed.slug, seed.name_ko, seed.name_en,
    seed.center_lat, seed.center_lng, seed.default_zoom,
    seed.sort_order, 1, NOW(6), NOW(6)
FROM tmp_venue_city_seed seed
WHERE NOT EXISTS (
    SELECT 1 FROM venue_city existing
    WHERE existing.country_code = seed.country_code
      AND existing.slug = seed.slug
);

DROP TABLE tmp_venue_city_seed;
