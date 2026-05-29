package com.drinkindex.domain.draft.service;

import com.drinkindex.domain.draft.dto.DraftResponse;
import com.drinkindex.domain.draft.dto.SaveDraftRequest;
import com.drinkindex.domain.draft.entity.ContentDraft;
import com.drinkindex.domain.draft.repository.ContentDraftRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContentDraftService {

    // draftKey(작성 화면) 당 최대 보관 개수
    private static final int MAX_DRAFTS_PER_KEY = 10;
    private static final int PREVIEW_MAX_LENGTH = 120;

    private final ContentDraftRepository contentDraftRepository;
    private final UserRepository userRepository;
    private final HtmlSanitizer htmlSanitizer;

    /**
     * 임시저장 저장.
     * - id 가 있으면(목록에서 불러온 글 편집 중) 해당 항목 갱신
     * - id 가 없으면 새 항목 생성 (draftKey 당 {@value #MAX_DRAFTS_PER_KEY}개 초과 시 차단)
     */
    @Transactional
    public DraftResponse save(Long userId, SaveDraftRequest request) {
        if (request.getId() != null) {
            ContentDraft draft = contentDraftRepository
                    .findByIdAndUserId(request.getId(), userId)
                    .orElseThrow(() -> new CustomException(ErrorCode.DRAFT_NOT_FOUND));
            draft.update(request.getTitle(), request.getContent(), request.getMeta());
            return DraftResponse.detail(draft);
        }

        long count = contentDraftRepository.countByUserIdAndDraftKey(userId, request.getDraftKey());
        if (count >= MAX_DRAFTS_PER_KEY) {
            throw new CustomException(ErrorCode.DRAFT_LIMIT_EXCEEDED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        ContentDraft saved = contentDraftRepository.save(ContentDraft.builder()
                .user(user)
                .draftKey(request.getDraftKey())
                .title(request.getTitle())
                .content(request.getContent())
                .meta(request.getMeta())
                .build());
        return DraftResponse.detail(saved);
    }

    /** 작성 화면(draftKey)별 임시저장 목록 (content 제외, preview 포함) */
    @Transactional(readOnly = true)
    public List<DraftResponse> list(Long userId, String draftKey) {
        return contentDraftRepository
                .findByUserIdAndDraftKeyOrderByUpdatedAtDesc(userId, draftKey)
                .stream()
                .map(d -> DraftResponse.listItem(d, buildPreview(d.getContent())))
                .toList();
    }

    /** 임시저장 단건 조회(불러오기) — content·meta 포함 */
    @Transactional(readOnly = true)
    public DraftResponse getOne(Long userId, Long id) {
        ContentDraft draft = contentDraftRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.DRAFT_NOT_FOUND));
        return DraftResponse.detail(draft);
    }

    /** 임시저장 삭제 (소유 검증) */
    @Transactional
    public void delete(Long userId, Long id) {
        ContentDraft draft = contentDraftRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new CustomException(ErrorCode.DRAFT_NOT_FOUND));
        contentDraftRepository.delete(draft);
    }

    private String buildPreview(String content) {
        String plain = htmlSanitizer.sanitizeToPlainText(content);
        if (plain == null || plain.isBlank()) {
            return "";
        }
        return plain.length() > PREVIEW_MAX_LENGTH
                ? plain.substring(0, PREVIEW_MAX_LENGTH) + "…"
                : plain;
    }
}
