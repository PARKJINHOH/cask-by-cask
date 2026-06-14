-- post_images 에 sub_path 추가 (PostVideo/NoticeImage 와 동일하게 실제 저장 경로 보존).
-- 기존엔 컬럼이 없어 서빙·삭제 시 URL 에서 "posts" 로만 추론 → posts/YYYYMM 실제 경로와 불일치(잠재 버그).
ALTER TABLE post_images ADD COLUMN sub_path VARCHAR(200) COMMENT '저장 하위 경로';

-- 기존 행 백필: 업로드 시 subPath = "posts/" + YearMonth.now() 였으므로 created_at 으로 복원.
UPDATE post_images
   SET sub_path = CONCAT('posts/', DATE_FORMAT(created_at, '%Y%m'))
 WHERE sub_path IS NULL;

ALTER TABLE post_images MODIFY COLUMN sub_path VARCHAR(200) NOT NULL COMMENT '저장 하위 경로';
