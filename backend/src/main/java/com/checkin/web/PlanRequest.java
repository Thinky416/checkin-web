package com.checkin.web;

import java.time.LocalDate;

/** 修改计划的请求体。 */
public record PlanRequest(String title, int targetDate, LocalDate startDate, LocalDate endDate) {
}
