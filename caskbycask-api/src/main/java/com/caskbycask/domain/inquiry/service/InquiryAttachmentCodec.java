package com.caskbycask.domain.inquiry.service;

import com.caskbycask.domain.inquiry.entity.InquiryAttachmentMetadata;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class InquiryAttachmentCodec {

    private static final TypeReference<List<InquiryAttachmentMetadata>> ATTACHMENT_LIST_TYPE =
            new TypeReference<>() {};

    private final ObjectMapper objectMapper;

    public String encode(List<InquiryAttachmentMetadata> attachments) {
        if (attachments == null || attachments.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("문의 첨부파일 메타데이터 직렬화에 실패했습니다.", e);
        }
    }

    public List<InquiryAttachmentMetadata> decode(String storedData) {
        if (storedData == null || storedData.isBlank()) return List.of();
        if (storedData.stripLeading().startsWith("[")) {
            try {
                return objectMapper.readValue(storedData, ATTACHMENT_LIST_TYPE);
            } catch (JsonProcessingException e) {
                log.warn("문의 첨부파일 메타데이터 파싱 실패", e);
                return List.of();
            }
        }

        // V42 이전에는 이미지 URL을 쉼표로 저장했다. 기존 운영 데이터도 관리자 다운로드가 가능하도록 변환한다.
        return Arrays.stream(storedData.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(this::fromLegacyUrl)
                .toList();
    }

    private InquiryAttachmentMetadata fromLegacyUrl(String url) {
        String storedFilename = url.substring(url.lastIndexOf('/') + 1);
        return new InquiryAttachmentMetadata(
                storedFilename,
                storedFilename,
                null,
                InquiryAttachmentValidator.contentTypeFor(storedFilename),
                0L
        );
    }
}
