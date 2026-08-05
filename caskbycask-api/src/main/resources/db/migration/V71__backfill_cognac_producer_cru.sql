-- =============================================================================
-- 꼬냑 하우스 생산자의 세부 산지(크뤼) 백필
-- =============================================================================
-- V68 에서 꼬냑 생산자는 전부 지역 텍스트 '꼬냑' → region_code 'FR_COGNAC' 으로만 연결됐다.
-- 관리자 > 생산자 관리에 세부 산지(크뤼) 선택이 생겼으므로, V6 시드의 소개문에서
-- 크뤼가 명시된 하우스만 해당 크뤼 코드로 올린다.
--
-- 원칙 — 추측 금지.
--   * 소개문이 특정 크뤼 하나를 명시한 하우스만 대상으로 한다.
--   * '핀 샹파뉴'(그랑드+프티트 블렌드)·복수 크뤼·크뤼 언급 없음은 세부 산지 미등록으로 두고
--     'FR_COGNAC'(꼬냑 지방 전체)을 유지한다. 예) 레미 마르탱·드 뤼즈·헤네시·마르텔 등.
--   * 이미 관리자가 손으로 세부 산지를 고른 행은 덮어쓰지 않는다(region_code = 'FR_COGNAC' 조건).
-- =============================================================================

-- ── 그랑드 샹파뉴 (Grande Champagne) ─────────────────────────────────────────
UPDATE producer
SET region_code = 'FR_COGNAC_GRANDE_CHAMPAGNE'
WHERE type = 'COGNAC_HOUSE'
  AND region_code = 'FR_COGNAC'
  AND name_en IN (
      'Maison Ferrand (Pierre Ferrand)',  -- 그랑드 샹파뉴 메종
      'Frapin',                           -- 그랑드 샹파뉴 단일 끄뤼 싱글 에스테이트
      'Delamain',                         -- 그랑드 샹파뉴 고숙성 전문
      'Ragnaud-Sabourin',                 -- 그랑드 샹파뉴 그로어
      'Jean Fillioux',                    -- 쥐야크르코크의 그랑드 샹파뉴 그로어
      'François Voyer',                   -- 그랑드 샹파뉴 가족 그로어
      'Daniel Bouju',                     -- 그랑드 샹파뉴 전통 그로어
      'Croizet',                          -- 그랑드 샹파뉴 역사적 가족 메종
      'Paul Giraud',                      -- 부트빌의 그랑드 샹파뉴 그로어
      'Dudognon',                         -- 그랑드 샹파뉴 전통 그로어
      'Jean-Luc Pasquet'                  -- 그랑드 샹파뉴 유기농 그로어
  );

-- ── 프티트 샹파뉴 (Petite Champagne) ────────────────────────────────────────
UPDATE producer
SET region_code = 'FR_COGNAC_PETITE_CHAMPAGNE'
WHERE type = 'COGNAC_HOUSE'
  AND region_code = 'FR_COGNAC'
  AND name_en IN (
      'Normandin-Mercier',        -- 프티트 샹파뉴 중심
      'Lhéraud',                  -- 프티트 샹파뉴 그로어 가문
      'Château de Montifaud'      -- 프티트 샹파뉴 명문 그로어(발레 가문)
  );

-- ── 보르드리 (Borderies) ────────────────────────────────────────────────────
UPDATE producer
SET region_code = 'FR_COGNAC_BORDERIES'
WHERE type = 'COGNAC_HOUSE'
  AND region_code = 'FR_COGNAC'
  AND name_en IN (
      'Camus',                    -- 보르드리 끄뤼 중심의 향기로운 스타일
      'Bache-Gabrielsen'          -- 보르드리 끄뤼 중심의 균형 잡힌 스타일
  );
