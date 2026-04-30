# 部署说明（云开发）

## 1. 前置准备

- 已开通小程序云开发环境，并在开发者工具里选择该环境
- `miniprogram/app.js` 中的 `env` 已替换为你的云环境 ID

## 2. 云数据库集合

需要创建/确保存在以下集合：

- `users`
- `seats`
- `study_records`
- `orders`（新增：订座订单）
- `system_config`（新增：系统配置，可选但推荐）

`system_config` 建议新增一条文档：

- 文档 `_id`: `subscribe`
- 字段：`expireReminderTemplateId`: 订阅消息模板 ID（字符串）

## 3. 云函数部署

在微信开发者工具中对以下云函数依次执行“创建并部署：云端安装依赖”：

- `cloudfunctions/login`
- `cloudfunctions/reserveSeat`
- `cloudfunctions/getRanking`
- `cloudfunctions/getUserStats`
- `cloudfunctions/checkExpiredReservations`（已配置定时触发器）
- `cloudfunctions/sendExpireReminders`（已配置定时触发器）

## 4. 定时任务（已在 config.json 配置）

项目已在以下云函数的 `config.json` 写入 `triggers`：

- `checkExpiredReservations`：每 5 分钟扫描过期订单并释放座位
- `sendExpireReminders`：每 5 分钟扫描到期前约 3 小时的订单并发送订阅消息提醒

重新部署云函数后触发器会生效。若你的云开发环境/工具版本不支持自动触发器配置，也可在云开发控制台手动为以上函数添加同等周期的定时触发。

## 5. 订阅消息配置

1. 在小程序后台申请并启用“订阅消息”能力
2. 选择一个包含以下字段类型的模板（或按你的模板字段修改云函数发送数据结构）：
   - `thing1`：座位信息
   - `time2`：到期时间
   - `thing3`：提醒说明
3. 将模板 ID 写入：
   - `system_config/subscribe.expireReminderTemplateId`（推荐）
   - 或 `miniprogram/config.js` 的 `subscribeTemplateIdExpireReminder`（用于前端弹窗引导订阅授权）

## 6. 支付说明（当前为模拟支付）

默认启用模拟支付：

- `miniprogram/config.js`：`enableMockPay: true`

模拟支付会在下单后弹出确认框，点击“立即支付”后即视为支付成功并把座位状态更新为“已订”。

如需接入真实微信支付，需要补齐商户号、支付回调与统一下单等服务端能力，并将 `enableMockPay` 设为 `false` 后改造 `reserveSeat.createOrder` 返回 `wx.requestPayment` 所需参数。

