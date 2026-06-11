package com.drinkindex.domain.community.service;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.Post;
import com.drinkindex.domain.community.entity.Series;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.repository.PostRepository;
import com.drinkindex.domain.community.repository.SeriesRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SeriesService {

    private final SeriesRepository seriesRepository;
    private final PostRepository postRepository;
    private final UserRepository userRepository;

    // ═══════════════════════════════════════════
    // 조회
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public Page<SeriesResponse> getSeries(BoardType boardType, int page, int size) {
        return seriesRepository.findByBoardTypeOrderByCreatedAtDesc(boardType, PageRequest.of(page, size))
                .map(SeriesResponse::from);
    }

    @Transactional(readOnly = true)
    public SeriesDetailResponse getSeriesDetail(Long seriesId) {
        Series series = findSeries(seriesId);
        List<Post> posts = postRepository.findBySeriesIdOrderBySeriesOrderAsc(seriesId);
        return new SeriesDetailResponse(series, posts);
    }

    // ═══════════════════════════════════════════
    // 생성 / 수정 / 삭제
    // ═══════════════════════════════════════════

    @Transactional
    public SeriesResponse createSeries(CreateSeriesRequest request, Long userId) {
        User author = findUser(userId);
        Series series = Series.builder()
                .author(author)
                .boardType(request.getBoardType())
                .title(request.getTitle())
                .description(request.getDescription())
                .build();
        return SeriesResponse.from(seriesRepository.save(series));
    }

    @Transactional
    public SeriesResponse updateSeries(Long seriesId, UpdateSeriesRequest request, Long userId) {
        Series series = findAndAuthorize(seriesId, userId);

        String newTitle = request.getTitle()       != null ? request.getTitle()       : series.getTitle();
        String newDesc  = request.getDescription() != null ? request.getDescription() : series.getDescription();
        series.update(newTitle, newDesc);
        return SeriesResponse.from(series);
    }

    @Transactional
    public void deleteSeries(Long seriesId, Long userId) {
        Series series = findAndAuthorize(seriesId, userId);
        // 소속 게시글들의 series FK를 null로 처리 (게시글 삭제 아님)
        postRepository.unlinkAllFromSeries(seriesId);
        seriesRepository.delete(series);
    }

    // ═══════════════════════════════════════════
    // 게시글 추가 / 제거
    // ═══════════════════════════════════════════

    @Transactional
    public SeriesDetailResponse addPost(Long seriesId, Long postId, Long userId) {
        Series series = findAndAuthorize(seriesId, userId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        // 이미 다른 시리즈에 속하면 해제 후 재연결
        if (post.getSeries() != null && !post.getSeries().getId().equals(seriesId)) {
            Series oldSeries = post.getSeries();
            oldSeries.decrementPostCount();
            postRepository.unlinkFromSeries(postId);
        }

        if (post.getSeries() == null) {
            int nextOrder = postRepository.findMaxSeriesOrderBySeriesId(seriesId).orElse(0) + 1;
            post.assignToSeries(series, nextOrder);
            series.incrementPostCount();
        }

        return new SeriesDetailResponse(series, postRepository.findBySeriesIdOrderBySeriesOrderAsc(seriesId));
    }

    @Transactional
    public void removePost(Long seriesId, Long postId, Long userId) {
        Series series = findAndAuthorize(seriesId, userId);
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new CustomException(ErrorCode.POST_NOT_FOUND));

        if (post.getSeries() != null && post.getSeries().getId().equals(seriesId)) {
            postRepository.unlinkFromSeries(postId);
            series.decrementPostCount();
        }
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private Series findSeries(Long id) {
        return seriesRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.SERIES_NOT_FOUND));
    }

    private Series findAndAuthorize(Long seriesId, Long userId) {
        Series series = findSeries(seriesId);
        if (!series.getAuthor().getId().equals(userId)) {
            throw new CustomException(ErrorCode.SERIES_FORBIDDEN);
        }
        return series;
    }

    private User findUser(Long id) {
        return userRepository.getByIdOrThrow(id);
    }
}
