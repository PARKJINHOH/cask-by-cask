package com.drinkindex.domain.legal.service;

import com.drinkindex.domain.legal.dto.CreateLegalDocumentRequest;
import com.drinkindex.domain.legal.dto.LegalDocumentListItem;
import com.drinkindex.domain.legal.dto.LegalDocumentResponse;
import com.drinkindex.domain.legal.dto.UpdateLegalDocumentRequest;
import com.drinkindex.domain.legal.entity.LegalDocument;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import com.drinkindex.domain.legal.repository.LegalDocumentRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.util.HtmlSanitizer;
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
        String sanitized = htmlSanitizer.sanitizeLegal(request.content());
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
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        String sanitized = htmlSanitizer.sanitizeLegal(request.content());

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
