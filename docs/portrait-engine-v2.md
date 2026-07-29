# CATV Portrait Engine v2.0

## 设计目的

v2 把“套用职业照风格”升级为可审计的职业肖像重构系统。参考图只回答“这个人是谁”，不回答“应该怎样站、怎样看镜头、穿什么或怎样布光”。

## 九个引擎与 20 个模块

| 引擎 | Prompt 模块 |
| --- | --- |
| Identity Preservation | identity |
| Source Image Interpretation | source_interpretation |
| Pose Normalization | pose_normalization |
| Gaze | gaze |
| Expression | expression |
| Presence | presence |
| Hair & Grooming | hair_grooming |
| Wardrobe & Career Identity | career_identity, wardrobe |
| Photography & Rendering | composition, camera, lens, lighting, background, skin, color, retouch, rendering, output, negative |

固定编译顺序在 `domain/catalog.ts` 的 `PROMPT_ORDER_V2` 中定义。Identity 必须第一，Negative 必须最后。Provider 收到 19 个正向模块后，附加第 20 个 Negative 模块。

## 版本约束

- v1 为 retired，但历史订单和 Prompt 仍可读取。
- v2.0 是四种 DNA 的默认 active 版本。
- draft/testing 不能成为新订单默认版本。
- 发布把 draft 转成 testing；人工确认后才能设 active。
- 设 active 只影响新订单，不修改订单表中的既有版本。
- 编译结果保存 `engineVersion`、`compilerVersion`、`moduleOrder`、`moduleVersions` 与稳定 checksum。

## Source Analyzer 边界

允许：格式、尺寸、清晰度、曝光、脸部数量、遮挡、明显滤镜风险。

禁止：性格、职业、收入、阶层、美貌、健康、政治、宗教、族群归因或其他敏感推断。民族/肤色等文字只用于“不得改变参考人物身份”的生成约束，不得由分析器输出分类标签。

## 质量门

Identity 明显变化、发际线变化、严重头歪、复制原图姿势、眼睛异常放大、严重怯弱/攻击性眼神、假发质感、证件照输出、服装畸形或合成皮肤均为 hard failure。第一阶段由 Mock Judge 提供结构化字段，人工审核拥有最终决定权。
