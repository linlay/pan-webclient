# Backend API

## 公共约定

- Base Path: `/api`
- 鉴权方式:
  - `GET /api/health` 无需鉴权
  - 其他接口需要以下任一方式
  - Web: Cookie Session
  - App: `Authorization: Bearer <token>`
- 通用错误响应:

```json
{
  "code": "BAD_REQUEST",
  "message": "invalid json body"
}
```

- 常见状态码: `200` `202` `204` `400` `401` `403` `404` `405` `409`
- `showHidden` 查询参数规则: `1`、`true`、`yes`、`on` 视为 `true`，其他值视为 `false`
- 路径查询参数 `path` 为空时，后端默认按 `/` 处理

## 数据结构

### ApiError

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | `string` | 错误码 |
| `message` | `string` | 错误信息 |

### SessionUser

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `username` | `string` | 当前登录用户名 |
| `authMethod` | `"session" \| "token"` | 鉴权方式 |

### MountRoot

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 挂载 ID |
| `name` | `string` | 挂载名称 |
| `path` | `string` | 挂载绝对路径 |

### FileEntry

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mountId` | `string` | 所属挂载 ID |
| `path` | `string` | 文件或目录相对挂载根路径 |
| `name` | `string` | 文件名 |
| `isDir` | `boolean` | 是否为目录 |
| `size` | `number` | 文件大小，目录可能为 `0` |
| `modTime` | `number` | 修改时间 Unix 时间戳 |
| `mime` | `string` | MIME 类型 |
| `extension` | `string` | 文件扩展名 |

### FileTreeNode

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mountId` | `string` | 所属挂载 ID |
| `path` | `string` | 目录路径 |
| `name` | `string` | 目录名 |
| `hasChildren` | `boolean` | 是否有子节点 |

### SearchHit

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mountId` | `string` | 所属挂载 ID |
| `path` | `string` | 命中文件路径 |
| `name` | `string` | 命中名称 |
| `isDir` | `boolean` | 是否目录 |
| `size` | `number` | 大小 |
| `modTime` | `number` | 修改时间 Unix 时间戳 |
| `mime` | `string` | MIME 类型 |

### PreviewMeta

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mountId` | `string` | 所属挂载 ID |
| `path` | `string` | 文件路径 |
| `name` | `string` | 文件名 |
| `kind` | `"directory" \| "image" \| "video" \| "audio" \| "pdf" \| "markdown" \| "text" \| "download" \| "unknown"` | 预览类型 |
| `mime` | `string` | MIME 类型 |
| `size` | `number` | 文件大小 |
| `modTime` | `number` | 修改时间 Unix 时间戳 |
| `content` | `string` | 文本或 Markdown 预览内容，仅部分类型返回 |
| `streamUrl` | `string` | 原始文件流地址，仅需要在线播放或下载时返回 |

### EditorDocument

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `mountId` | `string` | 所属挂载 ID |
| `path` | `string` | 文件路径 |
| `name` | `string` | 文件名 |
| `content` | `string` | 文件全文 |
| `language` | `string` | 编辑器语言类型 |
| `version` | `string` | 乐观锁版本 |

### TransferTaskItem

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | 条目名称 |
| `path` | `string` | 条目路径 |
| `size` | `number` | 条目大小 |
| `isDir` | `boolean` | 是否目录 |

### TransferTask

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 任务 ID |
| `kind` | `"upload" \| "download"` | 任务类型 |
| `status` | `"pending" \| "running" \| "success" \| "failed"` | 任务状态 |
| `detail` | `string` | 任务描述 |
| `items` | `TransferTaskItem[]` | 任务条目列表，可选 |
| `totalBytes` | `number` | 总字节数，可选 |
| `completedBytes` | `number` | 已完成字节数，可选 |
| `downloadUrl` | `string` | 下载地址，可选 |
| `createdAt` | `number` | 创建时间 Unix 时间戳 |
| `updatedAt` | `number` | 更新时间 Unix 时间戳 |

### TrashItem

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 回收站条目 ID |
| `mountId` | `string` | 原所属挂载 ID |
| `originalPath` | `string` | 原始路径 |
| `trashPath` | `string` | 回收站实际路径 |
| `deletedAt` | `number` | 删除时间 Unix 时间戳 |
| `isDir` | `boolean` | 是否目录 |
| `size` | `number` | 大小 |
| `name` | `string` | 名称 |

## 健康检查

### 健康检查

- Method + Path: `GET /api/health`
- 鉴权: 否
- 入参: 无
- 成功返回: `200 OK`

```json
{
  "status": "ok"
}
```

- 主要错误返回: 无特殊业务错误
- 备注: 用于存活检查

## 会话鉴权

### Web 登录

- Method + Path: `POST /api/web/session/login`
- 鉴权: 否
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | `string` | 是 | 用户名 |
| `password` | `string` | 是 | 密码 |

- 成功返回: `200 OK`，返回 `SessionUser`，并写入 Session Cookie

```json
{
  "username": "admin",
  "authMethod": "session"
}
```

- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `401 INVALID_CREDENTIALS`: 用户名或密码错误
  - `405 METHOD_NOT_ALLOWED`: 方法错误
  - `500 TOKEN_ERROR`: 会话签发失败
- 备注: Session Cookie 名称由配置 `SESSION_COOKIE_NAME` 决定

### Web 登出

- Method + Path: `POST /api/web/session/logout`
- 鉴权: 否
- Body(JSON): 可发送空对象
- 成功返回: `200 OK`

```json
{
  "ok": true
}
```

- 主要错误返回:
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 服务端通过清空 Cookie 完成登出

### 当前会话信息

- Method + Path: `GET /api/web/session/me`
- 鉴权: 是
- 入参: 无
- 成功返回: `200 OK`，返回 `SessionUser`
- 主要错误返回:
  - `401 UNAUTHORIZED`: 缺少或无效凭证
- 备注: 同时支持 Session Cookie 和 Bearer Token

## 挂载与浏览

### 挂载列表

- Method + Path: `GET /api/mounts`
- 鉴权: 是
- 入参: 无
- 成功返回: `200 OK`，返回 `MountRoot[]`
- 主要错误返回:
  - `401 UNAUTHORIZED`: 缺少或无效凭证
- 备注: 返回后端启动时加载的挂载配置

### 目录树

- Method + Path: `GET /api/tree`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 否 | 目录路径，默认 `/` |
| `showHidden` | `string` | 否 | 是否显示隐藏文件 |

- 成功返回: `200 OK`，返回 `FileTreeNode[]`
- 主要错误返回:
  - `400 MISSING_MOUNT`: 缺少 `mountId`
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 其他目录读取失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 挂载或路径不存在
- 备注: 仅返回目录节点，不返回普通文件

### 文件列表

- Method + Path: `GET /api/files`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 否 | 目录路径，默认 `/` |
| `showHidden` | `string` | 否 | 是否显示隐藏文件 |

- 成功返回: `200 OK`，返回 `FileEntry[]`
- 主要错误返回:
  - `400 MISSING_MOUNT`: 缺少 `mountId`
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 其他目录读取失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 挂载或路径不存在
- 备注: 返回指定目录下的文件和子目录

### 搜索

- Method + Path: `GET /api/search`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `q` | `string` | 否 | 搜索关键字，空字符串时直接返回空数组 |
| `showHidden` | `string` | 否 | 是否搜索隐藏文件 |

- 成功返回: `200 OK`，返回 `SearchHit[]`
- 主要错误返回:
  - `400 REQUEST_FAILED`: 搜索过程失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
- 备注: 搜索结果上限由后端固定为 100 条

## 文件操作

### 新建文件夹

- Method + Path: `POST /api/files/folder`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 父目录路径 |
| `name` | `string` | 是 | 新文件夹名 |

- 成功返回: `200 OK`，返回 `FileEntry`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 创建失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 父目录不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 返回新建目录对应的条目

### 复制文件或目录

- Method + Path: `POST /api/files/copy`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 源路径 |
| `targetDir` | `string` | 是 | 目标目录路径 |

- 成功返回: `200 OK`，返回 `FileEntry`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 复制失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 源路径或目标目录不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 返回复制后新条目

### 移动文件或目录

- Method + Path: `POST /api/files/move`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 源路径 |
| `targetDir` | `string` | 是 | 目标目录路径 |

- 成功返回: `200 OK`，返回 `FileEntry`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 移动失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 源路径或目标目录不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 返回移动后的条目

### 重命名文件或目录

- Method + Path: `POST /api/files/rename`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 原路径 |
| `newName` | `string` | 是 | 新名称 |

- 成功返回: `200 OK`，返回 `FileEntry`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 重命名失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 原路径不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 返回重命名后的条目

### 删除到回收站

- Method + Path: `POST /api/files/delete`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 要删除的路径 |

- 成功返回: `200 OK`

```json
{
  "ok": true
}
```

- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 删除失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 路径不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 实际行为是移动到回收站并写入垃圾桶记录，不是物理删除

## 预览与编辑

### 预览元数据

- Method + Path: `GET /api/preview`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 否 | 文件路径，默认 `/` |

- 成功返回: `200 OK`，返回 `PreviewMeta`
- 主要错误返回:
  - `400 MISSING_MOUNT`: 缺少 `mountId`
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 预览构建失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 路径不存在
- 备注: `streamUrl` 通常指向 `/api/files/raw`

### 读取文件内容

- Method + Path: `GET /api/files/content`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 否 | 文件路径，默认 `/` |

- 成功返回: `200 OK`，返回 `EditorDocument`
- 主要错误返回:
  - `400 MISSING_MOUNT`: 缺少 `mountId`
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 非文本文件、超出编辑大小限制或读取失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 路径不存在
- 备注: 仅适用于可在线编辑的文本类文件

### 保存文件内容

- Method + Path: `PUT /api/files/content`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 文件路径 |
| `content` | `string` | 是 | 新文件内容 |
| `version` | `string` | 是 | 当前文档版本 |

- 成功返回: `200 OK`，返回最新 `EditorDocument`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 保存失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 文件不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
  - `409 VERSION_CONFLICT`: 版本冲突
