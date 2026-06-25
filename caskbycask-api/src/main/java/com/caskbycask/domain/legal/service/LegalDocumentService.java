package com.caskbycask.domain.legal.service;

import com.caskbycask.domain.legal.dto.CreateLegalDocumentRequest;
import com.caskbycask.domain.legal.dto.LegalDocumentListItem;
import com.caskbycask.domain.legal.dto.LegalDocumentResponse;
import com.caskbycask.domain.legal.dto.UpdateLegalDocumentRequest;
import com.caskbycask.domain.legal.entity.LegalDocument;
import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import com.caskbycask.domain.legal.repository.LegalDocumentRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LegalDocumentService {

    private final LegalDocumentRepository legalDocumentRepository;
    private final UserRepository userRepository;
    private final HtmlSanitizer htmlSanitizer;

    @Transactional(readOnly = true)
    public LegalDocumentResponse getLatest(LegalDocumentType type) {
        LegalDocument doc = legalDocumentRepository.findByTypeAndIsActiveTrue(type)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));
        return LegalDocumentResponse.publicFrom(doc);
    }

    @Transactional(readOnly = true)
    public LegalDocumentResponse getById(Long id) {
        LegalDocument doc = legalDocumentRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));
        return LegalDocumentResponse.publicFrom(doc);
    }

    @Transactional(readOnly = true)
    public LegalDocumentResponse getByIdForAdmin(Long id) {
        LegalDocument doc = legalDocumentRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));
        return LegalDocumentResponse.from(doc);
    }

    @Transactional
    public LegalDocumentResponse update(Long id, UpdateLegalDocumentRequest request) {
        LegalDocument doc = legalDocumentRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));
        // [법적 효력] 사용자가 동의한 시점의 약관 내용은 사후에 변경되면 안 된다.
        //   활성(적용 중) 문서는 in-place 수정을 금지하고, 변경이 필요하면 새 버전을 만들어 활성화한다.
        //   (가입 시 version 만 스냅샷되므로, 활성 문서의 content 가 바뀌면 동의 시점 내용을 재현할 수 없음)
        if (Boolean.TRUE.equals(doc.getIsActive())) {
            throw new CustomException(ErrorCode.CANNOT_EDIT_ACTIVE_LEGAL_DOCUMENT);
        }
        String sanitized = htmlSanitizer.sanitize(request.content(), true);
        doc.update(request.version(), request.content(), sanitized);
        return LegalDocumentResponse.from(doc);
    }

    @Transactional(readOnly = true)
    public Page<LegalDocumentListItem> getAllVersions(LegalDocumentType type, int page, int size) {
        return legalDocumentRepository
                .findAllByTypeOrderByCreatedAtDesc(type, PageRequest.of(page, size))
                .map(LegalDocumentListItem::from);
    }

    @Transactional
    public LegalDocumentResponse create(CreateLegalDocumentRequest request, Long authorId) {
        User author = userRepository.getByIdOrThrow(authorId);

        String sanitized = htmlSanitizer.sanitize(request.content(), true);

        LegalDocument doc = LegalDocument.builder()
                .type(request.type())
                .version(request.version())
                .content(request.content())
                .contentSanitized(sanitized)
                .author(author)
                .build();

        return LegalDocumentResponse.from(legalDocumentRepository.save(doc));
    }

    @Transactional
    public LegalDocumentResponse activate(Long id) {
        LegalDocument doc = legalDocumentRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));

        legalDocumentRepository.deactivateAllByType(doc.getType());
        doc.activate();

        return LegalDocumentResponse.from(doc);
    }

    @Transactional
    public void delete(Long id) {
        LegalDocument doc = legalDocumentRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.LEGAL_DOCUMENT_NOT_FOUND));
        if (Boolean.TRUE.equals(doc.getIsActive())) {
            throw new CustomException(ErrorCode.CANNOT_DELETE_ACTIVE_LEGAL_DOCUMENT);
        }
        legalDocumentRepository.delete(doc);
    }
}
