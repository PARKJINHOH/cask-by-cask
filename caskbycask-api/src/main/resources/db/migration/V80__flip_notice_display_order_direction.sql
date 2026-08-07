-- 공지 노출 순서를 "클수록 위"(DESC 정렬)에서 "작을수록 위"(ASC 정렬)로 뒤집는다.
-- 배너·팝업·FAQ·말머리·SNS 배경과 같은 규칙으로 맞추기 위한 일회성 정리.
--
-- 값의 부호만 바꾸면 안 된다. 한 번도 정렬하지 않은 공지는 display_order 가 0 이고
-- 정렬한 적 있는 공지만 N..1 을 갖고 있어서 두 그룹의 기준이 서로 다르기 때문이다.
-- 그래서 "기존 정렬 기준으로 나보다 위에 있던 공지 수"를 새 display_order 로 다시 매긴다.
--   기존 기준: display_order DESC, created_at DESC (동률은 id DESC 로 고정)
-- 결과는 0부터 시작하는 고유값이 되고, 화면에 보이던 순서는 그대로 유지된다.
-- is_pinned 는 정렬 1순위로 그대로 남으므로 여기서 빼고 매겨도 고정 공지의 위치는 변하지 않는다.
--
-- 순위를 임시 테이블에 먼저 담는 이유:
--   UPDATE 문 안에서 대상 테이블(notice)을 다시 읽으면 옵티마이저가 파생 테이블을 머지할 때
--   "You can't specify target table for update in FROM clause"(1093)로 죽을 수 있다.
--   한 단계 끊어두면 MariaDB 버전에 상관없이 안전하다.
-- ROW_NUMBER() 를 쓰지 않은 것도 같은 이유(버전 비의존)이며, 공지는 많아야 수백 건이라
-- 상관 서브쿼리로 충분하다.
CREATE TEMPORARY TABLE notice_display_order_rank AS
SELECT n1.id AS id,
       (SELECT COUNT(*)
          FROM notice n2
         WHERE n2.display_order > n1.display_order
            OR (n2.display_order = n1.display_order AND n2.created_at > n1.created_at)
            OR (n2.display_order = n1.display_order AND n2.created_at = n1.created_at
                AND n2.id > n1.id)
       ) AS new_display_order
  FROM notice n1;

UPDATE notice n
  JOIN notice_display_order_rank r ON r.id = n.id
   SET n.display_order = r.new_display_order;

DROP TEMPORARY TABLE notice_display_order_rank;

ALTER TABLE notice
    MODIFY COLUMN display_order INT NOT NULL DEFAULT 0 COMMENT '노출 순서 (작을수록 위)';
