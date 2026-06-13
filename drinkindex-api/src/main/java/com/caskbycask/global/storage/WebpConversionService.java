package com.caskbycask.global.storage;

import com.sksamuel.scrimage.ImmutableImage;
import com.sksamuel.scrimage.webp.WebpWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;

// JPG/PNG 원본 바이트를 WebP 로 변환.
// scrimage-webp 가 내부적으로 Google libwebp 네이티브 cwebp 바이너리를 호출 (jar 에 번들).
@Slf4j
@Component
public class WebpConversionService {

    private static final int DEFAULT_QUALITY = 80; // 0~100, 80=균형, 75 이상 권장
    private final WebpWriter writer = WebpWriter.DEFAULT.withQ(DEFAULT_QUALITY);

    public boolean isConvertibleMime(String mimeType) {
        return "image/jpeg".equals(mimeType) || "image/png".equals(mimeType);
    }

    // 변환 성공 시 WebP 바이트, 실패 시 IOException
    public byte[] toWebp(byte[] sourceBytes) throws IOException {
        return ImmutableImage.loader().fromBytes(sourceBytes).bytes(writer);
    }
}
