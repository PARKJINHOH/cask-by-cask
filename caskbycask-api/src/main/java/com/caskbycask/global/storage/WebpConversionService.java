package com.caskbycask.global.storage;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// JPG/PNG 원본 바이트를 WebP 로 변환.
// scrimage-webp 가 내부적으로 Google libwebp 네이티브 cwebp 바이너리를 호출 (jar 에 번들).
@Slf4j
@Component
public class WebpConversionService {

    private static final int DEFAULT_QUALITY = 85; // 0~100, 80=균형, 75 이상 권장
    private final WebpWriter lossyWriter = WebpWriter.DEFAULT.withQ(DEFAULT_QUALITY);
    private final WebpWriter losslessWriter = WebpWriter.DEFAULT.withLossless();

    public boolean isConvertibleMime(String mimeType) {
        return "image/jpeg".equals(mimeType) || "image/png".equals(mimeType);
    }

    // 변환 성공 시 WebP 바이트, 실패 시 IOException
    public byte[] toWebp(byte[] sourceBytes) throws IOException {
        return toWebp(sourceBytes, WebpConversionMode.LOSSY);
    }

    public byte[] toWebp(byte[] sourceBytes, WebpConversionMode mode) throws IOException {
        return toWebp(sourceBytes, mode, null);
    }

    /**
     * 장변이 {@code maxEdge} 를 넘으면 비율을 유지한 채 줄인 뒤 WebP 로 인코딩한다.
     * <p>
     * {@code maxEdge} 가 null 이거나 원본이 이미 그보다 작으면 크기를 건드리지 않는다 —
     * 작은 사진을 늘려 봐야 파일만 커지고 화질은 나아지지 않는다.
     */
    public byte[] toWebp(byte[] sourceBytes, WebpConversionMode mode, Integer maxEdge) throws IOException {
        ImmutableImage image = shrinkToFit(ImmutableImage.loader().fromBytes(sourceBytes), maxEdge);
        return image.bytes(writerFor(mode));
    }

    /**
     * 같은 원본에서 여러 폭의 축소본을 한 번에 만든다 (반응형 srcset 용).
     * <p>
     * 원본을 한 번만 디코딩해 폭마다 스케일한다 — 폭 수만큼 디코딩하면 큰 사진에서 비용이 그대로 곱해진다.
     * 원본보다 넓은 폭은 건너뛴다(확대본을 만들지 않는다).
     *
     * @return 실제로 만들어진 {폭 → WebP 바이트}. 요청한 폭이 모두 원본보다 크면 빈 맵.
     */
    public Map<Integer, byte[]> toWebpVariants(
            byte[] sourceBytes,
            WebpConversionMode mode,
            List<Integer> widths
    ) throws IOException {
        if (widths == null || widths.isEmpty()) return Map.of();

        WebpWriter writer = writerFor(mode);
        ImmutableImage source = ImmutableImage.loader().fromBytes(sourceBytes);
        Map<Integer, byte[]> variants = new LinkedHashMap<>();
        for (Integer width : widths) {
            if (width == null || width <= 0 || width >= source.width) continue;
            variants.put(width, source.scaleToWidth(width).bytes(writer));
        }
        return variants;
    }

    private WebpWriter writerFor(WebpConversionMode mode) {
        return mode == WebpConversionMode.LOSSLESS ? losslessWriter : lossyWriter;
    }

    private ImmutableImage shrinkToFit(ImmutableImage image, Integer maxEdge) {
        if (maxEdge == null || maxEdge <= 0) return image;
        int longestEdge = Math.max(image.width, image.height);
        if (longestEdge <= maxEdge) return image;

        double ratio = (double) maxEdge / longestEdge;
        return image.scaleTo(
                Math.max(1, (int) Math.round(image.width * ratio)),
                Math.max(1, (int) Math.round(image.height * ratio))
        );
    }
}
