# 云函数上传失败排查报告（模板）

## 1. 问题现象

- 失败函数：`checkExpiredReservations`、`initSeats`、`sendExpireReminders`
- 报错信息：`ResourceNotFound.Function` / `未找到指定的Function，请创建后再试`
- 触发场景：在（微信开发者工具/CloudBase CLI/SCF CLI/Serverless Framework）执行（创建并部署/上传并部署/CLI deploy）时报错

## 2. 环境核对

- 小程序运行时云环境 ID：`miniprogram/app.js` 中的 `env = ______`
- 开发者工具当前选择的云环境：`______`
- 云端函数可见位置：
  - 云开发控制台：地域 `______` / 环境 `______`
  - SCF 控制台（如使用）：地域 `______` / 命名空间 `______`

## 3. 根因定位

勾选实际根因：

- [ ] 使用了“上传并部署”更新不存在的云函数（云端未创建）
- [ ] 部署到了错误的云环境/地域/命名空间（与 `envId` 不一致）
- [ ] 云端函数名与本地目录名/调用名不一致（含大小写）
- [ ] CAM 权限不足导致无法 Create/Update/Get
- [ ] CI/CD 环境变量（密钥、地域、envId）被覆盖或未注入
- [ ] 其他：______

## 4. 修复步骤记录

按实际执行填写：

1. ______
2. ______
3. ______

## 5. CAM 权限策略（粘贴 JSON）

```json
{
  "version": "2.0",
  "statement": [
    {
      "effect": "allow",
      "action": [],
      "resource": "*"
    }
  ]
}
```

## 6. 最终验证

- 函数列表截图：附图 `______`
- 版本/代码更新时间截图：附图 `______`
- 触发器截图（checkExpiredReservations/sendExpireReminders）：附图 `______`

## 7. 回归测试结果

| 函数 | 测试事件 | 期望 | 实际 | 结论 |
|---|---|---|---|---|
| initSeats | scripts/test-events/initSeats.json | 初始化/校验 seats 数据正常 | ______ | ✅/❌ |
| checkExpiredReservations | scripts/test-events/checkExpiredReservations.json | 返回释放统计或 0 | ______ | ✅/❌ |
| sendExpireReminders | scripts/test-events/sendExpireReminders.json | templateId 空时返回缺少模板 ID | ______ | ✅/❌ |

