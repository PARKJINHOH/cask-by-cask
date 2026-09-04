-- 산토리니를 산지 카탈로그의 세부산지(에게해 섬 아래)로 올리고, 그 이름으로 저장된 행에 코드를 붙인다.
--
-- 그동안 '산토리니'는 카탈로그에 없는 이름이었고 LegacyWineRegionResolver 의 호환 별칭이
-- 상위 산지(에게해 섬)로 보내 주고 있었다. 그리스 와인의 대표 산지를 별칭으로만 아는 상태가
-- 이상해서 카탈로그(WineRegion.GR_AEGEAN_SANTORINI)에 넣고 별칭은 걷어냈다.
-- 이미 상위 산지로 붙어 있던 코드도 더 정확한 세부산지로 올린다.

UPDATE producer
SET region_code = 'GR_AEGEAN_SANTORINI'
WHERE country = '그리스'
  AND TRIM(region) = '산토리니'
  AND (region_code IS NULL OR region_code = 'GR_AEGEAN');

-- 주류의 region 텍스트는 L1 이름으로 두는 규약(V63)을 따른다 — 정확한 위치는 코드가 갖는다.
-- 화면은 코드를 보고 "에게해 섬 · 산토리니" 로 보여 준다.
UPDATE spirit
SET region_code = 'GR_AEGEAN_SANTORINI',
    region = '에게해 섬'
WHERE country = '그리스'
  AND TRIM(region) = '산토리니'
  AND (region_code IS NULL OR region_code = 'GR_AEGEAN');
