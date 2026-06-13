package com.caskbycask.domain.admin.dto;

import java.sql.Date;

public interface DailyCountProjection {
    Date getDate();
    Long getCount();
}
