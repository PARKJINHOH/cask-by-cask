package com.caskbycask.global.storage;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.ImagePlanValidator.PlanItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * 이미지 교체 계획 검증.
 *
 * <p>계획 규약은 "2번은 유지하되 맨 앞으로, 1번은 삭제, 새로 한 장 추가"를 요청 한 번에
 * 원자적으로 처리한다. 규약이 깨지는 방식이 조용해서 — 사진이 사라지거나, 순서가 뒤집히거나,
 * 남의 사진이 붙거나 — 여기서 전부 고정한다.
 *
 * <p>파일 저장은 다루지 않는다(순수 검증 로직만). 저장·롤백은 서비스 통합 테스트의 몫이다.
 */
class ImagePlanValidatorTest {

    private static final int MAX = 5;
    private static final ErrorCode LIMIT = ErrorCode.VENUE_COMMENT_IMAGE_LIMIT_EXCEEDED;
    private static final ErrorCode INVALID = ErrorCode.VENUE_COMMENT_IMAGE_PLAN_INVALID;

    private ImagePlanValidator validator;
    private Set<Long> existing;

    @BeforeEach
    void setUp() {
        validator = new ImagePlanValidator(mock(FileStorageService.class));
        existing = Set.of(10L, 11L, 12L);
    }

    private MultipartFile file(String name) {
        return new MockMultipartFile(name, name + ".jpg", "image/jpeg", new byte[]{1, 2, 3});
    }

    @Test
    @DisplayName("계획 순서가 그대로 노출 순서가 된다")
    void planOrderBecomesSortOrder() {
        var slots = validator.resolve(
                List.of(new PlanItem(12L, null), new PlanItem(null, 0), new PlanItem(10L, null)),
                List.of(file("a")), existing, MAX, LIMIT, INVALID);

        assertThat(slots).extracting(ImagePlanValidator.ResolvedSlot::sortOrder)
                .containsExactly(0, 1, 2);
        assertThat(slots.get(0).retainedImageId()).isEqualTo(12L);
        assertThat(slots.get(1).newFile()).isNotNull();
        assertThat(slots.get(2).retainedImageId()).isEqualTo(10L);
    }

    @Test
    @DisplayName("유지하지 않은 기존 이미지는 삭제 대상이 된다")
    void unretainedImagesAreDropped() {
        var slots = validator.resolve(
                List.of(new PlanItem(10L, null)), List.of(), existing, MAX, LIMIT, INVALID);

        // 11, 12 는 계획에 없으므로 호출부가 지운다.
        assertThat(validator.retainedIds(slots)).containsExactly(10L);
    }

    @Test
    @DisplayName("빈 계획은 사진을 전부 지우겠다는 뜻이다")
    void emptyPlanClearsEverything() {
        var slots = validator.resolve(List.of(), List.of(), existing, MAX, LIMIT, INVALID);

        assertThat(slots).isEmpty();
        assertThat(validator.retainedIds(slots)).isEmpty();
    }

    @Test
    @DisplayName("한 칸에 둘 다 채우면 무엇을 의도했는지 알 수 없어 거절한다")
    void bothFieldsIsAmbiguous() {
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(10L, 0)), List.of(file("a")), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("한 칸을 비워도 거절한다")
    void neitherFieldIsAmbiguous() {
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(null, null)), List.of(), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("남의 이미지 id 를 끼워 넣을 수 없다")
    void foreignImageIdIsRejected() {
        // 이 검증이 없으면 계획에 아무 id 나 적어 다른 사람의 사진을 자기 댓글로 가져올 수 있다.
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(999L, null)), List.of(), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("같은 이미지를 두 번 쓸 수 없다")
    void duplicateImageIdIsRejected() {
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(10L, null), new PlanItem(10L, null)),
                List.of(), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("같은 파일을 두 번 쓸 수 없다")
    void duplicateFileIndexIsRejected() {
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(null, 0), new PlanItem(null, 0)),
                List.of(file("a")), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("범위 밖 파일 인덱스를 거절한다")
    void outOfRangeFileIndexIsRejected() {
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(null, 3)), List.of(file("a")), existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("올린 파일이 계획에서 하나라도 남으면 거절한다")
    void unusedFileIsRejected() {
        // 조용히 버리면 사용자는 올렸다고 생각하는데 사진이 사라진다.
        assertThatThrownBy(() -> validator.resolve(
                List.of(new PlanItem(null, 0)), List.of(file("a"), file("b")),
                existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", INVALID);
    }

    @Test
    @DisplayName("상한을 넘긴 계획은 다른 에러로 구분해 알린다")
    void overLimitUsesLimitError() {
        var plan = List.of(
                new PlanItem(null, 0), new PlanItem(null, 1), new PlanItem(null, 2),
                new PlanItem(null, 3), new PlanItem(null, 4), new PlanItem(null, 5));

        assertThatThrownBy(() -> validator.resolve(
                plan, List.of(file("a"), file("b"), file("c"), file("d"), file("e"), file("f")),
                existing, MAX, LIMIT, INVALID))
                .isInstanceOf(CustomException.class)
                // "형식이 틀렸다"가 아니라 "장수를 줄여라"로 안내해야 다음 시도가 성공한다.
                .hasFieldOrPropertyWithValue("errorCode", LIMIT);
    }

    @Test
    @DisplayName("null 계획은 빈 계획과 같다")
    void nullPlanIsEmpty() {
        assertThat(validator.resolve(null, null, existing, MAX, LIMIT, INVALID)).isEmpty();
    }

    @Test
    @DisplayName("빈 파일은 목록에서 걸러진다 — 브라우저가 빈 파트를 보내는 경우가 있다")
    void emptyFilesAreFiltered() {
        MultipartFile empty = new MockMultipartFile("x", "x.jpg", "image/jpeg", new byte[0]);

        assertThat(ImagePlanValidator.normalizeFiles(List.of(empty))).isEmpty();
        // 빈 파트가 걸러진 뒤에도 계획과 아귀가 맞아야 한다.
        assertThat(validator.resolve(List.of(), List.of(empty), existing, MAX, LIMIT, INVALID))
                .isEmpty();
    }
}
