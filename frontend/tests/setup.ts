import { config } from '@vue/test-utils';
import { createStore } from 'vuex';

// 设置全局 Vuex store
const store = createStore({
  state: {
    // 测试状态
  },
});

// 设置全局组件配置
config.global.plugins = [store];

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});