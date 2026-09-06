# 项目架构

本项目采用 Next.js App Router 与按业务功能组织的模块化单体结构。目标是在不增加状态库或第二套 UI 系统的前提下，让业务规则、浏览器存储和页面展示可以独立演进。

## 目录职责

```text
src/
├─ app/                         # Next.js 路由、布局和全局设计令牌
├─ components/ui/               # 可跨业务复用的基础 UI 组件
├─ features/inspection/
│  ├─ components/               # 巡检界面，按泵区、皮带、历史和弹窗拆分
│  ├─ hooks/                    # 草稿同步、历史管理和备份恢复编排
│  ├─ model/                    # 类型、设备配置、字段规则、校验和草稿仲裁
│  ├─ storage/                  # localStorage 兼容层
│  ├─ sync/                     # 云同步、持久化离线操作队列与冲突保护
│  └─ index.ts                  # 模块公开入口
├─ features/account/            # 账号面板、头像、导航偏好及其本地/云端同步
├─ features/auth/               # Supabase 登录、注册、邮箱验证、密码恢复与会话撤销
├─ lib/supabase/                # 浏览器 Supabase 客户端
└─ lib/                         # 与具体业务无关的通用工具
```

## 依赖方向

```text
app → features/inspection → components/ui
    → features/account    → lib

components → hooks → model
                   → storage → model
```

- `app` 只负责路由入口，不放巡检业务。
- `model` 是纯 TypeScript，不依赖 React、DOM、动画或 localStorage。
- `storage` 是唯一可以直接访问巡检 localStorage 键的目录。
- `sync` 通过 `storage` 保留本地优先语义，并把账号数据同步到 Supabase。
- `features/account` 独立管理用户偏好缓存、私有头像和账号面板，不把账号设置混入巡检控制器。
- `components/ui` 不得依赖 `features`，避免基础组件与业务反向耦合。
- `features/inspection/index.ts` 是业务模块对外公开入口；模块内部直接引用具体文件。

## 数据兼容约束

历史记录继续使用 `night-inspection`，草稿继续使用 `night-inspection-draft`。历史记录结构保持为：

```ts
type InspectionRecord = {
  id: string;
  date: string;
  time: string;
  values: Record<string, string>;
};
```

草稿读取必须继续兼容旧版仅保存 `values` 对象的格式。当前格式为 `{ values, beltTab, updatedAt? }`；`hasDraft` 在内存和账号缓存中区分“确实存在空白草稿”与“没有草稿”。未来需要升级数据结构时，应先在 `storage` 中增加读取归一化或迁移逻辑，再修改领域模型，组件不得自行解析旧数据。

配置 Supabase 后，第一个登录账号会接管尚未归属账号的旧本地数据。不同账号在同一浏览器中使用独立缓存；云端记录按 UUID 合并，删除使用 `deleted_at` 墓碑，草稿按 `updated_at` 解决冲突。RLS 必须始终使用 `auth.uid() = user_id` 隔离数据。

用户导航顺序保存在 `user_preferences`，本地缓存键按用户隔离；四个一级导航必须各出现一次，第一项同时是启动页面。头像存放在私有 `avatars` bucket 的 `{user_id}/` 目录，通过短期签名 URL 展示，上传前在浏览器裁切压缩为 256×256 WebP。签名 URL 可按头像路径缓存在浏览器中，但只有在图片预加载成功后才能替换当前显示；无效缓存会被清除，并在启动、恢复联网或回到前台时重试。

## 巡检数据流与草稿仲裁

`use-inspection-controller.ts` 编排页面状态，但不直接实现冲突规则。职责链为：

```text
用户编辑
  → applyDraftChange 生成严格递增的 updatedAt
  → inspection-storage 立即写入本地草稿和账号缓存
  → 800ms 防抖后调用 inspection-cloud-sync
  → Supabase RPC 仅提交不旧于云端的草稿
  → 过期写入重新拉取云端胜出版本
```

纯规则集中在 `model/draft-reconciliation.ts`：

- 没有本地草稿时直接采用云端草稿，云端也为空则保持为空。
- 本地草稿没有合法 `updatedAt` 时视为旧版草稿；已有云端草稿时不能覆盖云端。
- 两端都有版本时，较新的 `updatedAt` 胜出；相同时间采用已确认的云端副本。
- 本地较新时调用 `upsert_inspection_draft_if_newer`；RPC 返回旧版本拒绝后再次拉取云端。
- 每次真实编辑至少比上一版本增加 1ms，避免同一毫秒内连续操作产生相同版本。
- “新建”是一次真实编辑：写入带版本的空白草稿并重置到 `SZ101`，从而把清空状态同步到其他设备。

