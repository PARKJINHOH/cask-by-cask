package com.caskbycask.domain.social.service;

import com.caskbycask.domain.community.entity.Post;
import com.caskbycask.domain.community.entity.PostImage;
import com.caskbycask.domain.community.repository.PostImageRepository;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.review.repository.ReviewImageRepository;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.SocialPublishBundleMedia;
import com.caskbycask.domain.social.entity.enums.SocialMediaRole;
import com.caskbycask.domain.social.repository.SocialPublishBundleMediaRepository;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class SocialPublishMediaServiceTest {

    @Mock SocialPublishBundleMediaRepository mediaRepository;
    @Mock ReviewImageRepository reviewImageRepository;
    @Mock SpiritImageRepository spiritImageRepository;
    @Mock PostRepository postRepository;
    @Mock PostImageRepository postImageRepository;
    @Mock SocialImageRenderService imageRenderService;

    @Test
    void postSnapshotKeepsEverySupportedEditorImageInDocumentOrder() {
        SocialPublishMediaService service = new SocialPublishMediaService(
                mediaRepository, reviewImageRepository, spiritImageRepository,
                postRepository, postImageRepository, imageRenderService);
        SocialPublishBundle bundle = SocialPublishBundle.builder().id(10L).build();
        Post post = Post.builder()
                .contentSanitized("""
                        <p><img src="/api/posts/images/first.webp"></p>
                        <p><img src="https://cdn.example.com/second.jpg"></p>
                        <p><img src="data:image/png;base64,ignored"></p>
                        """)
                .build();
        PostImage first = PostImage.builder()
                .savedFileName("first.webp")
                .subPath("posts/202607")
                .mimeType("image/webp")
                .imageUrl("/api/posts/images/first.webp")
                .originalFileName("first.png")
                .fileSize(100L)
                .build();
        given(postRepository.findById(20L)).willReturn(Optional.of(post));
        given(postImageRepository.findByPostId(20L)).willReturn(List.of(first));

        service.snapshotPost(bundle, 20L);

        ArgumentCaptor<SocialPublishBundleMedia> captor =
                ArgumentCaptor.forClass(SocialPublishBundleMedia.class);
        verify(mediaRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(SocialPublishBundleMedia::getSortOrder)
                .containsExactly(0, 1);
        assertThat(captor.getAllValues())
                .extracting(SocialPublishBundleMedia::getMediaRole)
                .containsOnly(SocialMediaRole.EDITOR_IMAGE);
        assertThat(captor.getAllValues())
                .extracting(SocialPublishBundleMedia::getSourceImageUrl)
                .containsExactly(
                        "/uploads/posts/202607/first.webp",
                        "https://cdn.example.com/second.jpg");
    }
}
