package com.caskbycask.global.util;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * 업로드 이미지의 크기와 <b>실제 형식</b>을 검증한다.
 * <p>
 * 판별은 오직 파일 내용(Magic Bytes)으로 한다 — 확장자는 보지 않는다. 카톡을 거쳐 {@code .png} 로
 * 이름만 바뀐 JPEG, 확장자가 아예 없는 스크린샷, {@code .jfif} 같은 낯선 확장자가 모두 정상 업로드된다.
 * 확장자 스푸핑 방어는 저장 파일명을 {@code UUID + 판별된 포맷의 확장자} 로 새로 만드는 것으로 끝난다
 * (원본 이름은 경로에 쓰이지 않는다).
 * <p>
 * 거절할 때는 "왜"를 남긴다 — 지원하지 않는 포맷인지, 손상된 파일인지, HEIC·SVG 처럼 변환이
 * 불가능한 포맷인지를 각각 다른 {@link ErrorCode} 로 던져 사용자·관리자 알럿에 그대로 노출한다.
 */
@Component
public class NoticeImageValidator {

    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;

    /** SVG 인지 보려면 텍스트 앞부분을 조금 읽어야 해 헤더를 넉넉히 잡는다. */
    private static final int HEADER_SIZE = 64;

    private static final byte[] MAGIC_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] MAGIC_PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] MAGIC_GIF = {0x47, 0x49, 0x46, 0x38};       // "GIF8"
    private static final byte[] MAGIC_RIFF = {0x52, 0x49, 0x46, 0x46};      // "RIFF"
    private static final byte[] MAGIC_WEBP = {0x57, 0x45, 0x42, 0x50};      // "WEBP" (offset 8)
    private static final byte[] MAGIC_BMP = {0x42, 0x4D};                   // "BM"
    private static final byte[] MAGIC_FTYP = {0x66, 0x74, 0x79, 0x70};      // "ftyp" (offset 4)
    private static final byte[] MAGIC_TIFF_LE = {0x49, 0x49, 0x2A, 0x00};   // "II*\0"
    private static final byte[] MAGIC_TIFF_BE = {0x4D, 0x4D, 0x00, 0x2A};   // "MM\0*"

    // ISO-BMFF 브랜드(offset 8~11). 같은 컨테이너라 브랜드로만 AVIF 와 HEIC 를 가른다.
    private static final Set<String> AVIF_BRANDS = Set.of("avif", "avis");
    private static final Set<String> HEIC_BRANDS = Set.of(
            "heic", "heix", "heim", "heis", "hevc", "hevm", "hevs", "mif1", "msf1");

    /** 검증 결과 — 내용에서 판별한 포맷과 그 포맷에 맞춰 새로 만든 저장 파일명. */
    public record ValidatedImage(AllowedImageFormat format, String savedFileName) {
        public String mimeType() {
            return format.getMimeType();
        }
    }

    /**
     * 받지 못한 이유. 어떤 {@link ErrorCode} 로 돌려줄지는 도메인이 정한다 —
     * 공지는 {@code NOTICE_*}, 리뷰 사진은 {@code REVIEW_*} 를 쓰기 때문에
     * 판별 자체는 도메인 중립으로 두고 매핑만 각자 한다.
     */
    public enum Unsupported {
        /** 파일이 비었다 */
        EMPTY,
        /** 헤더조차 읽지 못했다 — 손상되었거나 전송이 끊겼다 */
        UNREADABLE,
        /** 아이폰 기본 포맷 — 서버에 디코더가 없다 */
        HEIC,
        /** 내부에 script 를 품을 수 있어(XSS) 의도적으로 제외한다 */
        SVG,
        /** 브라우저가 그리지 못하고 서버에도 디코더가 없다 */
        TIFF,
        /** 이미지가 아니거나 목록에 없는 포맷 */
        UNKNOWN
    }

    /**
     * 내용에서 판별한 포맷, 또는 받지 못한 이유. 둘 중 하나만 채워진다.
     */
    public record Detection(AllowedImageFormat format, Unsupported reason) {
        public boolean supported() {
            return format != null;
        }
    }

    /**
     * 파일을 검증하고 판별된 포맷 + 저장 파일명을 돌려준다.
     *
     * @throws CustomException 크기 초과·빈 파일·지원하지 않는 포맷
     */
    public ValidatedImage inspect(MultipartFile file) {
        AllowedImageFormat format = detectFormat(file);
        return new ValidatedImage(format, UUID.randomUUID() + "." + format.getExtension());
    }

    /**
     * 파일 <b>내용</b>만 보고 포맷을 판별한다. 확장자도, 브라우저가 붙인 Content-Type 도 보지 않는다.
     * <p>
     * 예외를 던지지 않고 사유를 돌려주므로 도메인이 자기 {@link ErrorCode} 로 옮길 수 있다.
     * 크기 상한은 도메인마다 다르므로 여기서 보지 않는다 — 호출 측이 <b>먼저</b> 검사할 것
     * (그래야 10MB 짜리를 스트림으로 열기 전에 거절한다).
     */
    public Detection detect(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return new Detection(null, Unsupported.EMPTY);
        }
        byte[] header = readHeader(file);
        if (header == null) {
            return new Detection(null, Unsupported.UNREADABLE);
        }
        AllowedImageFormat format = match(header);
        return format != null
                ? new Detection(format, null)
                : new Detection(null, rejectionReason(header));
    }

    private AllowedImageFormat detectFormat(MultipartFile file) {
        if (file != null && !file.isEmpty() && file.getSize() > MAX_FILE_SIZE) {
            throw new CustomException(ErrorCode.NOTICE_IMAGE_SIZE_EXCEEDED);
        }
        Detection detection = detect(file);
        if (detection.supported()) {
            return detection.format();
        }
        throw new CustomException(noticeErrorFor(detection.reason()));
    }

    /** 도메인 중립 사유를 공지 도메인의 에러코드로 옮긴다. */
    private ErrorCode noticeErrorFor(Unsupported reason) {
        return switch (reason) {
            case EMPTY -> ErrorCode.NOTICE_IMAGE_EMPTY;
            case UNREADABLE -> ErrorCode.NOTICE_IMAGE_UNREADABLE;
            case HEIC -> ErrorCode.NOTICE_IMAGE_HEIC_UNSUPPORTED;
            case SVG -> ErrorCode.NOTICE_IMAGE_SVG_UNSUPPORTED;
            case TIFF -> ErrorCode.NOTICE_IMAGE_TIFF_UNSUPPORTED;
            case UNKNOWN -> ErrorCode.NOTICE_INVALID_IMAGE_FORMAT;
        };
    }

    /** 헤더를 읽지 못하면 null — 사유 판정은 호출 측이 한다. */
    private byte[] readHeader(MultipartFile file) {
        byte[] header = new byte[HEADER_SIZE];
        int read;
        try (InputStream input = file.getInputStream()) {
            // InputStream.read(...)는 데이터가 남아 있어도 일부만 반환할 수 있다.
            // PNG/WebP 의 8~12바이트 헤더를 안정적으로 채우기 위해 readNBytes를 사용한다.
            read = input.readNBytes(header, 0, header.length);
        } catch (IOException e) {
            return null;
        }
        if (read < 3) {
            return null;
        }
        // 헤더보다 짧은 파일은 뒤가 0 으로 남는다 — 실제로 읽은 만큼만 넘겨 오탐을 막는다.
        return read == HEADER_SIZE ? header : Arrays.copyOf(header, read);
    }

    private AllowedImageFormat match(byte[] header) {
        if (startsWith(header, MAGIC_JPEG)) return AllowedImageFormat.JPEG;
        if (startsWith(header, MAGIC_PNG)) return AllowedImageFormat.PNG;
        if (startsWith(header, MAGIC_GIF)) return AllowedImageFormat.GIF;
        if (startsWith(header, MAGIC_RIFF) && matchesAt(header, 8, MAGIC_WEBP)) return AllowedImageFormat.WEBP;
        if (isBmp(header)) return AllowedImageFormat.BMP;
        if (AVIF_BRANDS.contains(isoBrand(header))) return AllowedImageFormat.AVIF;
        return null;
    }

    /**
     * 지원하지 않는 파일이 왜 거절됐는지 고른다.
     * <p>
     * "형식이 안 맞습니다" 한 줄로는 사용자가 다음에 뭘 해야 할지 알 수 없다 —
     * 아이폰 사진(HEIC)과 로고 파일(SVG)은 각각 할 일이 다르므로 따로 알려 준다.
     */
    private Unsupported rejectionReason(byte[] header) {
        if (HEIC_BRANDS.contains(isoBrand(header))) {
            return Unsupported.HEIC;
        }
        if (isSvg(header)) {
            return Unsupported.SVG;
        }
        if (startsWith(header, MAGIC_TIFF_LE) || startsWith(header, MAGIC_TIFF_BE)) {
            return Unsupported.TIFF;
        }
        return Unsupported.UNKNOWN;
    }

    private boolean startsWith(byte[] header, byte[] magic) {
        return matchesAt(header, 0, magic);
    }

    private boolean matchesAt(byte[] header, int offset, byte[] magic) {
        if (header.length < offset + magic.length) return false;
        for (int i = 0; i < magic.length; i++) {
            if (header[offset + i] != magic[i]) return false;
        }
        return true;
    }

    /**
     * BMP 는 시그니처가 "BM" 두 바이트뿐이라 텍스트 파일도 스칠 수 있다.
     * BITMAPFILEHEADER 의 예약 4바이트(offset 6~9)가 0 인지까지 확인해 오탐을 줄인다.
     */
    private boolean isBmp(byte[] header) {
        if (!startsWith(header, MAGIC_BMP) || header.length < 10) return false;
        for (int i = 6; i < 10; i++) {
            if (header[i] != 0) return false;
        }
        return true;
    }

    /** ISO-BMFF(MP4 계열 컨테이너) 브랜드 4글자. AVIF·HEIC 가 같은 자리를 쓴다. */
    private String isoBrand(byte[] header) {
        if (!matchesAt(header, 4, MAGIC_FTYP) || header.length < 12) return "";
        return new String(header, 8, 4, StandardCharsets.US_ASCII).toLowerCase(Locale.ROOT);
    }

    /** SVG 는 텍스트라 매직바이트가 없다 — 앞부분에 {@code <svg} 가 보이면 SVG 로 본다. */
    private boolean isSvg(byte[] header) {
        String head = new String(header, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
        return head.contains("<svg") || (head.contains("<?xml") && head.contains("svg"));
    }
}
