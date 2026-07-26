package com.caskbycask.domain.tastetree.service;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.domain.tastetree.dto.TasteTreeEngagementResponse;
import com.caskbycask.domain.tastetree.dto.TasteTreeImageFile;
import com.caskbycask.domain.tastetree.dto.TasteTreeContent;
import com.caskbycask.domain.tastetree.dto.TasteTreeFactsUpdateRequest;
import com.caskbycask.domain.tastetree.dto.TasteTreeSaveRequest;
import com.caskbycask.domain.tastetree.entity.TasteTree;
import com.caskbycask.domain.tastetree.entity.TasteTreeDailyView;
import com.caskbycask.domain.tastetree.entity.TasteTreeVersion;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeVersionStatus;
import com.caskbycask.domain.tastetree.repository.*;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import com.caskbycask.global.storage.ValidatedImageUploader;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.inOrder;

@ExtendWith(MockitoExtension.class)
class TasteTreeServiceTest {

    @Mock private TasteTreeRepository treeRepository;
    @Mock private TasteTreeVersionRepository versionRepository;
    @Mock private TasteTreeBookmarkRepository bookmarkRepository;
    @Mock private TasteTreeLikeRepository likeRepository;
    @Mock private TasteTreeDailyViewRepository dailyViewRepository;
    @Mock private TasteTreeImageRepository imageRepository;
    @Mock private TasteTreeFactRepository factRepository;
    @Mock private UserRepository userRepository;
    @Mock private SpiritRepository spiritRepository;
    @Mock private SpiritImageRepository spiritImageRepository;
    @Mock private ValidatedImageUploader validatedImageUploader;
    @Mock private FileStorageService fileStorageService;

    private TasteTreeService service;

    @BeforeEach
    void setUp() {
        service = new TasteTreeService(treeRepository, versionRepository, bookmarkRepository, likeRepository,
                dailyViewRepository, imageRepository, factRepository, userRepository, spiritRepository, spiritImageRepository,
                validatedImageUploader, fileStorageService, new ObjectMapper());
    }

