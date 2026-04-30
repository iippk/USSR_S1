import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js'
import './assets/styles/main.css'
import DataVVue3 from 'datav-vue3-plus'

const app = createApp(App)
app.use(router)
app.use(DataVVue3)
app.mount('#app')
