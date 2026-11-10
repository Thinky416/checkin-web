package com.checkin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

/**
 * 打卡计划（全局只有一条记录，id 固定为 1）。
 * 起止日期只是"周期约束"：周期内每天可盖一枚章。
 */
@Entity
@Table(name = "plan")
public class Plan {

    public static final long SINGLETON_ID = 1L;

    @Id
    private Long id = SINGLETON_ID;

    @Column(nullable = false, length = 16)
    private String title;


    @Column(name = "target_date", nullable = false, columnDefinition = "integer default 30")
    private Integer targetDate;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    protected Plan() {
    }

    public Plan(String title, int targetDate, LocalDate startDate, LocalDate endDate) {
        this.id = SINGLETON_ID;
        this.title = title;
        this.targetDate = targetDate;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }


    public void setTitle(String title) {
        this.title = title;
    }

    public int getTargetDate(){
        return targetDate;
    }
    public void setTargetDate(int targetDate){
        this.targetDate = targetDate;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}