- 备注: 使用乐观锁版本控制并发编辑

### 读取原始文件流

- Method + Path: `GET /api/files/raw`
- 鉴权: 是
- Query:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 否 | 文件路径，默认 `/` |

- 成功返回: `200 OK`，响应体为文件二进制流
- 主要错误返回:
  - `400 MISSING_MOUNT`: 缺少 `mountId`
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 NOT_A_FILE`: 路径是目录
  - `400 REQUEST_FAILED`: 读取失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 文件不存在
- 备注:
  - 响应不是 JSON
  - `Content-Type` 优先按扩展名推断，失败时按文件内容探测

## 上传下载与任务

### 上传文件

- Method + Path: `POST /api/uploads`
- 鉴权: 是
- FormData:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `path` | `string` | 是 | 目标目录路径 |
| `files` | `file[]` | 是 | 待上传文件列表 |

- 成功返回: `200 OK`，返回 `TransferTask`
- 主要错误返回:
  - `400 UPLOAD_PARSE_FAILED`: 解析 multipart 失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注:
  - 请求体为 `multipart/form-data`
  - 返回的是上传任务快照
  - 当前实现即使部分文件上传失败，也可能返回 `success` 状态并只统计成功部分

### 任务列表

- Method + Path: `GET /api/tasks`
- 鉴权: 是
- 入参: 无
- 成功返回: `200 OK`，返回 `TransferTask[]`
- 主要错误返回:
  - `400 REQUEST_FAILED`: 读取任务列表失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 当前最多返回最近 100 条任务

### 创建批量下载任务

- Method + Path: `POST /api/downloads/batch`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `mountId` | `string` | 是 | 挂载 ID |
| `items` | `string[]` | 是 | 要打包的路径列表 |
| `archiveName` | `string` | 是 | 压缩包文件名 |

- 成功返回: `202 Accepted`，返回 `TransferTask`
- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法
  - `400 INVALID_PATH`: 路径越界或非法
  - `400 REQUEST_FAILED`: 打包任务创建失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `403 FORBIDDEN`: 无权限
  - `404 NOT_FOUND`: 某个源文件不存在
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 只是创建异步任务，不代表压缩包已经可下载

### 查询单个任务

- Method + Path: `GET /api/tasks/:id`
- 鉴权: 是
- Path:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 任务 ID |

- 成功返回: `200 OK`，返回 `TransferTask`
- 主要错误返回:
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `404 TASK_NOT_FOUND`: 任务不存在
- 备注: 动态路由由 `/api/tasks/` 统一分发

### 删除任务

- Method + Path: `DELETE /api/tasks/:id`
- 鉴权: 是
- Path:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 任务 ID |

- 成功返回: `200 OK`

```json
{
  "ok": true
}
```

- 主要错误返回:
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `404 TASK_NOT_FOUND`: 任务不存在
  - `409 TASK_ACTIVE`: 活跃任务不可删除
- 备注: 只有已结束任务才允许删除

### 下载任务产物

- Method + Path: `GET /api/tasks/:id/download`
- 鉴权: 是
- Path:

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | `string` | 是 | 任务 ID |

- 成功返回: `200 OK`，响应体为附件二进制流
- 主要错误返回:
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `404 TASK_NOT_FOUND`: 任务不存在
  - `409 TASK_NOT_READY`: 任务尚未成功完成或产物未准备好
- 备注:
  - 响应不是 JSON
  - 响应头包含 `Content-Disposition: attachment`

## 回收站

### 回收站列表

- Method + Path: `GET /api/trash`
- 鉴权: 是
- 入参: 无
- 成功返回: `200 OK`，返回 `TrashItem[]`
- 主要错误返回:
  - `400 REQUEST_FAILED`: 读取回收站失败
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注: 当前最多返回最近 100 条记录

### 恢复回收站条目

- Method + Path: `POST /api/trash/restore`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ids` | `string[]` | 是 | 回收站条目 ID 列表 |

- 成功返回:
  - `200 OK`: 全部恢复成功
  - `409 Conflict`: 部分恢复失败

```json
{
  "restored": 1,
  "conflicts": ["example.txt"]
}
```

- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法或 `ids` 为空
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注:
  - `conflicts` 中可能是条目 ID，也可能是文件名
  - 原路径已存在、挂载无法解析、目录无法创建等情况都会被计入冲突

### 彻底删除回收站条目

- Method + Path: `POST /api/trash/delete`
- 鉴权: 是
- Body(JSON):

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ids` | `string[]` | 是 | 回收站条目 ID 列表 |

- 成功返回:
  - `200 OK`: 全部删除成功
  - `409 Conflict`: 部分删除失败

```json
{
  "deleted": 1,
  "missing": ["example.txt"]
}
```

- 主要错误返回:
  - `400 BAD_REQUEST`: JSON 非法或 `ids` 为空
  - `401 UNAUTHORIZED`: 缺少或无效凭证
  - `405 METHOD_NOT_ALLOWED`: 方法错误
- 备注:
  - `missing` 中可能是条目 ID，也可能是文件名
  - 该接口执行物理删除，不可恢复
