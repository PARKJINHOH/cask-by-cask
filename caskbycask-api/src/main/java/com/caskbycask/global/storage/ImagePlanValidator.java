package com.caskbycask.global.storage;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * 이미지 교체 계획(imagePlan) 검증과 트랜잭션 인지 파일 정리.
 *
 * <h3>왜 이 클래스가 있는가</h3>
 * 리뷰 이미지가 쓰는 교체 규약은 "2번은 유지하되 맨 앞으로, 1번은 삭제, 새로 한 장 추가"를
 * 멀티파트 요청 한 번에 원자적으로 처리한다. 장소 댓글도 정확히 같은 것이 필요하다.
 *
 * <p>그렇다고 {@code ReviewImageService} 를 복사하면 안 된다 — 그 파일의 검증 절반은
 * 도메인 중립이면서 <b>보안상 결정적</b>이고(매직바이트 판별·픽셀 폭탄 가드·WebP 강제 재인코딩),
 * 복사본이 생기는 순간 다음 보안 수정이 둘 중 한 곳에만 들어간다.
 *
 * <p>그래서 <b>알고리즘만</b> 여기로 뽑았다. 기존 {@code ReviewImageService} 는 건드리지 않는다 —
 * 살아 있는 부하 경로(리뷰 작성·수정·에디션 요청)라 무동작 리팩터는 별도 작업이어야 한다.
 * 이 클래스로의 이관은 그때 한다.
 */
@Component
@RequiredArgsConstructor
public class ImagePlanValidator {

    private final FileStorageService fileStorageService;

    /** 계획 한 칸 — {@code imageId}(유지) 와 {@code fileIndex}(신규) 중 <b>정확히 하나</b>만 채운다. */
    public record PlanItem(Long imageId, Integer fileIndex) {
    }

    /**
     * 검증을 통과한 한 칸. 둘 중 하나만 non-null 이다.
     * {@code sortOrder} 는 계획에서의 위치라 그대로 저장하면 노출 순서가 된다.
     */
    public record ResolvedSlot(int sortOrder, Long retainedImageId, MultipartFile newFile) {
    }

    /**
     * 계획을 검증하고 순서대로 펼친다.
     *
     * <p>검증 항목:
     * <ul>
     *   <li>칸 수가 상한 이내인가</li>
     *   <li>각 칸이 {@code imageId} xor {@code fileIndex} 인가</li>
     *   <li>{@code imageId} 가 <b>이 소유자의</b> 기존 이미지인가 — 남의 이미지 id 를 끼워 넣어
     *       가져오는 것을 막는 지점이다</li>
     *   <li>같은 이미지·같은 파일을 두 번 쓰지 않는가</li>
     *   <li>올린 파일이 전부 소비됐는가 — 안 그러면 업로드했는데 사라진 것처럼 보인다</li>
     * </ul>
     *
     * @param existingIds 이 소유자가 현재 갖고 있는 이미지 id 전부
     */
    public List<ResolvedSlot> resolve(List<PlanItem> plan,
                                      List<MultipartFile> files,
                                      Set<Long> existingIds,
                                      int maxImages,
                                      ErrorCode limitExceeded,
                                      ErrorCode planInvalid) {
        List<PlanItem> items = plan == null ? List.of() : plan;
        List<MultipartFile> normalized = normalizeFiles(files);

        if (items.size() > maxImages) {
            throw new CustomException(limitExceeded);
        }

        Set<Long> retained = new HashSet<>();
        Set<Integer> usedFileIndexes = new HashSet<>();
        List<ResolvedSlot> slots = new ArrayList<>(items.size());

        for (int sortOrder = 0; sortOrder < items.size(); sortOrder++) {
            PlanItem item = items.get(sortOrder);
            boolean keepsExisting = item != null && item.imageId() != null;
            boolean addsNew = item != null && item.fileIndex() != null;

            // 둘 다이거나 둘 다 아니면 무엇을 의도했는지 알 수 없다.
            if (keepsExisting == addsNew) {
                throw new CustomException(planInvalid);
            }

            if (keepsExisting) {
                if (!existingIds.contains(item.imageId()) || !retained.add(item.imageId())) {
                    throw new CustomException(planInvalid);
                }
                slots.add(new ResolvedSlot(sortOrder, item.imageId(), null));
            } else {
                int index = item.fileIndex();
                if (index < 0 || index >= normalized.size() || !usedFileIndexes.add(index)) {
                    throw new CustomException(planInvalid);
                }
                slots.add(new ResolvedSlot(sortOrder, null, normalized.get(index)));
            }
        }

        if (usedFileIndexes.size() != normalized.size()) {
            throw new CustomException(planInvalid);
        }
        return slots;
    }

    /** 계획이 유지하지 않은 기존 이미지 id — 호출부가 이 목록을 지운다. */
    public Set<Long> retainedIds(List<ResolvedSlot> slots) {
        Set<Long> retained = new HashSet<>();
        for (ResolvedSlot slot : slots) {
            if (slot.retainedImageId() != null) retained.add(slot.retainedImageId());
        }
        return retained;
    }

    public static List<MultipartFile> normalizeFiles(List<MultipartFile> files) {
        if (files == null) return List.of();
        return files.stream().filter(Objects::nonNull).filter(f -> !f.isEmpty()).toList();
    }

    // ── 트랜잭션 인지 파일 정리 ──────────────────────────────

    /**
     * 트랜잭션이 롤백되면 방금 올린 파일을 지운다.
     *
     * <p>파일 저장은 트랜잭션 밖에서 즉시 일어나므로, 뒤이어 DB 작업이 실패하면
     * 아무도 참조하지 않는 파일이 디스크에 남는다.
     */
    public void deleteOnRollback(String savedFileName, String subPath) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    fileStorageService.delete(savedFileName, subPath);
                }
            }
        });
    }

    /**
     * 커밋된 뒤에 파일을 지운다.
     *
     * <p>커밋 전에 지우면 롤백됐을 때 DB 에는 행이 살아 있는데 파일만 사라진다 —
     * 깨진 이미지가 영구히 남는 쪽이 잠깐 고아 파일이 남는 쪽보다 나쁘다.
     */
    public void deleteAfterCommit(List<StoredFileRef> files) {
        if (files.isEmpty()) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            files.forEach(f -> fileStorageService.delete(f.savedFileName(), f.subPath()));
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                files.forEach(f -> fileStorageService.delete(f.savedFileName(), f.subPath()));
            }
        });
    }

    /** 삭제 대상 파일의 최소 식별 정보 — 엔티티 타입에 묶이지 않도록 분리했다. */
    public record StoredFileRef(String savedFileName, String subPath) {
    }
}
