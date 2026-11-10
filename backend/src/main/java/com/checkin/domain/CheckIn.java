package com.checkin.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;
import java.time.LocalDate;

/**
 * 一次打卡记录：一个自然日只能有一条（date 唯一约束）。
 *
 * 注意：格子是"第 N 次打卡"，不是"某一天"。所以记录只按日期排序，
 * 取消某一条后，后面的记录自然前移一位，日期不变。
 */
@Entity
@Table(name = "check_in", uniqueConstraints = @UniqueConstraint(columnNames = "check_date"))
public class CheckIn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 打卡日期（本地日期，不含时间）。列名避开 SQL 关键字 DATE。 */
    @Column(name = "check_date", nullable = false)
    private LocalDate date;

    /** 盖章时刻，用于详情里显示 "21:19 盖下"。 */
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected CheckIn() {
    }

    public CheckIn(LocalDate date, Instant createdAt) {
        this.date = date;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public LocalDate getDate() {
        return date;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
