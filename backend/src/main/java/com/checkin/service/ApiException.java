package com.checkin.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * 业务校验失败（会被全局异常处理转成 400 + {"message": "..."}）。
 * 前端直接把这句 message 用 toast 弹出来，所以文案要面向用户。
 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class ApiException extends RuntimeException {

    public ApiException(String message) {
        super(message);
    }
}
