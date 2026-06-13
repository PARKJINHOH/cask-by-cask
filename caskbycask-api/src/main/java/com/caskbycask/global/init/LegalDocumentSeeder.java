package com.caskbycask.global.init;

import com.caskbycask.domain.legal.entity.LegalDocument;
import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import com.caskbycask.domain.legal.repository.LegalDocumentRepository;
import com.caskbycask.domain.legal.support.LegalDocumentTemplate;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 약관·개인정보 처리방침 기본값 시더.
 *
 * <p>해당 타입의 문서가 DB에 하나도 없을 때만 {@link LegalDocumentTemplate} 기본 양식을
 * v1.0 활성본으로 1회 시드한다(멱등). 이미 등록된 버전이 있으면 아무 것도 하지 않는다.</p>
 *
 * <p>Flyway 가 꺼진 local 을 포함한 모든 환경에서, 스키마 준비 후 실행되므로 안전하다.
 * 운영에서 관리자가 직접 등록하지 않아도 공개 페이지가 항상 활성본을 갖도록 보장한다.</p>
 */
@Slf4j
@Order(3)
@Component
@RequiredArgsConstructor
public class LegalDocumentSeeder implements ApplicationRunner {

    private final LegalDocumentRepository legalDocumentRepository;
    private final HtmlSanitizer htmlSanitizer;

    @Override
    public void run(ApplicationArguments args) {
        seedIfMissing(LegalDocumentType.TERMS, LegalDocumentTemplate.TERMS_HTML);
        seedIfMissing(LegalDocumentType.PRIVACY_POLICY, LegalDocumentTemplate.PRIVACY_HTML);
    }

    private void seedIfMissing(LegalDocumentType type, String html) {
        if (legalDocumentRepository.existsByType(type)) {
            return;
        }
        String content = html.strip();
        String sanitized = htmlSanitizer.sanitizeLegal(content);

        LegalDocument doc = LegalDocument.builder()
                .type(type)
                .version(LegalDocumentTemplate.DEFAULT_VERSION)
                .content(content)
                .contentSanitized(sanitized)
                .isActive(true)
                .build();
        legalDocumentRepository.save(doc);
        log.info("[LegalDocumentSeeder] {} 기본 약관({}) 시드 완료", type, LegalDocumentTemplate.DEFAULT_VERSION);
    }
}