历史记录与草稿使用不同策略。历史记录的保存、删除、合并导入和整体恢复在发起网络请求前进入按账号隔离的 localStorage 操作队列；每项操作拥有稳定 ID，成功后仅移除对应项，执行期间追加的操作不会被清空。同步开始时先冲刷队列，再分页读取云端记录；普通新增使用 insert-only 语义，不能复活墓碑，只有用户明确选择的覆盖恢复可以恢复已删除记录。合并导入仅新增，覆盖恢复优先通过数据库事务函数完成。草稿不进入该队列，而是保留最新本地版本并在恢复联网、页面回到前台或下一次同步时重新仲裁。

同步期间如果本地历史发生保存、删除或导入，控制器拒绝应用这次请求返回的旧列表并立即重新同步。在线账号订阅 `inspection_records` 和 `inspection_drafts` 的 Postgres Changes，其他设备写入后触发重新拉取；重连和回到前台仍会完整补查，实时通知不作为唯一数据来源。

失败的历史同步按 1、3、10、30 秒退避重试，恢复联网或回到前台时立即重新启动。页面显示当前账号的队列待处理数量以及最近一次成功同步时间；草稿使用独立的版本仲裁流程，因此不计入历史操作队列数量。

用户偏好的导航顺序和头像路径分别更新，避免修改导航时把另一设备的新头像路径写回旧值。离线导航变更在缓存中记录具体待同步字段；较旧请求返回时通过本地修订号阻止它覆盖后续操作。

## 数据库迁移基线

新环境必须按文件名顺序执行 `supabase/migrations/` 下的全部迁移。当前最后一份迁移是 `20260906170915_reliable_inspection_sync.sql`：它创建 `replace_inspection_records(uuid, jsonb)` 事务函数，对覆盖恢复的载荷、记录归属和重复 ID 做校验，并把 `inspection_records`、`inspection_drafts` 加入 `supabase_realtime` publication。函数使用调用者权限并仅向 `authenticated` 授予执行权；客户端仍受现有 RLS 限制。

生产 Supabase 已执行该迁移；生产代码基线为 `cbb008c`。代码保留仅针对 `PGRST202`（数据库尚未暴露新 RPC）的滚动发布兼容路径，新建环境不应依赖该回退替代迁移。

## 密码修改与跨设备会话撤销

账号内改密和邮件找回重设密码共用同一套会话撤销流程：密码更新成功后先通过 Supabase Auth 撤销其他会话，再把当前时间和发起会话 ID 写入 `user_preferences.sessions_revoked_at`、`sessions_revoked_by`。当前会话根据会话 ID 保持登录，其他设备收到 Realtime 变更后执行本地登出。

`src/features/auth/hooks/use-auth.ts` 负责订阅当前用户的 `user_preferences` 变更，并在首次加载、恢复联网和页面重新回到前台时补查撤销标记。因此在线设备可及时退出，离线或后台设备会在恢复后退出。该表继续使用现有 RLS 按 `auth.uid() = user_id` 隔离；不要改成全局广播，也不要使用 `user_metadata` 做授权判断。

## 修改原则

1. 设备清单和显示规则修改在 `model/config.ts` 与 `model/field-rules.ts` 完成。
2. 完整性检查修改在 `model/validation.ts` 完成。
3. `hooks/use-inspection-controller.ts` 只组合公共状态、草稿编辑与同步；历史流程进入 `use-inspection-history.ts`，备份流程进入 `use-inspection-backup.ts`。
4. 页面视觉修改限定在对应业务组件，并继续消费 `globals.css` 中的语义令牌。
5. 通用控件优先扩展 `components/ui`；只有巡检业务使用的组件留在 `features/inspection/components`。
6. 草稿冲突规则修改在 `model/draft-reconciliation.ts` 完成，并同步扩展 `tests/draft-version.test.mjs`。
7. 历史操作队列修改在 `sync/inspection-sync-queue.ts` 完成，并同步扩展 `tests/inspection-sync-queue.test.mjs`；网络读写与数据库映射继续留在 `sync/inspection-cloud-sync.ts`。
8. 每次修改后运行 `npm run lint`、`npx tsc --noEmit`、`npm test` 和生产构建。
