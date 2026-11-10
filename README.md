# 印记 · 每日打卡（React + Spring Boot）

把原来那个单文件 HTML 打卡页，拆成前后端分离的正式工程：**React 画界面，Spring Boot 管规则和数据**。

> 工程位置：`E:\Java\checkin-web`

## 目录结构

```
checkin-web/
├── backend/                     Spring Boot 3.3 + JPA + H2（文件库）
│   ├── pom.xml
│   └── src/main/java/com/checkin/
│       ├── CheckinApplication.java     启动类
│       ├── domain/                     Plan（计划）、CheckIn（打卡记录）实体
│       ├── repo/                       Spring Data 仓库
│       ├── service/CheckinService.java 全部业务规则都在这
│       └── web/                        Controller + DTO + 全局异常处理
│
├── frontend/                    React 18 + Vite
│   ├── vite.config.js          dev 时 /api 代理到 8080
│   └── src/
│       ├── App.jsx             页面主体：分页、盖章、弹层
│       ├── api.js              接口封装
│       ├── components/         Seal（印章 SVG）、SettingsSheet、SealDetail
│       ├── lib/                date.js / sound.js / prefs.js
│       └── styles.css          淡色纸感主题（配色全在 :root）
│
└── settings-aliyun.xml         可选：Maven 阿里云镜像配置
```

## 环境

| 依赖 | 版本 | 本机现状 |
|---|---|---|
| JDK | 21 | `D:\Java\JDK21` |
| Node | ≥ 18 | v22.22.2 |
| Maven | 3.9+ | 用 IDEA 自带的即可 |

## 启动（IDEA）

**1. 打开工程**：`File → Open` 选择 `checkin-web` 目录（不是 backend 子目录）。IDEA 会自动识别 `backend/pom.xml` 为 Maven 模块、`frontend/package.json` 为 npm 项目。

**2. 指定 SDK**：`File → Project Structure → Project SDK` 选 JDK 21（`D:\Java\JDK21`）。

**3.（可选但建议）换 Maven 镜像**：`Settings → Build, Execution, Deployment → Build Tools → Maven → User settings file` 选 `checkin-web/settings-aliyun.xml`。首次拉 Spring Boot 依赖约 40–60MB，官方源 230KB/s、阿里云 2.4MB/s。

**4. 启动后端**：打开 `CheckinApplication.java` → 点绿色三角 Run。端口 **8080**。
验证：浏览器打开 <http://localhost:8080/api/state> 应看到一段 JSON。

**5. 启动前端**：终端里

```bash
cd frontend
npm install      # 首次
npm run dev
```

打开 <http://localhost:5173> 即可。改前端代码会热更新；`/api` 请求由 Vite 代理到 8080，不用配 CORS。

> 也可以在 IDEA 右侧 `npm` 面板里双击 `dev` 脚本，效果一样。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/state` | 当前计划 + 全部打卡记录（前端据此整体重绘） |
| PUT | `/api/plan` | 改名称/起止日期，body：`{"title":"每日打卡","startDate":"2026-11-10","endDate":"2026-12-09"}` |
| POST | `/api/checkins` | 盖今天的章（日期由**服务端**决定，避免改客户端时间作弊） |
| DELETE | `/api/checkins/{date}` | 取消某天打卡，date 格式 `yyyy-MM-dd` |
| DELETE | `/api/checkins` | 清空全部记录 |

**所有接口都返回同一份 `StateDto`**，前端一次替换整体状态，不用维护增量同步：

```json
{
  "title": "每日打卡",
  "startDate": "2026-11-10",
  "endDate": "2026-12-09",
  "totalDays": 30,
  "records": [{ "date": "2026-11-10", "at": "2026-11-10T13:19:00Z" }]
}
```

业务错误统一返回 `400` + `{"message":"今天已经打过卡了"}`，前端直接把 message 弹成 toast。

## 业务规则（都在 `CheckinService`）

1. 计划有起止日期，**周期内每天最多盖一枚章**；周期外不能打卡（过期不可补）。
2. 格子数 = 周期天数，盖满即完成。
3. **格子代表"第 N 次打卡"**，不绑定具体日期 —— 隔几天打一次、跳着打都可以，章上写的是真实打卡日。
4. 取消任意一条后，后面的记录按日期前移一位（章上日期不变）。
5. 同一天并发提交由数据库唯一约束兜底，第二次返回"今天已经打过卡了"。

## 数据存储

H2 文件库，位置：`backend/data/checkin.mv.db`（首次启动自动创建）。
- 备份 = 复制这个文件。
- 想直接看表：启动后访问 <http://localhost:8080/h2-console>，JDBC URL 填 `jdbc:h2:file:./data/checkin`，用户 `sa`，密码空。
- 想换 MySQL：改 `application.yml` 的 datasource，并加上 mysql 驱动依赖即可，实体代码不用动。

## 测试

```bash
cd backend
mvn -s ../settings-aliyun.xml test
```

`CheckinApiTest` 覆盖：默认 30 天、每天只能打一次、取消后恢复、非法日期区间、周期外打卡被拒（用内存库，不动本地数据）。

## 常见问题

- **打开页面显示"打卡记录全没了"**：几乎一定是工作目录不对。数据库路径 `./data/checkin` 是相对路径，跟随启动时的工作目录——如果从工程根启动，会在根目录另建一个空库（`E:\Java\checkin-web\data\`），而真数据在 `backend/data/` 里。判别方法：看工程根下有没有多出一个 `data/` 文件夹。**解决：用工程内自带的运行配置 `.run/CheckinApplication`（工作目录已设为 backend），或把根目录的 `data/` 删掉后重启。**
- **8080 被占用**：改 `application.yml` 的 `server.port`，同时改 `frontend/vite.config.js` 里的 proxy target。
- **`npm install` 慢**：`npm config set registry https://registry.npmmirror.com`。
- **WorkBuddy 内置终端里启动报端口 54593**：WorkBuddy 环境变量里有 `SERVER__PORT`，Spring Boot 宽松绑定会把它当 `server.port`。先 `unset SERVER__PORT SERVER_PORT` 再启动（IDEA 里不受影响）。
- **前端报"连不上后端"**：后端没起，或端口不一致（看 proxy target）。
- **IDEA 里 Java 版本报错**：确认 Project SDK 和 `Settings → Build Tools → Maven → Runner → JRE` 都是 21。

## 下一步可以做的

- 打包成一个 jar 直接跑：`npm run build` 后把 `dist` 拷进 `backend/src/main/resources/static`，Spring Boot 就会顺带托前端。
- 多用户：加 `user_id` 字段 + 登录（Spring Security + JWT），把 `Plan`/`CheckIn` 按用户隔离。
- 换数据库：MySQL / PostgreSQL，配合 Flyway 做版本化建表。
