# 文件夹显示名与路径分离改动总结

## 背景

原有页面目录树中的“文件夹”并不是独立实体，而是由 `pages.path` 按 `/` 拆分后生成的虚拟目录。

例如页面路径：

```text
case/product-a
```

目录树会自动生成：

```text
case
└─ product-a
```

因此原有逻辑里：

```text
文件夹显示名 = 路径段
```

这在英文场景可接受，但中文场景不理想。例如希望：

```text
显示名：案例
路径名：case
URL：/zh/case/product-a
```

本次实现目标是：

> 保持 `pages.path` 作为真实路径和源数据不变，只为虚拟目录增加显示名元数据。

---

## 设计原则

### 保持不变

以下逻辑仍然使用真实路径 `path`：

- URL 路由
- 页面权限判断
- 页面 hash
- 页面存储路径
- 搜索索引路径
- 页面移动逻辑
- 页面链接修复

### 新增能力

新增独立元数据记录：

```text
localeCode + path => title
```

示例：

```text
zh + case => 案例
zh + case/product => 产品
```

目录树展示时优先使用该元数据标题；没有元数据时回退到原路径段。

---

## 数据库改动

### 新增迁移

新增表：

```text
pageFolderMeta
```

文件：

```text
server/db/migrations/2.5.202.js
server/db/migrations-sqlite/2.5.202.js
```

字段：

```text
id
localeCode
path
title
createdAt
updatedAt
```

唯一约束：

```text
unique(localeCode, path)
```

说明：

- `path` 是真实目录路径，例如 `case`、`case/product`。
- `title` 是显示名，例如 `案例`、`产品`。
- `localeCode` 保留多语言维度，默认可用于中文 locale。

---

## 后端模型改动

### 新增模型

文件：

```text
server/models/pageFolderMeta.js
```

主要方法：

### `upsertMeta({ locale, localeCode, path, title })`

用于新增或更新目录显示名。

行为：

- 标准化 path，去掉首尾 `/`。
- 标准化 title，去掉首尾空格。
- 如果 `localeCode + path` 已存在，则更新 `title`。
- 否则插入新记录。

### `copyMeta({ sourceLocale, sourcePath, destinationLocale, destinationPath })`

用于页面移动时复制父目录显示名。

示例：

```text
旧路径：case/a
新路径：cases/a
```

如果已有：

```text
zh + case => 案例
```

则复制为：

```text
zh + cases => 案例
```

旧记录不会删除，因此允许空文件夹 meta 存在。

---

## GraphQL 改动

### 新增 mutation

文件：

```text
server/graph/schemas/page.graphql
```

新增：

```graphql
setFolderMeta(
  locale: String!
  path: String!
  title: String!
): DefaultResponse @auth(requires: ["write:pages", "manage:pages", "manage:system"])
```

### 新增 resolver

文件：

```text
server/graph/resolvers/page.js
```

新增逻辑：

```js
await WIKI.models.pageFolderMeta.upsertMeta(args)
await WIKI.models.pages.rebuildTree()
```

说明：

- 保存目录显示名后会触发目录树重建。
- 目录树重建后，前端读取到的 `PageTreeItem.title` 会变成显示名。

---

## 目录树重建改动

文件：

```text
server/jobs/rebuild-tree.js
```

原逻辑：

```js
title: isFolder ? part : page.title
```

新逻辑：

```js
title: isFolder ? (folderTitle || part) : page.title
```

新增处理：

1. 读取全部 `pageFolderMeta`。
2. 构建映射：

```text
localeCode|path => title
```

3. 生成虚拟目录节点时，优先使用 meta title。
4. 没有 meta 时继续使用路径段，保持兼容。

---

## 页面移动同步改动

文件：

```text
server/models/pages.js
```

在 `movePage` 中新增父目录 meta 复制逻辑。

示例：

```text
case/a -> cases/a
```

会尝试复制：

```text
case => cases
```

也就是：

```text
zh + case => 案例
zh + cases => 案例
```

注意：

- 这是复制，不是删除或重命名。
- 旧 meta 保留，允许空目录显示名存在。
- 不改变真实页面路径移动流程。

---

## 前端改动

### 页面选择器改动

文件：

```text
client/components/common/page-selector.vue
```

新增“新建文件夹”输入区域，拆成两个字段：

```text
文件夹显示名
路径名
```

示例输入：

```text
文件夹显示名：案例
路径名：case
```

结果：

```text
目录树显示：案例
真实路径：case
```

### 路径编辑方式调整

原来底部直接编辑完整路径。

现在拆成：

```text
选择文件夹：/case
文章路径名：product-a
最终路径：/case/product-a
```

