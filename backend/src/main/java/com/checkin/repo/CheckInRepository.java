package com.checkin.repo;

import com.checkin.domain.CheckIn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {

    /** 按日期升序 = 盖章顺序（格子 = 第 N 次打卡）。 */
    List<CheckIn> findAllByOrderByDateAsc();

    Optional<CheckIn> findByDate(LocalDate date);

    boolean existsByDate(LocalDate date);

    long countByDateBetween(LocalDate from, LocalDate to);
}
