<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <div class="header-bar"></div>
        <div class="header-content">
          <div class="logo-icon">🎓</div>
          <h1>无人自习室</h1>
          <p>后台管理系统</p>
        </div>
      </div>

      <div class="login-body">
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

        <div class="form-group">
          <label>管理员账号</label>
          <input
            v-model="username"
            type="text"
            placeholder="请输入账号"
            @keypress.enter="handleLogin"
          />
        </div>

        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            @keypress.enter="handleLogin"
          />
        </div>

        <button class="btn-login" @click="handleLogin">登录系统</button>
      </div>
    </div>

    <div class="login-footer">
      <span>USSR Admin v2.0 · Vue3</span>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import { ADMIN_CONFIG } from "../config/cloud.js";
import { initCloudBase } from "../utils/cloudBase.js";

const emit = defineEmits(["login"]);
const toast = inject("toast");
const loading = inject("loading");

const username = ref("");
const password = ref("");
const errorMsg = ref("");

const handleLogin = async () => {
  if (!username.value || !password.value) {
    errorMsg.value = "请输入账号和密码";
    return;
  }

  if (
    username.value !== ADMIN_CONFIG.USERNAME ||
    password.value !== ADMIN_CONFIG.PASSWORD
  ) {
    errorMsg.value = "账号或密码错误";
    return;
  }

  loading.showLoadingState(true);
  errorMsg.value = "";

  try {
    await initCloudBase();
    localStorage.setItem("isAdminLoggedIn", "true");
    localStorage.setItem("loginTime", new Date().toISOString());
    toast.showToastMessage("登录成功", "success");
    emit("login");
  } catch (error) {
    errorMsg.value = "云开发初始化失败: " + error.message;
    toast.showToastMessage(error.message, "error");
  }

  loading.showLoadingState(false);
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.login-header {
  position: relative;
  text-align: center;
  padding: 36px 40px 28px;
}

.header-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #4a90e2, #66b2ff);
}

.header-content {
  position: relative;
}

.logo-icon {
  width: 56px;
  height: 56px;
  background: var(--color-primary-bg);
  border-radius: var(--radius-lg);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 16px;
}

.login-header h1 {
  font: var(--font-h1);
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.login-header p {
  font: var(--font-body);
  color: var(--color-text-aux);
}

.login-body {
  padding: 0 40px 36px;
}

.error-message {
  background: var(--color-error-bg);
  color: var(--color-error);
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font: var(--font-small);
  text-align: center;
}

.btn-login {
  width: 100%;
  padding: 13px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font: 600 15px/1 var(--font-family);
  cursor: pointer;
  transition: all var(--transition-normal);
  margin-top: 8px;
}

.btn-login:hover {
  background: var(--color-primary-hover);
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.35);
}

.btn-login:active {
  transform: scale(0.98);
}

.login-footer {
  margin-top: 24px;
  font: var(--font-small);
  color: var(--color-text-aux);
}
</style>
