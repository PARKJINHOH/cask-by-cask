package com.caskbycask.global.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.InputStream;
import java.util.Iterator;
import java.util.Optional;

/**
 * 업로드된 이미지의 원본 픽셀 크기를 읽는다.
 * <p>
 * 이미지 갤러리 목록은 사진 비율대로 행을 꽉 채우는 justified 그리드다. 배치를 계산하려면
 * 렌더 전에 비율을 알아야 하는데, URL 만 있으면 브라우저가 파일을 다 받아야 알 수 있어
 * 목록이 로드되며 계속 튄다. 그래서 업로드 시점에 크기를 저장해 둔다.
 * <p>
 * {@code ImageIO.read()} 로 전체를 디코딩하지 않고 헤더만 읽는다 —
 * 4천만 픽셀 이미지를 BufferedImage 로 펼치면 수백 MB 를 쓰는데, 필요한 건 숫자 두 개뿐이다.
 * <p>
 * WebP·HEIC 처럼 JDK 기본 ImageIO 가 모르는 포맷은 {@link Optional#empty()} 를 돌려준다.
 * 크기를 못 읽어도 업로드는 성공해야 한다(프론트가 img.onLoad 로 보정한다).
 */
@Slf4j
@Component
public class ImageDimensionReader {

    public record Dimension(int width, int height) {}

    public Optional<Dimension> read(MultipartFile file) {
        try (InputStream input = file.getInputStream();
             ImageInputStream stream = ImageIO.createImageInputStream(input)) {

            if (stream == null) return Optional.empty();

            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) return Optional.empty();

            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0) return Optional.empty();
                return Optional.of(new Dimension(width, height));
            } finally {
                reader.dispose();
            }
        } catch (Exception e) {
            // 크기를 못 읽는 것은 업로드 실패 사유가 아니다.
            log.debug("이미지 크기를 읽지 못했다: {}", file.getOriginalFilename(), e);
            return Optional.empty();
        }
    }
}
