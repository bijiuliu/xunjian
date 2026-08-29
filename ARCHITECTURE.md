# 项目架构

本项目采用 Next.js App Router 与按业务功能组织的模块化单体结构。目标是在不增加状态库或第二套 UI 系统的前提下，让业务规则、浏览器存储和页面展示可以独立演进。

## 目录职责

```text
src/
├─ app/                         # Next.js 路由、布局和全局设计令牌
├─ components/ui/               # 可跨业务复用的基础 UI 组件
├─ features/inspection/
│  ├─ components/               # 巡检界面，按泵区、皮带、历史和弹窗拆分
│  ├─ hooks/                    # 巡检状态与用户操作编排
│  ├─ model/                    # 类型、设备配置、字段规则和校验
│  ├─ storage/                  # localStorage 兼容层
│  ├─ sync/                     # Supabase 云同步与离线操作队列
│  └─ index.ts                  # 模块公开入口
├─ features/auth/               # Supabase 登录、注册、邮箱验证与密码恢复
├─ lib/supabase/                # 浏览器 Supabase 客户端
└─ lib/                         # 与具体业务无关的通用工具
```

## 依赖方向

```text
app → features/inspection → components/ui
                          → lib

components → hooks → model
                   → storage → model
```

- `app` 只负责路由入口，不放巡检业务。
- `model` 是纯 TypeScript，不依赖 React、DOM、动画或 localStorage。
- `storage` 是唯一可以直接访问巡检 localStorage 键的目录。
- `sync` 通过 `storage` 保留本地优先语义，并把账号数据同步到 Supabase。
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

草稿读取必须继续兼容旧版仅保存 `values` 对象的格式。未来需要升级数据结构时，应先在 `storage` 中增加读取归一化或迁移逻辑，再修改领域模型，组件不得自行解析旧数据。

配置 Supabase 后，第一个登录账号会接管尚未归属账号的旧本地数据。不同账号在同一浏览器中使用独立缓存；云端记录按 UUID 合并，删除使用 `deleted_at` 墓碑，草稿按 `updated_at` 解决冲突。RLS 必须始终使用 `auth.uid() = user_id` 隔离数据。

## 修改原则

1. 设备清单和显示规则修改在 `model/config.ts` 与 `model/field-rules.ts` 完成。
2. 完整性检查修改在 `model/validation.ts` 完成。
3. 新的用户操作流程进入 `hooks/use-inspection-controller.ts`。
4. 页面视觉修改限定在对应业务组件，并继续消费 `globals.css` 中的语义令牌。
5. 通用控件优先扩展 `components/ui`；只有巡检业务使用的组件留在 `features/inspection/components`。
6. 每次修改后运行 `npm run lint`、`npx tsc --noEmit` 和生产构建。
