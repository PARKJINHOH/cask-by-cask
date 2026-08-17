package com.caskbycask.global.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SpiritEmbedParserTest {

    @Test
    @DisplayName("본문 임베드의 주류 id를 등장 순서대로 중복 없이 읽는다")
    void reads_ids_in_document_order_without_duplicates() {
        String html = """
                <p>오늘의 위스키한잔은 글렌알라키 15년입니다.</p>
                <p><a data-spirit-id="133" data-spirit-name="글렌알라키 15년"
                      class="di-spirit-embed"><img src="/x.webp" alt=""></a></p>
                <p><a data-spirit-id="238" class="di-spirit-embed"></a></p>
                <p><a data-spirit-id="133" class="di-spirit-embed"></a></p>
                """;

        assertThat(SpiritEmbedParser.parseSpiritIds(html)).containsExactly(133L, 238L);
    }

    @Test
    @DisplayName("임베드가 없거나 본문이 비어 있으면 빈 목록을 돌려준다")
    void returns_empty_when_there_is_no_embed() {
        assertThat(SpiritEmbedParser.parseSpiritIds(null)).isEmpty();
        assertThat(SpiritEmbedParser.parseSpiritIds("   ")).isEmpty();
        assertThat(SpiritEmbedParser.parseSpiritIds("<p>그냥 글입니다.</p>")).isEmpty();
    }

    @Test
    @DisplayName("손상된 임베드는 건너뛰고 나머지는 그대로 읽는다")
    void skips_broken_embeds_without_failing() {
        String html = """
                <a data-spirit-id="" class="di-spirit-embed"></a>
                <a data-spirit-id="abc" class="di-spirit-embed"></a>
                <a data-spirit-id="0" class="di-spirit-embed"></a>
                <a data-spirit-id="-7" class="di-spirit-embed"></a>
                <a data-spirit-id=" 240 " class="di-spirit-embed"></a>
                """;

        assertThat(SpiritEmbedParser.parseSpiritIds(html)).containsExactly(240L);
    }

    @Test
    @DisplayName("리뷰 카드 임베드는 주류 태그로 오인하지 않는다")
    void ignores_review_embeds() {
        String html = "<a data-review-id=\"9\" class=\"di-review-embed\"></a>";

        assertThat(SpiritEmbedParser.parseSpiritIds(html)).isEqualTo(List.of());
    }
}