目的：

- 避免用户在“文章路径名”里输入 `/` 造成路径混乱。
- 让目录选择和页面 slug 更清晰。

### 新增虚拟目录逻辑

新增状态：

```js
newFolderTitle
newFolderName
virtualFolderId
currentFolderPath
currentSlug
```

新增方法：

```js
compilePathSegment()
setPathParts()
updateCurrentPath()
getCurrentFolderById()
addVirtualFolder()
saveFolderMeta()
```

其中 `saveFolderMeta()` 调用新增 GraphQL mutation 保存显示名。

### 新增前端 GraphQL 文件

文件：

```text
client/graph/common/common-pages-mutation-folder-meta.gql
```

内容：

```graphql
mutation($locale: String!, $path: String!, $title: String!) {
  pages {
    setFolderMeta(locale: $locale, path: $path, title: $title) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
```

---

## Admin 页面临时修复

调试过程中发现 Admin 页面有两个运行时问题，一并修复。

文件：

```text
client/components/admin.vue
```

### 1. Vuex 重复注册

原逻辑每次加载都执行：

```js
WIKI.$store.registerModule('admin', adminStore)
```

热更新或重复进入 Admin 时会报：

```text
[vuex] duplicate namespace admin/
```

改为：

```js
if (!WIKI.$store.hasModule('admin')) {
  WIKI.$store.registerModule('admin', adminStore)
}
```

### 2. lodash 运行时报错

原先 `hasPermission` 使用 lodash：

```js
_.isArray()
_.some()
_.includes()
```

在当前热更新/打包环境下出现：

```text
lodash_some is not a function
_ is not defined
```

改为原生数组方法：

```js
hasPermission(prm) {
  const permissions = Array.isArray(this.permissions) ? this.permissions : []
  if (Array.isArray(prm)) {
    return prm.some(p => permissions.includes(p))
  } else {
    return permissions.includes(prm)
  }
}
```

---

## 验证命令

已执行前端 lint：

```bash
npx eslint --format codeframe "client/components/common/page-selector.vue"
npx eslint --format codeframe "client/components/admin.vue"
```

已执行后端语法检查：

```bash
node -c "server/models/pageFolderMeta.js"
node -c "server/jobs/rebuild-tree.js"
node -c "server/models/pages.js"
node -c "server/graph/resolvers/page.js"
node -c "server/db/migrations/2.5.202.js"
node -c "server/db/migrations-sqlite/2.5.202.js"
```

均通过。

---

## 使用示例

### 新建中文显示名目录

在页面选择器中：

```text
文件夹显示名：案例
路径名：case
```

创建页面：

```text
文章路径名：product-a
```

最终：

```text
URL：/zh/case/product-a
目录显示：案例
```

### 移动页面

如果已有：

```text
zh + case => 案例
```

移动：

```text
case/product-a -> cases/product-a
```

会复制显示名：

```text
zh + cases => 案例
```

---

## 风险与注意事项

### 1. 真实路径仍是唯一源数据

不要把 `pageFolderMeta.title` 用于：

- 路由
- 权限
- 搜索 path
- 存储 path
- 页面 hash

它只用于目录树显示。

### 2. 空目录 meta 允许存在

当目录下页面删除后，`pageFolderMeta` 不会自动清理。

这是当前设计允许的行为。

### 3. 页面移动只复制父目录 meta

当前不是完整的“目录移动系统”。

移动单个页面时，会复制该页面父目录的显示名。

如果未来要支持完整目录移动，可以扩展为批量复制或迁移：

```text
case/* => cases/*
```

并同步：

```text
case/foo => cases/foo
```

### 4. HMR 缓存问题

开发环境热更新时可能出现旧模块缓存残留，例如：

```text
sync is not defined
lodash_some is not a function
```

如果源码中已经没有相关引用，建议：

```text
Ctrl + F5 强刷
或重启前端 dev server
```

---

## 涉及文件清单

### 文件夹显示名功能

```text
server/db/migrations/2.5.202.js
server/db/migrations-sqlite/2.5.202.js
server/models/pageFolderMeta.js
server/jobs/rebuild-tree.js
server/graph/schemas/page.graphql
server/graph/resolvers/page.js
server/models/pages.js
client/components/common/page-selector.vue
client/graph/common/common-pages-mutation-folder-meta.gql
```

### Admin 运行时修复

```text
client/components/admin.vue
```

---

## 非本功能范围

本次没有把目录改成真正的数据库实体，也没有改变页面真实路径模型。

未改动：

```text
pages.path 的含义
权限模型
路由解析
搜索索引路径语义
存储同步路径语义
页面 hash 生成规则
```
