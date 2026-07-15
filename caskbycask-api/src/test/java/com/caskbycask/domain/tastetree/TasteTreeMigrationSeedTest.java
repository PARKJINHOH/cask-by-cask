package com.caskbycask.domain.tastetree;

import com.caskbycask.domain.tastetree.dto.TasteTreeContent;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class TasteTreeMigrationSeedTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void officialTreeSeedsContainValidContentJson() throws Exception {
        assertValidSeeds("/db/migration/V43__create_whisky_taste_tree.sql", false);
    }

    @Test
    void professionalOfficialTreeSeedsContainValidContentJson() throws Exception {
        assertValidSeeds("/db/migration/V44__publish_professional_official_taste_trees.sql", true);
    }

    private void assertValidSeeds(String resourcePath, boolean requireProfessionalDepth) throws Exception {
        try (InputStream input = getClass().getResourceAsStream(
                resourcePath)) {
            assertThat(input).isNotNull();

            String sql = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            List<String> contentLines = sql.lines()
                    .filter(line -> line.startsWith("'{\"experienceLevel\""))
                    .toList();

            assertThat(contentLines).hasSize(4);

            for (String line : contentLines) {
                int jsonEnd = line.lastIndexOf("}' , NOW");
                assertThat(jsonEnd).isPositive();

                String json = line.substring(1, jsonEnd + 1);
                TasteTreeContent content = objectMapper.readValue(json, TasteTreeContent.class);

                assertThat(content.experienceLevel()).isNotBlank();
                assertThat(content.nodes()).isNotEmpty();
                assertThat(content.nodes()).anyMatch(node -> node.type() == TasteTreeContent.NodeType.START);
                assertThat(content.nodes()).anyMatch(node -> node.type() == TasteTreeContent.NodeType.RESULT);

                Map<String, TasteTreeContent.Node> nodes = content.nodes().stream()
                        .collect(Collectors.toMap(TasteTreeContent.Node::key, Function.identity()));
                assertThat(nodes).hasSize(content.nodes().size());
                content.nodes().stream()
                        .flatMap(node -> node.options() == null ? java.util.stream.Stream.empty() : node.options().stream())
                        .forEach(option -> assertThat(nodes).containsKey(option.targetNodeKey()));

                if (requireProfessionalDepth) {
                    TasteTreeContent.Node start = content.nodes().stream()
                            .filter(node -> node.type() == TasteTreeContent.NodeType.START)
                            .findFirst()
                            .orElseThrow();
                    assertThat(maxQuestionDepth(start.key(), nodes, Set.of())).isGreaterThanOrEqualTo(5);
                    assertThat(content.nodes().stream()
                            .filter(node -> node.type() == TasteTreeContent.NodeType.QUESTION)
                            .flatMap(node -> node.options().stream())
                            .count()).isGreaterThanOrEqualTo(20);
                }
            }
        }
    }

    private int maxQuestionDepth(
            String nodeKey,
            Map<String, TasteTreeContent.Node> nodes,
            Set<String> visited
    ) {
        if (visited.contains(nodeKey)) return 0;
        TasteTreeContent.Node node = nodes.get(nodeKey);
        if (node == null) return 0;

        Set<String> nextVisited = new java.util.HashSet<>(visited);
        nextVisited.add(nodeKey);
        int nextDepth = node.options() == null ? 0 : node.options().stream()
                .mapToInt(option -> maxQuestionDepth(option.targetNodeKey(), nodes, nextVisited))
                .max()
                .orElse(0);
        return (node.type() == TasteTreeContent.NodeType.QUESTION ? 1 : 0) + nextDepth;
    }
}
