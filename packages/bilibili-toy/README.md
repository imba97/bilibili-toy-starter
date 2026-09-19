# bilibili-toy

Bilibili Toy 平台的 TypeScript SDK 封装。

## 特性

- **零依赖**：纯 TypeScript，无运行时依赖
- **类型安全**：完整的 ToySDK 类型声明，IDE 自动补全
- **扁平 API**：import { rank, cloud } from bilibili-toy，无需嵌套
- **Proxy 动态转发**：新增 SDK 方法自动可用，无需手写代理
- **错误归一化**：统一 [bilibili-toy] 前缀，方便定位

## 安装

```bash
npm install bilibili-toy
```

## 使用

```ts
import { toy, rank, cloud, user } from 'bilibili-toy'

// 1. 握手（等待 window.toy 加载）
await toy.ready()

// 2. 直接调用 namespace 方法
await rank.submit({ score: 100 })
const list = await rank.list()
const me = await user.profile()
await cloud.set({ key: 'value' })
```

## API

### toy（平台能力）

| 方法                   | 说明                                       |
| ---------------------- | ------------------------------------------ |
| toy.ready(timeout?)    | 等待 SDK 加载，超时抛 ToyNotAvailableError |
| toy.isAvailable()      | 同步探测 window.toy 是否存在               |
| toy.isSupport(ability) | 查询平台是否支持某能力                     |

### rank（排行榜）

| 方法             | 说明         |
| ---------------- | ------------ |
| rank.submit(req) | 提交分数     |
| rank.list(req?)  | 获取榜单     |
| rank.me(req?)    | 获取我的排名 |

### cloud（云存储）

| 方法               | 说明             |
| ------------------ | ---------------- |
| cloud.get(keys?)   | 读取；不传读全部 |
| cloud.set(items)   | 批量写入         |
| cloud.remove(keys) | 批量删除         |

### user（用户）

| 方法           | 说明         |
| -------------- | ------------ |
| user.profile() | 获取用户资料 |

### author（作者）

| 方法               | 说明               |
| ------------------ | ------------------ |
| author.profile()   | 获取作者资料       |
| author.videos(req) | 获取作者视频列表   |
| author.relation()  | 获取用户与作者关系 |

### video（视频）

| 方法               | 说明                     |
| ------------------ | ------------------------ |
| video.actions(req) | 获取用户对视频的互动状态 |

### share（分享）

| 方法                 | 说明           |
| -------------------- | -------------- |
| share.navigate(req)  | 页面跳转       |
| share.to(req)        | 拉起分享面板   |
| share.qrCode(req?)   | 生成二维码     |
| share.saveImage(req) | 保存图片到相册 |
| share.closeBrowser() | 关闭 WebView   |

### container（容器）

| 方法                   | 说明             |
| ---------------------- | ---------------- |
| container.onChange(cb) | 监听容器状态变化 |
| container.state()      | 获取当前容器状态 |
| container.setMode(req) | 设置容器模式     |

### media（媒体）

| 方法                       | 说明       |
| -------------------------- | ---------- |
| media.requestCamera(opts?) | 申请摄像头 |
| media.requestMicrophone()  | 申请麦克风 |
| media.stopMedia(stream)    | 释放媒体流 |

## 错误处理

```ts
import { isToyError, ToyNotAvailableError } from 'bilibili-toy'

try {
  await rank.submit({ score: 100 })
} catch (err) {
  if (err instanceof ToyNotAvailableError) {
    // 不在 Toy 容器内
  } else if (isToyError(err)) {
    // Toy SDK 错误，可访问 err.code / err.status
  }
}
```

## 重试

```ts
import { withRetry } from 'bilibili-toy'

// 默认只对 unavailable 状态重试
await withRetry(() => rank.submit({ score: 100 }))
```

## License

MIT
