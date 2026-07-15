package com.caskbycask.domain.tastetree.dto;

import com.caskbycask.domain.spirit.entity.enums.BottlingType;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;

import java.math.BigDecimal;
import java.util.List;

public record TasteTreeContent(
        String experienceLevel,
        List<Node> nodes
) {
    public enum NodeType { START, QUESTION, INFO, RESULT }
    public enum SelectionType { SINGLE, MULTIPLE }
    public enum ResultItemType { REGISTERED, CUSTOM }

    public record Node(
            String key,
            NodeType type,
            String titleKo,
            String titleEn,
            String descriptionKo,
            String descriptionEn,
            Integer positionX,
            Integer positionY,
            SelectionType selectionType,
            Integer minSelect,
            Integer maxSelect,
            List<Option> options,
            List<ResultItemDefinition> results,
            DynamicFilter dynamicFilter
    ) {}

    public record Option(
            String key,
            String labelKo,
            String labelEn,
            String descriptionKo,
            String descriptionEn,
            String targetNodeKey,
            List<String> attributeCodes
    ) {}

    public record ResultItemDefinition(
            ResultItemType type,
            Long spiritId,
            String displayNameKo,
            String displayNameEn,
            String imageUrl,
            String customName,
            String customImageUrl,
            BigDecimal priceAmount,
            String currencyCode,
            String recommendationReasonKo,
            String recommendationReasonEn
    ) {}

    public record DynamicFilter(
            List<WhiskyStyle> styles,
            Boolean peated,
            String caskToken,
            BottlingType bottlingType,
            Boolean caskStrength,
            Boolean singleCask,
            String resultTitleKo,
            String resultTitleEn,
            String recommendationReasonKo,
            String recommendationReasonEn
    ) {}
}
