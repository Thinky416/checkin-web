package com.checkin.web;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 前后端之间唯一的"整份状态"契约：前端每次操作都拿回最新状态整体重绘。
 * 页面逻辑简单，避免维护增量同步。
 */
public record StateDto(
        String title,
        int targetDate,
        LocalDate startDate,
        LocalDate endDate,
        int totalDays,
        List<Record> records
) {
    /** at 可能为 null（历史数据），前端做兜底。 */
    public record Record(LocalDate date, Instant at) {
    }
}
