package com.caskbycask.domain.tastetree.dto;

import java.math.BigDecimal;
import java.util.List;

public record TasteTreeContent(
        Integer schemaVersion,
        List<Node> nodes,
        List<Edge> edges
) {
    public enum NodeType { START, CHOICE, INFO, WHISKY }
    public enum WhiskySource { REGISTERED, CUSTOM }

    public record Node(
            String key,
            NodeType type,
            String titleKo,
            String titleEn,
            String descriptionKo,
            String descriptionEn,
            Integer positionX,
            Integer positionY,
            Integer width,
            Integer height,
            String imageUrl,
            ImageFit imageFit,
            Integer imagePositionX,
            Integer imagePositionY,
            Integer imageScale,
            Boolean imageHidden,
            Whisky whisky
    ) {}

    public enum ImageFit { CONTAIN, COVER }

    public record Edge(
            String key,
            String sourceNodeKey,
            String targetNodeKey,
            String labelKo,
            String labelEn,
            String descriptionKo,
            String descriptionEn,
            Integer sortOrder,
            String sourceHandle,
            String targetHandle,
            Double labelPosition,
            String lineType
    ) {}

    public record Whisky(
            WhiskySource source,
            Long spiritId,
            String nameKo,
            String nameEn,
            String imageUrl,
            String imageOverrideUrl,
            BigDecimal priceAmount,
            String currencyCode,
            String priceText,
            String noteKo,
            String noteEn
    ) {}
}
