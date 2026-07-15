package com.caskbycask.domain.inquiry.service;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InquiryAttachmentValidatorTest {

    private final InquiryAttachmentValidator validator = new InquiryAttachmentValidator();

    @Test
    void validate_acceptsPdfAndDetectsServerContentType() {
        MockMultipartFile pdf = new MockMultipartFile(
                "attachments", "proposal.pdf", "application/octet-stream", "%PDF-1.7 test".getBytes()
        );

        List<InquiryAttachmentValidator.ValidatedAttachment> result = validator.validate(List.of(pdf));

        assertThat(result).singleElement().satisfies(file -> {
            assertThat(file.originalFilename()).isEqualTo("proposal.pdf");
            assertThat(file.extension()).isEqualTo("pdf");
            assertThat(file.contentType()).isEqualTo("application/pdf");
        });
    }

    @Test
    void validate_rejectsExecutableRenamedAsPdf() {
        MockMultipartFile spoofed = new MockMultipartFile(
                "attachments", "malware.pdf", "application/pdf", new byte[]{'M', 'Z', 0, 0}
        );

        assertThatThrownBy(() -> validator.validate(List.of(spoofed)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INQUIRY_INVALID_ATTACHMENT_FORMAT);
    }

    @Test
    void validate_acceptsDocxPackage() throws IOException {
        MockMultipartFile docx = new MockMultipartFile(
                "attachments", "proposal.docx", "application/zip",
                zipWithEntries("[Content_Types].xml", "word/document.xml")
        );

        assertThat(validator.validate(List.of(docx)))
                .singleElement()
                .extracting(InquiryAttachmentValidator.ValidatedAttachment::extension)
                .isEqualTo("docx");
    }

    @Test
    void validate_rejectsMoreThanThreeFiles() {
        MockMultipartFile text = new MockMultipartFile("attachments", "note.txt", "text/plain", "text".getBytes());

        assertThatThrownBy(() -> validator.validate(List.of(text, text, text, text)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INQUIRY_TOO_MANY_ATTACHMENTS);
    }

    private byte[] zipWithEntries(String... names) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            for (String name : names) {
                zip.putNextEntry(new ZipEntry(name));
                zip.write("test".getBytes());
                zip.closeEntry();
            }
        }
        return output.toByteArray();
    }
}
