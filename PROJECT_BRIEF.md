# CATV Portrait Studio · Project Brief

## 产品目标

CATV Portrait Studio 是面向人工运营团队的可商用职业肖像生产系统。客户上传一张已授权的单人照片，系统把它仅作为身份参考，通过可版本化的 Portrait DNA 生成四种职业形象，经过人工质检、客户二选一与多规格导出完成交付。

当前默认引擎为 **CATV Portrait Engine v2.0**。v1 数据和旧订单永久保留，旧订单继续读取生成时绑定的 DNA、Prompt 模块、编译器版本和校验值。

## 核心原则

1. 同一个人，不把客户美化成另一张脸。
2. 原图只提供身份，不继承自拍姿势、镜头、光线、背景或情绪弱点。
3. 职业感由姿态、眼神、表情、存在感、头发、服装与摄影共同建立。
4. 所有已发布版本不可静默覆盖；新订单只使用 active v2。
5. 自动评分只辅助排序，人工审核决定是否可交付。
6. 原图、候选与交付包均为私有资产；分析器不推断职业、性格或敏感属性。

## v2 九个引擎

- Identity Preservation
- Source Image Interpretation
- Pose Normalization
- Gaze
- Expression
- Presence
- Hair & Grooming
- Wardrobe & Career Identity
- Photography & Rendering

Prompt Compiler v2 按固定 20 模块编译：Identity 第一，Source Interpretation 第二，Negative 最后；每次结果保存 DNA 版本、模块顺序、模块版本、Engine、Compiler 和 SHA-256。

## 正式 Portrait DNA

- Composed Leader v2.0 / 从容领导力
- Global Professional v2.0 / 国际职业形象
- Boardroom Leadership v2.0 / 高管领导力
- Founder Studio v2.0 / 创业者工作室

## 第一阶段完成边界

- 私有上传、真实图像编辑 Provider、四张候选、失败重试提示。
- v2 Prompt 编译、版本锁定、v1/v2 共存。
- Pose / Gaze / Presence / Hair 人工审核与完整淘汰原因。
- 两张客户预览、客户反馈、最终选择、多规格 ZIP。
- DNA 参数查看、v1/v2 比较、draft 编辑、发布、设 active。
- 技术型 Source Analyzer 与结构化 Mock Quality Judge。
- 质量分析、审计、保留期和物理删除。

付款、自助下单、多人协作审批和自动人脸相似度判定不在第一阶段。
