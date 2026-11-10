package com.checkin.web;

import com.checkin.service.CheckinService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * 所有接口都返回"整份状态"，前端拿到直接重绘。
 *
 * GET    /api/state              当前计划 + 全部打卡记录
 * PUT    /api/plan               修改名称/起止日期
 * POST   /api/checkins           盖下今天的章（服务端用服务器日期，避免改客户端时间作弊）
 * DELETE /api/checkins/{date}    取消某一天的打卡（yyyy-MM-dd）
 * DELETE /api/checkins           清空全部记录
 */
@RestController
@RequestMapping("/api")
@CrossOrigin // 开发时前端跑在 5173，留个口子；走 Vite 代理时其实同源
public class CheckinController {

    private final CheckinService service;

    public CheckinController(CheckinService service) {
        this.service = service;
    }

    @GetMapping("/state")
    public StateDto state() {
        return service.state();
    }

    @PutMapping("/plan")
    public StateDto updatePlan(@RequestBody PlanRequest request) {
        return service.updatePlan(request);
    }

    @PostMapping("/checkins")
    public StateDto checkIn() {
        return service.checkIn();
    }

    @DeleteMapping("/checkins/{date}")
    public StateDto cancel(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.cancel(date);
    }

    @DeleteMapping("/checkins")
    public StateDto clearAll() {
        return service.clearAll();
    }
}
