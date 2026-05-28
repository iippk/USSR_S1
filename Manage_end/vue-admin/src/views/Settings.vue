<template>
  <div>
    <div class="settings-grid">
      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">💰</div>
          <div>
            <h2>分区价格配置</h2>
            <p>设置各包间区域的套餐价格（修改后小程序端实时同步）</p>
          </div>
        </div>
        <div class="section-body">
          <div class="zone-price-block">
            <div class="zone-price-header">
              <span class="zone-icon">🤫</span>
              <span class="zone-name" style="color: #2563eb">沉浸区</span>
              <span class="zone-desc">1-3行，深度专注静音区</span>
            </div>
            <div class="zone-price-row">
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">时价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.immersive.hour"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                  <span class="input-suffix">/小时</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">天价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.immersive.day"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/天</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">周价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.immersive.week"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/周</span>
                </div>
              </div>
            </div>
          </div>

          <div class="zone-price-block">
            <div class="zone-price-header">
              <span class="zone-icon">☀️</span>
              <span class="zone-name" style="color: #f59e0b">阳光区</span>
              <span class="zone-desc">4-5行，采光舒适区</span>
            </div>
            <div class="zone-price-row">
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">时价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.sunshine.hour"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                  <span class="input-suffix">/小时</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">天价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.sunshine.day"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/天</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">周价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.sunshine.week"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/周</span>
                </div>
              </div>
            </div>
          </div>

          <div class="zone-price-block">
            <div class="zone-price-header">
              <span class="zone-icon">👑</span>
              <span class="zone-name" style="color: #7c3aed">VIP区</span>
              <span class="zone-desc">6行，顶配尊享区</span>
            </div>
            <div class="zone-price-row">
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">时价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.vip.hour"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                  <span class="input-suffix">/小时</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">天价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.vip.day"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/天</span>
                </div>
              </div>
              <div class="setting-item compact">
                <div class="setting-label">
                  <span class="label-text">周价</span>
                </div>
                <div class="setting-input">
                  <span class="input-prefix">¥</span>
                  <input
                    v-model.number="settings.zonePrices.vip.week"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <span class="input-suffix">/周</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">⏰</div>
          <div>
            <h2>自动释放</h2>
            <p>座位超时自动释放策略</p>
          </div>
        </div>
        <div class="section-body">
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">到期前提醒时间</span>
              <span class="label-desc">到期前多少分钟提醒用户</span>
            </div>
            <div class="setting-input">
              <input
                v-model.number="settings.reminderMinutes"
                type="number"
                min="1"
                max="60"
              />
              <span class="input-suffix">分钟</span>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">超时宽限时间</span>
              <span class="label-desc">到期后宽限多少秒再释放</span>
            </div>
            <div class="setting-input">
              <input
                v-model.number="settings.gracePeriodSeconds"
                type="number"
                min="0"
                max="300"
              />
              <span class="input-suffix">秒</span>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">自动释放检查间隔</span>
              <span class="label-desc">前端检查器的基础间隔</span>
            </div>
            <div class="setting-input">
              <input
                v-model.number="settings.checkIntervalMs"
                type="number"
                min="1000"
                max="60000"
                step="1000"
              />
              <span class="input-suffix">毫秒</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">🎟️</div>
          <div>
            <h2>新人优惠</h2>
            <p>新用户注册时自动发放的优惠券</p>
          </div>
        </div>
        <div class="section-body">
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">新人优惠券</span>
              <span class="label-desc">注册时自动发放的优惠券类型</span>
            </div>
            <div class="setting-input">
              <select
                v-model="settings.newUserCouponType"
                class="filter-select"
                style="width: 100%"
              >
                <option value="standard">
                  标准（满10减3 × 2 + 满50减15 × 2 + 满300减100 × 2）
                </option>
                <option value="simple">简单（满10减3 × 3）</option>
                <option value="none">不发放</option>
              </select>
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">优惠券有效期</span>
              <span class="label-desc">新人优惠券的有效天数</span>
            </div>
            <div class="setting-input">
              <input
                v-model.number="settings.couponExpireDays"
                type="number"
                min="1"
                max="3650"
              />
              <span class="input-suffix">天</span>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-header">
          <div class="section-icon">🏢</div>
          <div>
            <h2>营业设置</h2>
            <p>自习室营业时间和维护模式</p>
          </div>
        </div>
        <div class="section-body">
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">营业开始时间</span>
              <span class="label-desc">每天开始营业的时间</span>
            </div>
            <div class="setting-input">
              <input v-model="settings.openTime" type="time" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">营业结束时间</span>
              <span class="label-desc">每天结束营业的时间</span>
            </div>
            <div class="setting-input">
              <input v-model="settings.closeTime" type="time" />
            </div>
          </div>
          <div class="setting-item">
            <div class="setting-label">
              <span class="label-text">维护模式</span>
              <span class="label-desc">开启后用户无法预约座位</span>
            </div>
            <div class="setting-input">
              <label class="toggle-switch">
                <input type="checkbox" v-model="settings.maintenanceMode" />
                <span class="toggle-slider"></span>
              </label>
              <span
                :style="{
                  color: settings.maintenanceMode
                    ? 'var(--color-error)'
                    : 'var(--color-success)',
                  fontWeight: 500,
                  fontSize: '13px',
                }"
              >
                {{ settings.maintenanceMode ? "维护中" : "正常运行" }}
              </span>
            </div>
          </div>
          <div class="setting-item" v-if="settings.maintenanceMode">
            <div class="setting-label">
              <span class="label-text">维护公告</span>
              <span class="label-desc">维护期间显示给用户的通知</span>
            </div>
            <div class="setting-input" style="width: 100%">
              <input
                v-model="settings.maintenanceMessage"
                type="text"
                placeholder="如：系统升级维护中，预计2小时后恢复"
                style="width: 100%"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="save-bar">
      <button
        class="btn btn-primary"
        @click="saveSettings"
        style="padding: 12px 32px; font-size: 15px"
      >
        保存设置
      </button>
      <button
        class="btn btn-outline"
        @click="loadSettings"
        style="padding: 12px 24px"
      >
        重置
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import {
  callCloudFunction,
  ensureCloudReady,
} from "../utils/cloudBase.js";

