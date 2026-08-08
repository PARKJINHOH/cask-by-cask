-- Vivino가 공개 페이지 크롤링을 허용해 별도 서면 허가 게이트를 유지할 필요가 없어졌다.
-- 수집 강도 제한(hourly_limit, max_run_items)과 크롤러의 요청 간격은 그대로 남는다.
-- provider_mode는 automation_enabled와 의미가 겹쳐 함께 제거한다.
-- FIXTURE는 모드가 아니라 실행 유형(wine_ingest_runs.run_type)으로 계속 남는다.

alter table wine_ingest_settings
    drop column provider_mode,
    drop column license_approved,
    drop column usage_grant_ref;

alter table spirit_external_references
    drop column usage_grant_ref;
