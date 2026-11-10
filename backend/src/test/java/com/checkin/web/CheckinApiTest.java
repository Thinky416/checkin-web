package com.checkin.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 端到端跑一遍核心规则（内存库，不动本地数据文件）。
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:checkin-test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
@Transactional // 每个用例结束回滚，用例之间互不影响
class CheckinApiTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void defaultPlanHasThirtyDays() throws Exception {
        mvc.perform(get("/api/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDays").value(30))
                .andExpect(jsonPath("$.title").value("每日打卡"))
                .andExpect(jsonPath("$.records").isArray());
    }

    @Test
    void checkInOncePerDayAndCancel() throws Exception {
        mvc.perform(post("/api/checkins"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records.length()").value(1))
                .andExpect(jsonPath("$.records[0].date").value(LocalDate.now().toString()));

        // 同一天第二次 → 400
        mvc.perform(post("/api/checkins"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("今天已经打过卡了"));

        // 取消后回到 0 条
        mvc.perform(delete("/api/checkins/" + LocalDate.now()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.records.length()").value(0));

        // 取消不存在的记录 → 400
        mvc.perform(delete("/api/checkins/2020-01-01"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void planRejectsInvalidRange() throws Exception {
        mvc.perform(put("/api/plan")
                        .contentType("application/json")
                        .content("{\"title\":\"测试\",\"startDate\":\"2026-05-10\",\"endDate\":\"2026-05-01\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("结束时间要晚于启动时间"));

        // 合法区间 → 天数按含头含尾算
        mvc.perform(put("/api/plan")
                        .contentType("application/json")
                        .content("{\"title\":\"测试周期\",\"startDate\":\"2026-12-28\",\"endDate\":\"2027-01-03\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalDays").value(7))
                .andExpect(jsonPath("$.startDate").value("2026-12-28"));
    }

    @Test
    void cannotCheckInOutsidePeriod() throws Exception {
        // 把周期挪到很久以后 → 今天不在范围内，不能打卡
        mvc.perform(put("/api/plan")
                        .contentType("application/json")
                        .content("{\"title\":\"未来打卡\",\"startDate\":\"2030-01-01\",\"endDate\":\"2030-01-30\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/api/checkins"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("打卡还没开始 · 2030-01-01 起"));
    }
}
