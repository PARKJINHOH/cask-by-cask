package com.caskbycask.domain.tastetree.repository;

import com.caskbycask.domain.tastetree.dto.TasteTreeImageFile;
import com.caskbycask.domain.tastetree.entity.TasteTree;
import com.caskbycask.domain.tastetree.entity.TasteTreeImage;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class TasteTreeImageRepositoryTest {

    @Autowired private UserRepository userRepository;
    @Autowired private TasteTreeRepository treeRepository;
    @Autowired private TasteTreeImageRepository imageRepository;

    @Test
    void imageMetadataProjectionAndBulkDeleteAllowTreeDeletion() {
        User owner = userRepository.save(User.builder()
                .email("tree-delete@example.com")
                .password("encoded")
                .nickname("트리삭제")
                .role(Role.MEMBER)
                .build());
        TasteTree tree = treeRepository.save(TasteTree.builder()
                .type(TasteTreeType.USER)
                .owner(owner)
                .createdBy(owner)
                .shareKey("delete-with-image")
                .moderationStatus(TasteTreeModerationStatus.VISIBLE)
                .build());
        imageRepository.save(TasteTreeImage.builder()
                .tree(tree)
                .uploadedBy(owner)
                .originalFileName("original.webp")
                .savedFileName("saved.webp")
                .fileSize(123L)
                .mimeType("image/webp")
                .imageUrl("/api/taste-tree/images/saved.webp")
                .subPath("taste-tree/2026/07")
                .build());
        imageRepository.flush();

        List<TasteTreeImageFile> files = imageRepository.findFilesByTreeId(tree.getId());
        int deletedImages = imageRepository.deleteAllByTreeId(tree.getId());
        treeRepository.deleteById(tree.getId());
        treeRepository.flush();

        assertThat(files).containsExactly(new TasteTreeImageFile(
                "saved.webp", "taste-tree/2026/07", "image/webp"));
        assertThat(deletedImages).isEqualTo(1);
        assertThat(treeRepository.existsById(tree.getId())).isFalse();
    }
}
