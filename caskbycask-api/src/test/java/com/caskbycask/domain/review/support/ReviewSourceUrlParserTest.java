package com.caskbycask.domain.review.support;

import com.caskbycask.domain.review.support.ReviewSourceUrlParser.DcBoardKind;
import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceReference;
import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceSite;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 이 파서가 URL 을 돌려주지 않는 것이 SSRF 방어선이다.
 * 여기서 null 을 못 내면 사용자가 넣은 문자열이 서버의 외부 요청 대상이 된다.
 */
class ReviewSourceUrlParserTest {

    @Test
    @DisplayName("디시 마이너 갤러리 주소에서 갤러리 ID 와 글 번호를 뽑는다")
    void parsesMinorGallery() {
        SourceReference reference = ReviewSourceUrlParser.parse(
                "https://gall.dcinside.com/mgallery/board/view/?id=whiskey&no=1771938");

        assertThat(reference).isNotNull();
        assertThat(reference.site()).isEqualTo(SourceSite.DCINSIDE);
        assertThat(reference.boardKind()).isEqualTo(DcBoardKind.MINOR);
        assertThat(reference.boardId()).isEqualTo("whiskey");
        assertThat(reference.postNo()).isEqualTo("1771938");
    }

    @Test
    @DisplayName("갤러리 갈래별 경로를 구분한다")
    void parsesEachBoardKind() {
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/board/view/?id=whisky&no=1").boardKind())
                .isEqualTo(DcBoardKind.MAIN);
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/mini/board/view/?id=whisky&no=1").boardKind())
                .isEqualTo(DcBoardKind.MINI);
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/person/board/view/?id=whisky&no=1").boardKind())
                .isEqualTo(DcBoardKind.PERSON);
    }

    @Test
    @DisplayName("쿼리 순서가 바뀌거나 파라미터가 더 붙어도 읽는다")
    void toleratesQueryOrder() {
        SourceReference reference = ReviewSourceUrlParser.parse(
                "https://gall.dcinside.com/mgallery/board/view/?page=2&no=1771938&id=whiskey&exception_mode=recommend");

        assertThat(reference).isNotNull();
        assertThat(reference.boardId()).isEqualTo("whiskey");
        assertThat(reference.postNo()).isEqualTo("1771938");
    }

    @Test
    @DisplayName("아카라이브 게시글 주소에서 채널과 글 번호를 뽑는다")
    void parsesArcalive() {
        SourceReference reference = ReviewSourceUrlParser.parse("https://arca.live/b/alcohol/180878131?p=1");

        assertThat(reference).isNotNull();
        assertThat(reference.site()).isEqualTo(SourceSite.ARCALIVE);
        assertThat(reference.boardId()).isEqualTo("alcohol");
        assertThat(reference.postNo()).isEqualTo("180878131");
    }

    @Test
    @DisplayName("허용 호스트가 아니면 받지 않는다")
    void rejectsOtherHosts() {
        assertThat(ReviewSourceUrlParser.parse("https://evil.example.com/board/view/?id=a&no=1")).isNull();
        assertThat(ReviewSourceUrlParser.parse("https://cafe.naver.com/f-e/cafes/1/articles/2")).isNull();
        assertThat(ReviewSourceUrlParser.parse("https://www.instagram.com/p/abc")).isNull();
    }

    @Test
    @DisplayName("호스트를 속이려는 주소를 받지 않는다")
    void rejectsHostSpoofing() {
        // 사용자 정보(user@host) 로 앞부분을 허용 호스트처럼 보이게 하는 형태
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com@evil.example.com/board/view/?id=a&no=1"))
                .isNull();
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com.evil.example.com/board/view/?id=a&no=1"))
                .isNull();
    }

    @Test
    @DisplayName("http(s) 가 아닌 스킴과 내부 주소를 받지 않는다")
    void rejectsNonHttpSchemes() {
        assertThat(ReviewSourceUrlParser.parse("javascript:alert(1)")).isNull();
        assertThat(ReviewSourceUrlParser.parse("file:///etc/passwd")).isNull();
        assertThat(ReviewSourceUrlParser.parse("http://127.0.0.1/board/view/?id=a&no=1")).isNull();
        assertThat(ReviewSourceUrlParser.parse("http://169.254.169.254/latest/meta-data/")).isNull();
    }

    @Test
    @DisplayName("갤러리 ID·글 번호에 이상한 값이 섞이면 받지 않는다")
    void rejectsMalformedIdentifiers() {
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/board/view/?id=whiskey&no=1@evil.com"))
                .isNull();
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/board/view/?id=../../etc&no=1")).isNull();
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/board/view/?id=whiskey&no=abc")).isNull();
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/board/view/?id=whiskey")).isNull();
    }

    @Test
    @DisplayName("게시글이 아닌 목록 주소는 받지 않는다")
    void rejectsListUrls() {
        assertThat(ReviewSourceUrlParser.parse("https://gall.dcinside.com/mgallery/board/lists/?id=whiskey"))
                .isNull();
        assertThat(ReviewSourceUrlParser.parse("https://arca.live/b/alcohol?category=리뷰")).isNull();
    }

    @Test
    @DisplayName("빈 값은 조용히 null 이다")
    void rejectsBlank() {
        assertThat(ReviewSourceUrlParser.parse(null)).isNull();
        assertThat(ReviewSourceUrlParser.parse("   ")).isNull();
        assertThat(ReviewSourceUrlParser.parse("그냥 텍스트")).isNull();
    }
}
