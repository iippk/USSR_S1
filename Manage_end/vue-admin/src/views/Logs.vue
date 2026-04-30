<template>
  <div>
    <div class="toolbar">
      <div class="toolbar-left">
        <select v-model="typeFilter" class="filter-select" @change="filterLogs">
          <option value="">全部类型</option>
          <option value="release">释放</option>
          <option value="add">添加</option>
          <option value="edit">编辑</option>
          <option value="delete">删除</option>
          <option value="order">订单</option>
        </select>
      </div>
      <div class="toolbar-right">
        <button class="btn btn-danger" @click="clearLogs">清空日志</button>
      </div>
    </div>

    <div class="logs-container">
      <div v-if="filteredLogs.length === 0" class="empty-state">
        <div class="icon">📝</div>
        暂无操作日志
      </div>

      <div v-else class="log-list">
        <div v-for="(log, index) in filteredLogs" :key="index" class="log-item">
          <span class="log-time">{{ formatDate(log.time) }}</span>
          <span :class="['log-type', `log-type-${log.type}`]">{{
            getTypeName(log.type)
          }}</span>
          <span class="log-desc">{{ log.desc }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, inject } from "vue";
import { formatDate as fmtDate } from "../utils/cloudBase.js";

const toast = inject("toast");

const allLogs = ref([]);
const filteredLogs = ref([]);
const typeFilter = ref("");

const filterLogs = () => {
  if (!typeFilter.value) {
    filteredLogs.value = [...allLogs.value];
  } else {
    filteredLogs.value = allLogs.value.filter(
      (log) => log.type === typeFilter.value
    );
  }
};

const loadLogsFromStorage = () => {
  try {
    const saved = localStorage.getItem("adminOperationLogs");
    if (saved) {
      allLogs.value = JSON.parse(saved);
      filterLogs();
    }
  } catch (e) {
    console.error("加载日志失败:", e);
  }
};

const clearLogs = () => {
  if (!confirm("确定要清空所有操作日志吗？")) return;

  allLogs.value = [];
  filteredLogs.value = [];

  try {
    localStorage.setItem("adminOperationLogs", JSON.stringify([]));
    toast.showToastMessage("日志已清空", "success");
  } catch (e) {
    console.error("清空日志失败:", e);
  }
};

const getTypeName = (type) => {
  const map = {
    release: "释放",
    add: "添加",
    edit: "编辑",
    delete: "删除",
    order: "订单",
  };
  return map[type] || type;
};

const formatDate = fmtDate;

onMounted(() => {
  loadLogsFromStorage();
});
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  gap: 10px;
}

.logs-container {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  max-height: 600px;
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  background: white;
  padding: 14px 18px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
}

.log-item:hover {
  transform: translateX(4px);
}

.log-time {
  color: #888;
  font-size: 13px;
  min-width: 180px;
}

.log-type {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
}

.log-type-release {
  background: #fee;
  color: #c33;
}

.log-type-add {
  background: #d4edda;
  color: #155724;
}

.log-type-edit {
  background: #fff3cd;
  color: #856404;
}

.log-type-delete {
  background: #f8d7da;
  color: #721c24;
}

.log-type-order {
  background: #cce5ff;
  color: #004085;
}

.log-desc {
  flex: 1;
  color: #333;
  font-size: 14px;
}
</style>
