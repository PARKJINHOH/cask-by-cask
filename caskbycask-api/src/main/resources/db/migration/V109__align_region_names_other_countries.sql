-- 산지 이름 표기를 카탈로그(WineRegion)에 맞춘다 — 대한민국 외 국가.
--
-- 배경
--   생산자 등록 화면의 지역 목록(regionSuggestions.ts)이 카탈로그와 따로 관리되면서
--   같은 곳을 다르게 적은 표기가 남았다 — '샴페인' vs '샹파뉴', '센트럴오타고' vs '센트럴 오타고'.
--   카탈로그에 없는 이름으로 저장된 행은 LegacyWineRegionResolver 가 코드를 찾지 못해
--   지도·영문 라벨에서 빠진다. 목록 자체는 같은 변경에서 카탈로그와 일치하도록 정리했다.
--
-- 여기서 옮기는 것은 **같은 곳을 가리키는 표기 차이뿐**이다.
-- 카탈로그에 아예 없는 값(펨브로크셔·칼라브리아·라펠·산토리니 등)은 어디로 보낼지
-- 사람이 판단해야 하므로 손대지 않는다.
--
-- 규약은 V63·V68 을 따른다: spirit.region 은 L1 한글명으로 동기화하고,
-- producer.region 은 표기만 교정한다(원문의 정보량은 그대로다).

CREATE TEMPORARY TABLE tmp_region_rename (
    category VARCHAR(10) NOT NULL,
    legacy_region VARCHAR(100) NOT NULL,
    canonical_region VARCHAR(100) NOT NULL,
    region_code VARCHAR(40) NOT NULL,
    canonical_l1_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (category, legacy_region)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_region_rename
    (category, legacy_region, canonical_region, region_code, canonical_l1_name)
VALUES
    ('WINE', '샴페인', '샹파뉴', 'FR_CHAMPAGNE', '샹파뉴'),
    ('WINE', '랑그도크루시옹', '랑그도크 루시용', 'FR_LANGUEDOC', '랑그도크 루시용'),
    ('WINE', '트렌티노알토아디제', '트렌티노 알토 아디제', 'IT_TRENTINO_ALTO_ADIGE', '트렌티노 알토 아디제'),
    ('WINE', '에밀리아로마냐', '에밀리아 로마냐', 'IT_EMILIA_ROMAGNA', '에밀리아 로마냐'),
    ('WINE', '카스티야이레온', '카스티야 이 레온', 'ES_CASTILLA_Y_LEON', '카스티야 이 레온'),
    ('WINE', '비뉴베르드', '비뉴 베르드', 'PT_VINHO_VERDE', '비뉴 베르드'),
    ('WINE', '리스본', '리스보아', 'PT_LISBOA', '리스보아'),
    ('WINE', '아조레스', '아소르스', 'PT_ACORES', '아소르스'),
    ('WINE', '사우스오스트레일리아', '사우스 오스트레일리아', 'AU_SOUTH_AUSTRALIA', '사우스 오스트레일리아'),
    ('WINE', '웨스턴오스트레일리아', '웨스턴 오스트레일리아', 'AU_WESTERN_AUSTRALIA', '웨스턴 오스트레일리아'),
    ('WHISKY', '웨스턴오스트레일리아', '웨스턴 오스트레일리아', 'AU_WESTERN_AUSTRALIA', '웨스턴 오스트레일리아'),
    ('WINE', '산후안', '산 후안', 'AR_SAN_JUAN', '산 후안'),
    ('WINE', '리오네그로', '리오 네그로', 'AR_RIO_NEGRO', '리오 네그로'),
    ('WINE', '라리오하', '라 리오하', 'AR_LA_RIOJA', '라 리오하'),
    ('WINE', '센트럴오타고', '센트럴 오타고', 'NZ_OTAGO_CENTRAL_OTAGO', '오타고'),
    ('WINE', '기즈번', '기스본', 'NZ_GISBORNE', '기스본'),
    ('WINE', '프란스후크', '프란슈크', 'ZA_CAPE_WINELANDS_FRANSCHHOEK', '케이프 와인랜드'),
    ('WHISKY', '카운티다운', '다운', 'GB_NIR_DOWN', '다운');

-- 생산자 — 표기를 교정하고, 코드가 비어 있으면 함께 채운다(이미 있으면 건드리지 않는다).
UPDATE producer p
JOIN tmp_region_rename m
  ON m.category = CASE p.type
        WHEN 'DISTILLERY' THEN 'WHISKY'
        WHEN 'WINERY' THEN 'WINE'
        WHEN 'COGNAC_HOUSE' THEN 'COGNAC'
        WHEN 'OTHER' THEN 'OTHER'
     END
 AND m.legacy_region = TRIM(p.region)
SET p.region = m.canonical_region,
    p.region_code = COALESCE(p.region_code, m.region_code);

-- 주류 — 검색·필터·SEO 가 쓰는 region 은 현재 규약대로 L1 한글명으로 맞춘다.
UPDATE spirit s
JOIN tmp_region_rename m
  ON m.category = s.category
 AND m.legacy_region = TRIM(s.region)
SET s.region = m.canonical_l1_name,
    s.region_code = COALESCE(s.region_code, m.region_code);

-- 에디션은 마스터 산지를 따른다(V68 과 같은 규칙 — 비어 있는 값만 채운다).
UPDATE spirit child
JOIN spirit parent ON parent.id = child.parent_id
SET child.region_code = parent.region_code,
    child.region = parent.region
WHERE child.region_code IS NULL
  AND parent.region_code IS NOT NULL;

DROP TEMPORARY TABLE tmp_region_rename;