    @Test
    void creatorCannotLikeOwnTree() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion published = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findByShareKeyForUpdate("mine")).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(11L);
        given(tree.getModerationStatus()).willReturn(TasteTreeModerationStatus.VISIBLE);
        given(tree.isOwnedBy(7L)).willReturn(true);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                11L, TasteTreeVersionStatus.PUBLISHED)).willReturn(Optional.of(published));

        assertThatThrownBy(() -> service.like("mine", 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_ACCESS_DENIED));
        verify(likeRepository, never()).save(any());
    }

    @Test
    void sameViewerIsCountedOnlyOncePerDay() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion published = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findByShareKeyForUpdate("public")).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(12L);
        given(tree.getModerationStatus()).willReturn(TasteTreeModerationStatus.VISIBLE);
        given(tree.getLikeCount()).willReturn(3);
        given(tree.getViewCount()).willReturn(9);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                12L, TasteTreeVersionStatus.PUBLISHED)).willReturn(Optional.of(published));
        given(dailyViewRepository.existsByTreeIdAndViewerKeyHashAndViewedDate(
                any(), any(), any(LocalDate.class))).willReturn(true);

        TasteTreeEngagementResponse response = service.recordView("public", null, "guest-browser");

        assertThat(response.viewCount()).isEqualTo(9);
        verify(tree, never()).increaseViewCount();
        verify(dailyViewRepository, never()).save(any(TasteTreeDailyView.class));
    }

    @Test
    void publishRejectsLegacyInfoNode() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findOwnedById(13L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(13L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                13L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":2,"nodes":[
                  {"key":"start","type":"START","titleKo":"시작","positionX":0,"positionY":0},
                  {"key":"info","type":"INFO","titleKo":"게시할 수 없는 안내","positionX":0,"positionY":200}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"info","labelKo":"선택","sortOrder":0}
                ]}
                """);

        assertThatThrownBy(() -> service.publish(13L, 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        verify(draft, never()).publish();
    }

    @Test
    void publishRejectsUnknownConnectionHandle() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findOwnedById(14L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(14L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                14L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":3,"nodes":[
                  {"key":"start","type":"START","titleKo":"시작","positionX":0,"positionY":0},
                  {"key":"whisky","type":"WHISKY","titleKo":"도착","positionX":0,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"테스트 위스키"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"whisky","labelKo":"선택","sortOrder":0,
                   "sourceHandle":"source-diagonal","targetHandle":"target-top"}
                ]}
                """);

        assertThatThrownBy(() -> service.publish(14L, 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        verify(draft, never()).publish();
    }

    @Test
    void publishAcceptsRegisteredNonWhiskySpiritWithNextSpirit() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        Spirit wine = org.mockito.Mockito.mock(Spirit.class);
        given(treeRepository.findOwnedById(16L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(16L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                16L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":5,"nodes":[
                  {"key":"start","type":"START","titleKo":"시작","promptKo":"어느 쪽이 좋으세요?","positionX":0,"positionY":0},
                  {"key":"spirit","type":"WHISKY","titleKo":"도착","positionX":0,"positionY":200,
                   "promptKo":"어떤 방향으로 이어갈까요?","width":220,"height":380,
                   "whisky":{"source":"REGISTERED","spiritId":77}},
                  {"key":"stronger","type":"WHISKY","titleKo":"더 강한 주류","positionX":0,"positionY":600,
                   "whisky":{"source":"CUSTOM","nameKo":"더 강한 주류"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"spirit","labelKo":"선택","sortOrder":0},
                  {"key":"edge-2","sourceNodeKey":"spirit","targetNodeKey":"stronger","labelKo":"좀 더 강한 맛","sortOrder":0,
                   "descriptionKo":"도수가 높고 묵직한 주류로 이어집니다.","labelPosition":0.72,"lineType":"STRAIGHT"}
                ]}
                """);
        given(wine.getId()).willReturn(77L);
        given(wine.getStatus()).willReturn(SpiritStatus.ACTIVE);
        org.mockito.Mockito.lenient().when(wine.getCategory()).thenReturn(SpiritCategory.WINE);
        given(wine.getNameKo()).willReturn("테스트 와인");
        given(spiritRepository.findAllById(any())).willReturn(List.of(wine));
        given(spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(any())).willReturn(List.of());

        assertThatCode(() -> service.publish(16L, 7L)).doesNotThrowAnyException();
        verify(draft).publish();
    }

    @Test
    void publishAcceptsRegisteredSpiritOnStartNode() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        Spirit startSpirit = org.mockito.Mockito.mock(Spirit.class);
        given(treeRepository.findOwnedById(17L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(17L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                17L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":8,"nodes":[
                  {"key":"start","type":"START","titleKo":"첫 주류","positionX":0,"positionY":0,
                   "whisky":{"source":"REGISTERED","spiritId":88}},
                  {"key":"next","type":"WHISKY","titleKo":"다음 주류","positionX":0,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"다음 주류"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"next","labelKo":"다음","sortOrder":0}
                ]}
                """);
        given(startSpirit.getId()).willReturn(88L);
        given(startSpirit.getStatus()).willReturn(SpiritStatus.ACTIVE);
        given(startSpirit.getNameKo()).willReturn("시작 위스키");
        given(spiritRepository.findAllById(any())).willReturn(List.of(startSpirit));
        given(spiritImageRepository.findBySpiritIdInAndIsPrimaryTrue(any())).willReturn(List.of());

        assertThatCode(() -> service.publish(17L, 7L)).doesNotThrowAnyException();
        verify(draft).publish();
    }

    @Test
    void publishAcceptsQuestionNodeBetweenSpirits() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findOwnedById(18L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(18L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                18L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":9,"nodes":[
                  {"key":"start","type":"START","titleKo":"시작","promptKo":"어떤 향을 좋아하시나요?","positionX":0,"positionY":0},
                  {"key":"question","type":"CHOICE","titleKo":"이 위스키에서 어떤 점이 좋았나요?","positionX":0,"positionY":200},
                  {"key":"spirit","type":"WHISKY","titleKo":"다음 주류","positionX":0,"positionY":400,
                   "whisky":{"source":"CUSTOM","nameKo":"다음 주류"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"question","labelKo":"향으로 고르기","sortOrder":0},
                  {"key":"edge-2","sourceNodeKey":"question","targetNodeKey":"spirit","labelKo":"달콤한 향","sortOrder":0}
                ],"tipsKo":["스카치위스키는 최소 3년간 오크통에서 숙성해야 합니다."]}
                """);

        assertThatCode(() -> service.publish(18L, 7L)).doesNotThrowAnyException();
        verify(draft).publish();
    }

    @Test
    void publishAcceptsConnectedMainNodeWithoutSpiritOrQuestion() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findOwnedById(19L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(19L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                19L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":9,"nodes":[
                  {"key":"start","type":"START","titleKo":"시작","positionX":0,"positionY":0},
                  {"key":"left","type":"WHISKY","titleKo":"왼쪽 주류","positionX":-200,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"왼쪽 주류"}},
                  {"key":"right","type":"WHISKY","titleKo":"오른쪽 주류","positionX":200,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"오른쪽 주류"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"left","labelKo":"왼쪽","sortOrder":0},
                  {"key":"edge-2","sourceNodeKey":"start","targetNodeKey":"right","labelKo":"오른쪽","sortOrder":1}
                ]}
                """);

        assertThatCode(() -> service.publish(19L, 7L)).doesNotThrowAnyException();
        verify(draft).publish();
    }

    @Test
    void publishRejectsMainSpiritBranchWithoutQuestion() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        TasteTreeVersion draft = org.mockito.Mockito.mock(TasteTreeVersion.class);
        given(treeRepository.findOwnedById(20L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(20L);
        given(versionRepository.findFirstByTreeIdAndStatusOrderByVersionNumberDesc(
                20L, TasteTreeVersionStatus.DRAFT)).willReturn(Optional.of(draft));
        given(draft.getContentJson()).willReturn("""
                {"schemaVersion":9,"nodes":[
                  {"key":"start","type":"START","titleKo":"첫 주류","positionX":0,"positionY":0,
                   "whisky":{"source":"CUSTOM","nameKo":"첫 주류"}},
                  {"key":"left","type":"WHISKY","titleKo":"왼쪽 주류","positionX":-200,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"왼쪽 주류"}},
                  {"key":"right","type":"WHISKY","titleKo":"오른쪽 주류","positionX":200,"positionY":200,
                   "whisky":{"source":"CUSTOM","nameKo":"오른쪽 주류"}}
                ],"edges":[
                  {"key":"edge-1","sourceNodeKey":"start","targetNodeKey":"left","labelKo":"왼쪽","sortOrder":0},
                  {"key":"edge-2","sourceNodeKey":"start","targetNodeKey":"right","labelKo":"오른쪽","sortOrder":1}
                ]}
                """);

        assertThatThrownBy(() -> service.publish(20L, 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        verify(draft, never()).publish();
    }

    @Test
    void updateFactsTrimsAndReplacesTheCommonList() {
        List<String> updated = service.updateFacts(new TasteTreeFactsUpdateRequest(
                List.of("  첫 번째 상식입니다.  ", "두 번째 상식입니다.")));

        assertThat(updated).containsExactly("첫 번째 상식입니다.", "두 번째 상식입니다.");
        verify(factRepository).deleteAllInBatch();
        verify(factRepository).flush();
        verify(factRepository).saveAll(any());
    }

    @Test
    void draftRejectsNodeTextOverRecommendedLimits() {
        TasteTreeContent.Node longTitleNode = nodeWithText("가".repeat(51), null);
        TasteTreeContent.Node longDescriptionNode = nodeWithText("시작", "가".repeat(201));

        assertThatThrownBy(() -> service.create(new TasteTreeSaveRequest(
                "테스트 트리", null, new TasteTreeContent(9, List.of(longTitleNode), List.of(), List.of())), 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        assertThatThrownBy(() -> service.create(new TasteTreeSaveRequest(
                "테스트 트리", null, new TasteTreeContent(9, List.of(longDescriptionNode), List.of(), List.of())), 7L))
                .isInstanceOfSatisfying(CustomException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.TASTE_TREE_INVALID_STRUCTURE));
        verify(userRepository, never()).getByIdOrThrow(any());
    }

    private TasteTreeContent.Node nodeWithText(String titleKo, String descriptionKo) {
        return new TasteTreeContent.Node(
                "start", TasteTreeContent.NodeType.START, titleKo, null, descriptionKo, null,
                null, null, 0, 0, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void deleteRemovesImageRowsBeforeTreeAndDeletesFilesAfterward() {
        TasteTree tree = org.mockito.Mockito.mock(TasteTree.class);
        given(treeRepository.findOwnedById(15L, 7L)).willReturn(Optional.of(tree));
        given(tree.getId()).willReturn(15L);
        given(imageRepository.findFilesByTreeId(15L)).willReturn(List.of(
                new TasteTreeImageFile("saved.webp", "taste-tree/2026/07", "image/webp")));

        service.delete(15L, 7L);

        var order = inOrder(imageRepository, treeRepository);
        order.verify(imageRepository).deleteAllByTreeId(15L);
        order.verify(treeRepository).deleteById(15L);
        verify(fileStorageService).delete("saved.webp", "taste-tree/2026/07");
    }
}