const toast = inject("toast");
const loading = inject("loading");

const defaultSettings = {
  zonePrices: {
    immersive: { hour: 3, day: 21, week: 126 },
    sunshine: { hour: 4, day: 28, week: 168 },
    vip: { hour: 6, day: 42, week: 252 },
  },
  reminderMinutes: 30,
  gracePeriodSeconds: 60,
  checkIntervalMs: 5000,
  newUserCouponType: "standard",
  couponExpireDays: 365,
  openTime: "06:00",
  closeTime: "23:00",
  maintenanceMode: false,
  maintenanceMessage: "系统维护中，请稍后再试",
};

const settings = ref({ ...defaultSettings });

const loadSettings = async () => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");

    const res = await callCloudFunction("getSettings", {
      action: "getSettings",
    });
    if (res && res.success && res.data) {
      const { _id, _openid, ...data } = res.data;
      settings.value = { ...defaultSettings, ...data };
    }
  } catch (error) {
    console.error("加载设置失败:", error);
    settings.value = { ...defaultSettings };
  }
  loading.showLoadingState(false);
};

const saveSettings = async () => {
  loading.showLoadingState(true);
  try {
    const ready = await ensureCloudReady(); if (!ready) throw new Error("云开发初始化失败");

    const settingsData = { ...settings.value };
    delete settingsData._id;
    delete settingsData._openid;

    const res = await callCloudFunction("getSettings", {
      action: "saveSettings",
      settingsData: settingsData,
    });

    if (res && res.success) {
      toast.showToastMessage("设置已保存", "success");
    } else {
      toast.showToastMessage("保存失败: " + (res.error || "未知错误"), "error");
    }
  } catch (error) {
    console.error("保存设置失败:", error);
    toast.showToastMessage("保存失败: " + error.message, "error");
  }
  loading.showLoadingState(false);
};

loadSettings();
</script>

<style scoped>
.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 80px;
}

.settings-section {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-light);
}

.section-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.section-header h2 {
  font: var(--font-h3);
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.section-header p {
  font: var(--font-small);
  color: var(--color-text-aux);
}

.section-body {
  padding: 8px 24px 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--color-border-light);
  gap: 20px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  min-width: 0;
}

.label-text {
  display: block;
  font: 500 14px/1.3 var(--font-family);
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.label-desc {
  display: block;
  font: var(--font-small);
  color: var(--color-text-aux);
}

.setting-input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.setting-input input[type="number"],
.setting-input input[type="text"],
.setting-input input[type="time"] {
  width: 120px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font: var(--font-body);
  text-align: center;
  transition: all var(--transition-normal);
}

.setting-input input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.input-prefix,
.input-suffix {
  font: var(--font-small);
  color: var(--color-text-aux);
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--color-border);
  border-radius: 24px;
  transition: all var(--transition-normal);
}

.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all var(--transition-normal);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.save-bar {
  position: fixed;
  bottom: 0;
  left: 240px;
  right: 0;
  background: var(--color-surface);
  padding: 16px 28px;
  display: flex;
  gap: 12px;
  justify-content: center;
  box-shadow: 0 -2px 8px rgba(74, 144, 226, 0.08);
  border-top: 1px solid var(--color-border-light);
  z-index: 50;
}

.zone-price-block {
  background: var(--color-primary-bg);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin-bottom: 16px;
}

.zone-price-block:last-child {
  margin-bottom: 0;
}

.zone-price-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.zone-icon {
  font-size: 18px;
}

.zone-name {
  font: 600 15px/1.3 var(--font-family);
  font-weight: 700;
}

.zone-desc {
  font: var(--font-small);
  color: var(--color-text-aux);
  margin-left: auto;
}

.zone-price-row {
  display: flex;
  gap: 16px;
}

.zone-price-row .setting-item.compact {
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: none;
  gap: 6px;
}

.zone-price-row .setting-item.compact .setting-input {
  width: 100%;
}

.zone-price-row .setting-item.compact .setting-input input {
  width: 100%;
  text-align: center;
}

@media (max-width: 1024px) {
  .save-bar {
    left: 68px;
  }
}

@media (max-width: 768px) {
  .save-bar {
    left: 0;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .setting-input {
    width: 100%;
  }

  .setting-input input[type="number"],
  .setting-input input[type="text"],
  .setting-input input[type="time"] {
    flex: 1;
    width: auto;
  }
}
</style>
