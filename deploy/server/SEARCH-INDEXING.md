# Hibernate Search 시작 시 전체 인덱싱

API는 기존 운영 동작과 동일하게 시작할 때 `Spirit` 전체 mass indexing을 수행한다. 현재 릴리스는 시작 재색인을 끄는 설정을 제공하지 않는다.

```text
HIBERNATE_SEARCH_MASS_INDEX_THREADS=4         # 기본값
```

스레드 수는 1~16만 허용하며 잘못된 값이면 API가 기동하지 않는다. 현재 OCI 자원에서는 측정 없이 기본값 4를 올리지 않는다. 재색인 성공 전과 실패 후에는 `searchIndex` health가 `DOWN`이므로 배포 스크립트의 readiness 확인과 자동 롤백 대상이 된다. 일반 서버 재부팅에서 재색인이 실패해도 API 프로세스와 비검색 기능은 유지하여 systemd 재시작 루프를 피한다. 중단 신호는 interrupt 상태를 복원하고 기동 실패로 전파한다.

시작 재색인을 유지하는 이유는 다음과 같다.

- Lucene 인덱스가 비어 있거나 매핑 변경과 호환되지 않을 때 검색 결과가 사라지는 것을 방지한다.
- `Spirit`와 연관된 producer 및 카테고리 상세 엔티티 수정이 모두 증분 인덱싱된다는 통합 검증이 아직 없다.
- 현재 기본 인덱스 경로는 `/app/spring-boot/lucene/indexes`이고 별도 영속 경로·systemd 쓰기 권한 전환 절차가 확정되지 않았다.

## 기동 점검

API 배포 후 다음 로그와 readiness를 함께 확인한다.

```bash
journalctl -u caskbycask-api -n 200 --no-pager \
  | grep -E 'Hibernate Search Mass Indexing (completed successfully|failed|was interrupted)'
curl --fail --silent http://127.0.0.1:8081/actuator/health/readiness
```

성공 로그가 없거나 실패·중단 로그가 있거나 readiness가 `UP`이 아니면 새 버전을 정상 배포로 판단하지 않는다. 프로세스가 실행 중이더라도 검색 인덱스는 비정상일 수 있으므로 대표 KO/EN 주류 검색도 확인한다.

## 향후 시작 재색인 비활성화 게이트

데이터 증가로 재시작 시간이 길어져 비활성화를 검토할 때는 별도 Step으로 다음을 먼저 구현하고 검증한다.

1. 배포 디렉터리와 분리된 영속 인덱스 경로를 만들고 소유권, 백업 제외 정책, systemd `ReadWritePaths`를 동기화한다.
2. 정상 검색과 Spirit 등록·수정·비활성화뿐 아니라 producer 이름·검색키워드, whisky/wine/cognac 상세 필드 수정까지 증분 반영되는지 통합 테스트한다.
3. API 재시작 후 동일 인덱스가 유지되는지 확인한다.
4. 운영에 노출되지 않는 인증된 수동 재색인 절차 또는 일회성 작업을 마련한다.
5. 인덱스 손상·누락 시 DB 원본에서 재생성하고 검색을 검증하는 롤백 훈련을 수행한다.

위 게이트가 끝나기 전에는 시작 재색인을 비활성화하는 환경변수를 임의로 추가하지 않는다. 이 설정은 DB 스키마를 바꾸지 않으며 Flyway migration도 필요하지 않다.
