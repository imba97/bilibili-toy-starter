// filepath: src/constants.ts
//
// 全局常量集中地。当前只放跨多个组件引用的硬编码字符串 —— 新增「多处共用
// 且不属于业务逻辑/SDK 包装」的常量也往这里加，避免散落在各组件里手抄同步。
//
// 跟 composables/ 的区别：composables 是 Vue 工具（ref / 副作用 / SDK 包装），
// 本文件是纯静态字面量。

/** 仓库地址 —— 用于顶栏跳转链接与页脚 commit 链接 */
export const REPO_URL = 'https://github.com/imba97/bilibili-toy-starter'
