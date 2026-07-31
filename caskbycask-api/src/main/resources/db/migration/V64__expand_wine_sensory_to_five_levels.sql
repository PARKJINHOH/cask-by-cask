-- 와인 관능(맛) 지표를 5단계 척도로 확장.
-- 국내 와인 유통(wine21 등)이 당도·산도·바디·타닌을 1~5 단계로 표기하는 관행에 맞춘다.
--
-- 기존 값은 그대로 두고 중간 단계만 추가하는 **가산 변경**이라 기존 데이터·검색 필터에 영향이 없다.
--   당도 : DRY(1) · OFF_DRY(2) · MEDIUM(3) · MEDIUM_SWEET(4, 신규) · SWEET(5)
--   바디 : LIGHT(1) · LIGHT_MEDIUM(2, 신규) · MEDIUM(3) · MEDIUM_FULL(4, 신규) · FULL(5)
--   산도·타닌 : LOW(1) · LOW_MEDIUM(2, 신규) · MEDIUM(3) · MEDIUM_HIGH(4, 신규) · HIGH(5)
--
-- enum 값 나열 순서는 Hibernate 가 생성하는 순서(알파벳)와 같아야 ddl-auto=validate 를 통과한다.
ALTER TABLE spirit_wine_detail
    MODIFY COLUMN sweetness enum('DRY','MEDIUM','MEDIUM_SWEET','OFF_DRY','SWEET') NULL
        COMMENT '당도 5단계 — DRY/OFF_DRY/MEDIUM/MEDIUM_SWEET/SWEET',
    MODIFY COLUMN body      enum('FULL','LIGHT','LIGHT_MEDIUM','MEDIUM','MEDIUM_FULL') NULL
        COMMENT '바디 5단계 — LIGHT/LIGHT_MEDIUM/MEDIUM/MEDIUM_FULL/FULL',
    MODIFY COLUMN acidity   enum('HIGH','LOW','LOW_MEDIUM','MEDIUM','MEDIUM_HIGH') NULL
        COMMENT '산도 5단계 — LOW/LOW_MEDIUM/MEDIUM/MEDIUM_HIGH/HIGH',
    MODIFY COLUMN tannin    enum('HIGH','LOW','LOW_MEDIUM','MEDIUM','MEDIUM_HIGH') NULL
        COMMENT '타닌 5단계 — LOW/LOW_MEDIUM/MEDIUM/MEDIUM_HIGH/HIGH';
