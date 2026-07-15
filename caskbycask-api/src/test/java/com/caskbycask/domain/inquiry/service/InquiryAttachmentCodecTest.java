package com.caskbycask.domain.inquiry.service;

import com.caskbycask.domain.inquiry.entity.InquiryAttachmentMetadata;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InquiryAttachmentCodecTest {

    private final InquiryAttachmentCodec codec = new InquiryAttachmentCodec(new ObjectMapper());

    @Test
    void encodeAndDecode_preservesAttachmentMetadata() {
        InquiryAttachmentMetadata attachment = new InquiryAttachmentMetadata(
                "제휴 제안서.pdf",
                "file-key.pdf",
                "inquiries/202607",
                "application/pdf",
                1024L
        );

        assertThat(codec.decode(codec.encode(List.of(attachment))))
                .containsExactly(attachment);
    }

    @Test
    void decode_convertsLegacyCommaSeparatedImageUrls() {
        List<InquiryAttachmentMetadata> attachments = codec.decode(
                "/api/inquiries/images/first.webp,/api/inquiries/images/second.png"
        );

        assertThat(attachments)
                .extracting(InquiryAttachmentMetadata::storedFilename)
                .containsExactly("first.webp", "second.png");
        assertThat(attachments)
                .allSatisfy(attachment -> assertThat(attachment.subPath()).isNull());
    }
}
