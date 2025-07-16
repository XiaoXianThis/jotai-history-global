# jotai-history-global

为 Jotai 提供全局撤销、重做功能的轻量扩展。

#### Language: [English](README-EN.md) | [中文](README.md)

## 功能特性

- 全局历史栈用于跟踪状态变更
- **差异化存储** 实现最小内存占用
- **O(1) atom 查找** 使用 Map 获得快速性能
- 撤销和重做功能
- 分组操作以批量处理多个更改
- 自定义差异和补丁函数
- 历史限制

## 性能优势

- **内存使用**: 与完整状态存储相比减少 80-95%
- **性能**: 典型应用速度提升 5-20 倍，大型应用可提升至 100 倍
- **效率**: 使用 O(1) 查找代替 O(n) 查找原子

## 前置配置
安装
```shell
  npm i jotai-history-global
```
配置 Provider
```tsx
// 导入
import {Provider} from "jotai";
import { historyStore } from 'jotai-history-global';

// 使用 Provider 包裹 App
// 并设置 store={historyStore}
<Provider store={historyStore}>
  <App />
</Provider>
```

## 基本用法

### 1. 创建带历史记录的原子

使用 `atomWithHistory()` 代替 Jotai 的 `atom()` 函数：

```tsx
import { atomWithHistory } from 'jotai-history-global';

// 创建跟踪历史的原子
const counterAtom = atomWithHistory(0);

// 也可用创建更多，只要是 atomWithHistory，修改时都会被记录。
// const nameAtom = atomWithHistory('John');
// const todosAtom = atomWithHistory([{ id: 1, text: '学习 Jotai', done: false }]);
```

### 2. 在组件中使用历史钩子

```tsx
import { useAtom } from 'jotai';
import { useHistory } from 'jotai-history-global';

function MyComponent() {
  const [counter, setCounter] = useAtom(counterAtom);
  const { undo, redo, canUndo, canRedo } = useHistory();

  return (
    <div>
      <p>计数器: {counter}</p>
      
      <button onClick={() => setCounter(counter + 1)}>增加</button>
      <button onClick={undo} disabled={!canUndo}>撤销</button>
      <button onClick={redo} disabled={!canRedo}>重做</button>
    </div>
  );
}
```

## 高级功能

### 分组操作

您可以将多个操作分组到单个历史条目中：

```tsx
const { groupOperations } = useHistory();

// 这将为所有操作创建一个单一的历史条目
groupOperations(() => {
  setName('Jane');
  setAge(30);
  setLocation('纽约');
});
```

### 自定义跟踪条件

您可以控制何时记录历史：

```tsx
// 仅在值变化超过10时跟踪变更
const scoreAtom = atomWithHistory(0, {
  shouldTrack: (prev, next) => Math.abs(next - prev) > 10
});
```

### 自定义差异函数

用于内置差异逻辑不理想的复杂对象：

```tsx
const complexDataAtom = atomWithHistory(initialData, {
  // 自定义差异计算
  customDiff: (prev, next) => {
    // 仅返回变更部分
    return { changedProperties: getOnlyChangedProps(prev, next) };
  },
  // 自定义补丁应用
  customPatch: (value, diff) => {
    // 将自定义差异应用到值
    return { ...value, ...diff.changedProperties };
  }
});
```

### 使用完整值代替差异

适用于差异可能比值本身更大的情况：

```tsx
const smallObjectAtom = atomWithHistory(smallObject, {
  useFullValueInstead: true // 存储完整值而不是差异
});
```

## API 参考

### `atomWithHistory<Value>(initialValue: Value, options?: AtomWithHistoryOptions<Value>)`

创建一个跟踪其历史记录以进行撤销/重做操作的原子。

选项包括：
- `id`：自定义标识符
- `historyLimit`：最大历史条目数（默认：50）
- `shouldTrack`：确定是否应跟踪变化的函数
- `customDiff`：自定义差异函数
- `customPatch`：自定义补丁函数
- `useFullValueInstead`：强制使用完整值而不是差异

### `useHistory()`

提供撤销/重做功能的钩子：

- `undo()` - 恢复到上一个状态
- `redo()` - 应用下一个状态（撤销后）
- `canUndo` - 是否有可撤销的状态
- `canRedo` - 是否有可重做的状态
- `clear()` - 清除历史栈
- `groupOperations(callback)` - 将操作分组到单个历史条目中

### 底层差异工具

- `createDiff(oldValue, newValue)` - 创建两个值之间的差异
- `applyDiff(value, diff)` - 将差异应用到值
- `reverseDiff(diff)` - 反转差异以进行撤销操作 