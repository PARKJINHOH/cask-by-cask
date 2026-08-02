package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.CognacCru;

public record CruCompositionResponse(CognacCru cru, Integer percentage) {}
