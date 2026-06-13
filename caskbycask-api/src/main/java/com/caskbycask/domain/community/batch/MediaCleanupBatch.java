package com.caskbycask.domain.community.batch;

import com.caskbycask.domain.byob.repository.ByobRepository;
import com.caskbycask.domain.community.entity.PostImage;
import com.caskbycask.domain.community.entity.PostVideo;
import com.caskbycask.domain.community.repository.PostImageRepository;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.community.repository.PostVideoRepository;
import com.caskbycask.domain.draft.repository.ContentDraftRepository;
import com.caskbycask.global.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 미사용(고아) 이미지·동영상 정기 정리 배치.
 *
 * <p>정리 대상은 "게시글 저장/삭제(또는 임시저장·BYOB 작성)를 거쳐 더 이상 어디에서도 쓰이지 않는" 파일이다.
 * 사용자가 에디터에서 이미지를 지웠다가 저장을 안 할 수도 있으므로(=업로드 직후 상태), 업로드 후
 * 유예기간(graceHours)이 지난 것만 후보로 삼는다.
 *
 * <p><b>[안전 설계]</b> {@code is_used} 플래그만 신뢰하지 않는다. 플래그는 정상 게시글 경로
 * (PostService.syncImageUsage)에서만 갱신되며, BYOB 처럼 동일 업로더를 쓰면서 syncImageUsage 를
 * 거치지 않는 경로의 미디어는 화면에 표시 중이어도 {@code is_used=false} 로 남는다.
 * 따라서 삭제 직전에 실제 콘텐츠(게시글·임시저장·BYOB) 본문 참조를 교차검증하여,
 * 어디에도 박혀있지 않은 파일만 삭제한다. (savedFileName 은 UUID 라 오탐 없음)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MediaCleanupBatch {

    private final PostImageRepository postImageRepository;
    private final PostVideoRepository postVideoRepository;
    private final PostRepository postRepository;
    private final ContentDraftRepository contentDraftRepository;
    private final ByobRepository byobRepository;
    private final FileStorageService fileStorageService;

    // 업로드 후 어떤 콘텐츠(게시글/임시저장/BYOB)에도 박히지 않은 채 이 시간이 지나면 정리 후보.
    // 기본 48시간 — 작성 중(저장 전) 세션을 충분히 보호.
    @Value("${storage.media-cleanup.grace-hours:48}")
    private long graceHours;

    // 매일 새벽 4시 30분 실행 — 고아 이미지/동영상 Hard Delete
    @Scheduled(cron = "0 30 4 * * *")
    @Transactional
    public void cleanupOrphanMedia() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(graceHours);

        int deletedImages = cleanupOrphanImages(cutoff);
        int deletedVideos = cleanupOrphanVideos(cutoff);

        log.info("고아 미디어 정리 완료 — 기준: {}, 삭제 이미지: {}건, 동영상: {}건",
                cutoff, deletedImages, deletedVideos);
    }

    private int cleanupOrphanImages(LocalDateTime cutoff) {
        List<PostImage> candidates = postImageRepository.findByIsUsedFalseAndCreatedAtBefore(cutoff);
        int deleted = 0;
        for (PostImage img : candidates) {
            if (isReferenced(img.getSavedFileName())) continue; // 어딘가 사용 중 → 보존
            try {
                fileStorageService.delete(img.getSavedFileName(), img.getSubPath());
                postImageRepository.delete(img);
                deleted++;
            } catch (Exception e) {
                log.warn("고아 이미지 삭제 실패 (무시): {}", img.getSavedFileName(), e);
            }
        }
        return deleted;
    }

    private int cleanupOrphanVideos(LocalDateTime cutoff) {
        List<PostVideo> candidates = postVideoRepository.findByIsUsedFalseAndCreatedAtBefore(cutoff);
        int deleted = 0;
        for (PostVideo video : candidates) {
            if (isReferenced(video.getSavedFileName())) continue; // 어딘가 사용 중 → 보존
            try {
                fileStorageService.delete(video.getSavedFileName(), video.getSubPath());
                postVideoRepository.delete(video);
                deleted++;
            } catch (Exception e) {
                log.warn("고아 동영상 삭제 실패 (무시): {}", video.getSavedFileName(), e);
            }
        }
        return deleted;
    }

    /** 살아있는 콘텐츠(게시글·임시저장·BYOB) 본문에 파일명이 박혀 있으면 사용 중으로 간주. */
    private boolean isReferenced(String savedFileName) {
        return postRepository.existsByContentContaining(savedFileName)
                || contentDraftRepository.existsByContentContaining(savedFileName)
                || byobRepository.existsByContentContaining(savedFileName);
    }
}
