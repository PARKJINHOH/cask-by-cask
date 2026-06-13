-- 위스키 스타일(enum) 에 밀 버번(WHEATED_BOURBON) 추가
ALTER TABLE spirit_whisky_detail
    MODIFY COLUMN style enum (
        'BLENDED_MALT','BLENDED_WHISKY','BOURBON','WHEATED_BOURBON','GRAIN_CORN',
        'OTHER','POT_STILL','RYE','SINGLE_MALT','TENNESSEE'
    );
