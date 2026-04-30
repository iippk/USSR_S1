<template>
  <div id="app-wrapper">
    <Login v-if="!isLoggedIn" @login="handleLogin" />
    <template v-else>
      <AdminPanel @logout="handleLogout" />
    </template>

    <!-- 全局组件 -->
    <Toast :message="toastMessage" :type="toastType" :show="showToast" />
    <Loading :show="loading" />
  </div>
</template>

<script setup>
import { ref, provide, onMounted } from "vue";
import { useRouter } from "vue-router";
import Login from "./views/Login.vue";
import AdminPanel from "./views/AdminPanel.vue";
import Toast from "./components/Toast.vue";
import Loading from "./components/Loading.vue";

const router = useRouter();
const isLoggedIn = ref(false);
const toastMessage = ref("");
const toastType = ref("info");
const showToast = ref(false);
const loading = ref(false);

const handleLogin = () => {
  isLoggedIn.value = true;
  router.push("/dashboard");
};

const handleLogout = () => {
  isLoggedIn.value = false;
};

const showToastMessage = (message, type = "info") => {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3500);
};

const showLoadingState = (show) => {
  loading.value = show;
};

provide("toast", { showToastMessage });
provide("loading", { showLoadingState });

onMounted(() => {
  const loggedIn = localStorage.getItem("isAdminLoggedIn");
  if (loggedIn === "true") {
    isLoggedIn.value = true;
  }
});
</script>

<style>
#app-wrapper {
  min-height: 100vh;
}
</style>
