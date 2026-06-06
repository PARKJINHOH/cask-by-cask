-- 위스키 스타일(enum) 개편
--  · TENNESSEE(테네시) 추가
--  · CORN + GRAIN → GRAIN_CORN 으로 병합
--  · V1 베이스라인에서 누락됐던 OTHER 포함 (데이터 오류 정정)

-- 1) 구/신 값을 모두 포함하는 전이 enum 으로 확장
ALTER TABLE spirit_whisky_detail
    MODIFY COLUMN style enum (
        'BLENDED_MALT','BLENDED_WHISKY','BOURBON','CORN','GRAIN','GRAIN_CORN',
        'OTHER','POT_STILL','RYE','SINGLE_MALT','TENNESSEE'
    );

-- 2) 기존 CORN / GRAIN 데이터를 병합 값으로 이전
UPDATE spirit_whisky_detail
   SET style = 'GRAIN_CORN'
 WHERE style IN ('CORN', 'GRAIN');

-- 3) 구 값(CORN, GRAIN) 제거 — 최종 enum 으로 확정
ALTER TABLE spirit_whisky_detail
    MODIFY COLUMN style enum (
        'BLENDED_MALT','BLENDED_WHISKY','BOURBON','GRAIN_CORN',
        'OTHER','POT_STILL','RYE','SINGLE_MALT','TENNESSEE'
    );
