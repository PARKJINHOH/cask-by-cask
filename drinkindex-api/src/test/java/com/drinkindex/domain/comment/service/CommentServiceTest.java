package com.drinkindex.domain.comment.service;

import com.drinkindex.domain.comment.dto.CommentRequest;
import com.drinkindex.domain.comment.dto.CommentResponse;
import com.drinkindex.domain.comment.dto.UpdateCommentRequest;
import com.drinkindex.domain.comment.entity.CommentLike;
import com.drinkindex.domain.comment.entity.CommunityComment;
import com.drinkindex.domain.comment.repository.CommentLikeRepository;
import com.drinkindex.domain.comment.repository.CommentRepository;
import com.drinkindex.domain.community.repository.CommentEmojiReactionRepository;
import com.drinkindex.domain.community.service.EmojiService;
import com.drinkindex.global.util.BadWordFilter;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.repository.SpiritRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock private CommentRepository commentRepository;
    @Mock private CommentLikeRepository commentLikeRepository;
    @Mock private SpiritRepository spiritRepository;
    @Mock private UserRepository userRepository;
    @Mock private BadWordFilter badWordFilter;                            // [패치 5] 욕설 필터
    @Mock private CommentEmojiReactionRepository reactionRepository;      // [패치 13] 이모지 반응
    @Mock private EmojiService emojiService;                              // [패치 13] 이모지 반응 토글

    @InjectMocks
    private CommentService commentService;

    private Spirit spirit;
    private User owner;
    private User other;

    @BeforeEach
    void setUp() {
        spirit = Spirit.builder()
                .nameKo("테스트 위스키").nameEn("Test Whisky")
                .category(SpiritCategory.WHISKY).build();
        spirit.approve();
        ReflectionTestUtils.setField(spirit, "id", 1L);

        owner = User.builder()
                .email("owner@test.com").nickname("작성자").role(Role.MEMBER).build();
        ReflectionTestUtils.setField(owner, "id", 1L);

        other = User.builder()
                .email("other@test.com").nickname("타인").role(Role.MEMBER).build();
        ReflectionTestUtils.setField(other, "id", 2L);
    }

    // ── 댓글 작성 ─────────────────────────────────────────

    @Test
    @DisplayName("부모 댓글 정상 작성")
    void createComment_parentComment_success() {
        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(owner);

        CommunityComment saved = buildComment(1L, spirit, owner, null, "좋은 위스키입니다");
        given(commentRepository.save(any())).willReturn(saved);

        CommentResponse response = commentService.createComment(1L, 1L,
                new CommentRequest("좋은 위스키입니다", null));

        assertThat(response.content()).isEqualTo("좋은 위스키입니다");
        assertThat(response.children()).isEmpty();
    }

    @Test
    @DisplayName("대댓글 정상 작성")
    void createComment_reply_success() {
        CommunityComment parent = buildComment(10L, spirit, owner, null, "부모 댓글");

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(2L)).willReturn(other);
        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(parent));

        CommunityComment reply = buildComment(11L, spirit, other, parent, "대댓글입니다");
        given(commentRepository.save(any())).willReturn(reply);

        CommentResponse response = commentService.createComment(1L, 2L,
                new CommentRequest("대댓글입니다", 10L));

        assertThat(response.content()).isEqualTo("대댓글입니다");
    }

    @Test
    @DisplayName("대댓글에 대댓글 시도 시 NESTED_REPLY_NOT_ALLOWED 예외")
    void createComment_nestedReply_throwsException() {
        CommunityComment grandParent = buildComment(10L, spirit, owner, null, "조부모 댓글");
        CommunityComment parent = buildComment(11L, spirit, owner, grandParent, "부모 댓글");

        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(2L)).willReturn(other);
        given(commentRepository.findByIdAndSpiritId(11L, 1L))
                .willReturn(Optional.of(parent));

        assertThatThrownBy(() -> commentService.createComment(1L, 2L,
                new CommentRequest("불가 댓글", 11L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.NESTED_REPLY_NOT_ALLOWED);
    }

    @Test
    @DisplayName("다른 Spirit의 parentId로 댓글 작성 시 COMMENT_NOT_FOUND")
    void createComment_wrongSpiritParent_throwsNotFound() {
        given(spiritRepository.findByIdAndStatus(1L, SpiritStatus.ACTIVE))
                .willReturn(Optional.of(spirit));
        given(userRepository.getByIdOrThrow(1L)).willReturn(owner);
        given(commentRepository.findByIdAndSpiritId(99L, 1L))
                .willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.createComment(1L, 1L,
                new CommentRequest("잘못된 부모", 99L)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.COMMENT_NOT_FOUND);
    }

    // ── 댓글 수정 ─────────────────────────────────────────

    @Test
    @DisplayName("본인 댓글 정상 수정")
    void updateComment_owner_success() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "원본 내용");

        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(comment));

        CommentResponse response = commentService.updateComment(1L, 10L, 1L,
                new UpdateCommentRequest("수정된 내용"));

        assertThat(response.content()).isEqualTo("수정된 내용");
    }

    @Test
    @DisplayName("타인 댓글 수정 시 COMMENT_ACCESS_DENIED 예외")
    void updateComment_notOwner_throwsAccessDenied() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "원본 내용");

        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.updateComment(1L, 10L, 2L,
                new UpdateCommentRequest("수정 시도")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.COMMENT_ACCESS_DENIED);
    }

    // ── 댓글 삭제 ─────────────────────────────────────────

    @Test
    @DisplayName("본인 댓글 삭제")
    void deleteComment_owner_success() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "내용");

        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(comment));

        commentService.deleteComment(1L, 10L, 1L, Role.MEMBER);

        assertThat(comment.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("관리자는 타인 댓글 삭제 가능")
    void deleteComment_admin_canDeleteOthers() {
        User admin = User.builder()
                .email("admin@test.com").nickname("관리자").role(Role.ADMIN).build();
        ReflectionTestUtils.setField(admin, "id", 99L);

        CommunityComment comment = buildComment(10L, spirit, owner, null, "내용");

        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(comment));

        commentService.deleteComment(1L, 10L, 99L, Role.ADMIN);

        assertThat(comment.getDeletedAt()).isNotNull();
    }

    @Test
    @DisplayName("타인 댓글 삭제 시 COMMENT_ACCESS_DENIED 예외")
    void deleteComment_notOwnerNotAdmin_throwsAccessDenied() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "내용");

        given(commentRepository.findByIdAndSpiritId(10L, 1L))
                .willReturn(Optional.of(comment));

        assertThatThrownBy(() -> commentService.deleteComment(1L, 10L, 2L, Role.MEMBER))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.COMMENT_ACCESS_DENIED);
    }

    // ── 좋아요 토글 ───────────────────────────────────────

    @Test
    @DisplayName("좋아요 추가")
    void toggleLike_add() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "내용");

        given(commentRepository.findById(10L)).willReturn(Optional.of(comment));
        given(userRepository.getByIdOrThrow(2L)).willReturn(other);
        given(commentLikeRepository.existsByCommentIdAndUserId(10L, 2L)).willReturn(false);
        given(commentLikeRepository.save(any())).willReturn(
                CommentLike.builder().comment(comment).user(other).build());

        commentService.toggleLike(10L, 2L);

        assertThat(comment.getLikeCount()).isEqualTo(1);
        verify(commentLikeRepository).save(any(CommentLike.class));
    }

    @Test
    @DisplayName("좋아요 취소 (토글)")
    void toggleLike_cancel() {
        CommunityComment comment = buildComment(10L, spirit, owner, null, "내용");
        ReflectionTestUtils.setField(comment, "likeCount", 3);

        given(commentRepository.findById(10L)).willReturn(Optional.of(comment));
        given(userRepository.getByIdOrThrow(2L)).willReturn(other);
        given(commentLikeRepository.existsByCommentIdAndUserId(10L, 2L)).willReturn(true);

        commentService.toggleLike(10L, 2L);

        assertThat(comment.getLikeCount()).isEqualTo(2);
        verify(commentLikeRepository).deleteByCommentIdAndUserId(10L, 2L);
        verify(commentLikeRepository, never()).save(any());
    }

    @Test
    @DisplayName("존재하지 않는 댓글 좋아요 시 COMMENT_NOT_FOUND 예외")
    void toggleLike_commentNotFound_throwsException() {
        given(commentRepository.findById(999L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> commentService.toggleLike(999L, 1L))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.COMMENT_NOT_FOUND);
    }

    // ── Helper ────────────────────────────────────────────

    private CommunityComment buildComment(Long id, Spirit spirit, User user,
                                          CommunityComment parent, String content) {
        CommunityComment comment = CommunityComment.builder()
                .spirit(spirit)
                .user(user)
                .parent(parent)
                .content(content)
                .build();
        ReflectionTestUtils.setField(comment, "id", id);
        return comment;
    }
}
