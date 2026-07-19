package com.caskbycask.domain.community.service;

import com.caskbycask.domain.community.entity.DeletedPost;
import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostImage;
import com.caskbycask.domain.community.entity.PostVideo;
import com.caskbycask.domain.community.entity.enums.PostStatus;
import com.caskbycask.domain.community.repository.DeletedPostRepository;
import com.caskbycask.domain.community.repository.PostCommentRepository;
import com.caskbycask.domain.community.repository.PostImageRepository;
import com.caskbycask.domain.community.repository.PostLikeRepository;
import com.caskbycask.domain.community.repository.PostReportRepository;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.community.repository.PostScrapRepository;
import com.caskbycask.domain.community.repository.PostVideoRepository;
import com.caskbycask.global.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostMoveService {

    private final DeletedPostRepository deletedPostRepository;
    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final PostImageRepository postImageRepository;
    private final PostVideoRepository postVideoRepository;
    private final PostScrapRepository postScrapRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostReportRepository postReportRepository;
    private final FileStorageService fileStorageService;

    /**
     * Post → deleted_posts 이동.
     * 1) DeletedPost 생성 및 저장
     * 2) 댓글의 post FK를 null로 처리 (댓글 레코드 유지)
     * 3) 연결 이미지 파일 물리 삭제
     * 4) Post 레코드 DB 삭제
     */
    @Transactional
    public DeletedPost moveToDeleted(Post post, Long deletedBy, String deleteReason) {
        // 1. DeletedPost 생성
        DeletedPost deletedPost = DeletedPost.builder()
                .originalPostId(post.getId())
                .boardType(post.getBoardType())
                .authorId(post.getAuthor().getId())
                .title(post.getTitle())
                .content(post.getContent())
                .contentSanitized(post.getContentSanitized())
                .deletedBy(deletedBy)
                .deleteReason(deleteReason)
                .deletedAt(LocalDateTime.now())
                .originalCreatedAt(post.getCreatedAt())
                .hashtags(new java.util.ArrayList<>(post.getHashtags()))
                .build();
        deletedPostRepository.save(deletedPost);

        // 2. 댓글의 post FK null 처리 (댓글 자체는 유지)
        postCommentRepository.clearPostReference(post.getId());

        // 2-1. 자식 레코드 일괄 삭제 (FK 위반 방지) — 스크랩/추천/신고
        postScrapRepository.deleteAllByPostId(post.getId());
        postLikeRepository.deleteAllByPostId(post.getId());
        postReportRepository.deleteAllByPostId(post.getId());

        // 3. 연결 이미지 파일 물리 삭제 (저장된 subPath 사용)
        List<PostImage> images = postImageRepository.findByPostId(post.getId());
        images.forEach(img -> {
            try {
                fileStorageService.delete(img.getSavedFileName(), img.getSubPath());
            } catch (Exception e) {
                log.warn("이미지 파일 삭제 실패 (무시): {}", img.getSavedFileName(), e);
            }
        });

        // 3-1. 연결 동영상 파일 물리 삭제 + 레코드 삭제.
        //   PostVideo 는 Post 와 cascade 관계가 아니므로(FK ON DELETE SET NULL) 명시적으로 정리한다.
        //   Post 삭제 전에 post_id 로 조회해야 함(삭제 후엔 SET NULL 로 연결이 끊김).
        List<PostVideo> videos = postVideoRepository.findByPostId(post.getId());
        videos.forEach(video -> {
            try {
                fileStorageService.delete(video.getSavedFileName(), video.getSubPath());
            } catch (Exception e) {
                log.warn("동영상 파일 삭제 실패 (무시): {}", video.getSavedFileName(), e);
            }
        });
        postVideoRepository.deleteAll(videos);

        // 4. Post 레코드 삭제 (cascade로 PostImage, Poll, PollOption 함께 삭제)
        postRepository.delete(post);
        return deletedPost;
    }
}
