package com.checkin.service;

import com.checkin.domain.CheckIn;
import com.checkin.domain.Plan;
import com.checkin.repo.CheckInRepository;
import com.checkin.repo.PlanRepository;
import com.checkin.web.PlanRequest;
import com.checkin.web.StateDto;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 打卡的全部业务规则都在这里（前端只负责画图）。
 *
 * 规则：
 * 1. 计划有起止日期，周期内每天最多一枚章；
 * 2. 周期外不能打卡（过期不可补）；
 * 3. 格子数 = 周期天数，盖满即完成；
 * 4. 取消任意一条后，后面的记录按日期前移一位（格子 = 第 N 次打卡）。
 */
@Service
public class CheckinService {

    private static final String DEFAULT_TITLE = "每日打卡";
    private static final int DEFAULT_DAYS = 30;
    private static final int MAX_DAYS = 366;

    private final PlanRepository plans;
    private final CheckInRepository checkIns;

    public CheckinService(PlanRepository plans, CheckInRepository checkIns) {
        this.plans = plans;
        this.checkIns = checkIns;
    }

    /** 不能只读：首次访问可能要插入默认计划，只读事务会漏 flush。 */
    @Transactional
    public StateDto state() {
        return toDto(plan());
    }

    @Transactional
    public StateDto updatePlan(PlanRequest req) {
        if (req == null || req.startDate() == null || req.endDate() == null) {
            throw new ApiException("请把启动时间和结束时间都填上");
        }
        LocalDate start = req.startDate();
        LocalDate end = req.endDate();
        if (end.isBefore(start)) {
            throw new ApiException("结束时间要晚于启动时间");
        }
        if (ChronoUnit.DAYS.between(start, end) + 1 > MAX_DAYS) {
            throw new ApiException("时间跨度最多 " + MAX_DAYS + " 天");
        }

        String title = req.title() == null ? "" : req.title().trim();
        if (title.isEmpty()) {
            title = DEFAULT_TITLE;
        }
        if (title.length() > 16) {
            title = title.substring(0, 16);
        }

        Plan plan = plan();
        plan.setTitle(title);
        System.out.println("ssssss:" + req.targetDate());
        plan.setTargetDate(req.targetDate());
        plan.setStartDate(start);
        plan.setEndDate(end);
        plans.save(plan);
        return toDto(plan);
    }

    @Transactional
    public StateDto checkIn() {
        Plan plan = plan();
        LocalDate today = LocalDate.now();

        if (today.isBefore(plan.getStartDate())) {
            throw new ApiException("打卡还没开始 · " + plan.getStartDate() + " 起");
        }
        if (today.isAfter(plan.getEndDate())) {
            throw new ApiException("打卡期已经结束了");
        }
        if (checkIns.existsByDate(today)) {
            throw new ApiException("今天已经打过卡了");
        }
        if (countInSpan(plan) >= totalDays(plan)) {
            throw new ApiException("全部格子都盖满了");
        }

        try {
            checkIns.save(new CheckIn(today, Instant.now()));
        } catch (DataIntegrityViolationException e) {
            // 并发双击时的兜底：唯一约束把第二次挡下来
            throw new ApiException("今天已经打过卡了");
        }
        return toDto(plan);
    }

    @Transactional
    public StateDto cancel(LocalDate date) {
        if (date == null) {
            throw new ApiException("缺少要取消的日期");
        }
        CheckIn record = checkIns.findByDate(date)
                .orElseThrow(() -> new ApiException("这条打卡记录已经不在了"));
        checkIns.delete(record);
        return toDto(plan());
    }

    @Transactional
    public StateDto clearAll() {
        checkIns.deleteAll();
        return toDto(plan());
    }

    /* ---------------- 内部 ---------------- */

    /** 计划不存在时按"今天起 30 天"初始化。 */
    private Plan plan() {
        return plans.findById(Plan.SINGLETON_ID).orElseGet(() -> {
            LocalDate today = LocalDate.now();
            return plans.save(new Plan(DEFAULT_TITLE, DEFAULT_DAYS,today, today.plusDays(DEFAULT_DAYS - 1L)));
        });
    }

    private int totalDays(Plan plan) {
        return (int) (ChronoUnit.DAYS.between(plan.getStartDate(), plan.getEndDate()) + 1);
    }

    /** 只统计落在当前周期内的记录（改了周期后，周期外的记录暂不显示）。 */
    private long countInSpan(Plan plan) {
        return checkIns.countByDateBetween(plan.getStartDate(), plan.getEndDate());
    }

    private StateDto toDto(Plan plan) {
        List<StateDto.Record> records = checkIns.findAllByOrderByDateAsc().stream()
                .filter(c -> !c.getDate().isBefore(plan.getStartDate()) && !c.getDate().isAfter(plan.getEndDate()))
                .map(c -> new StateDto.Record(c.getDate(), c.getCreatedAt()))
                .toList();
        return new StateDto(plan.getTitle(),plan.getTargetDate(), plan.getStartDate(), plan.getEndDate(), totalDays(plan), records);
    }
}
