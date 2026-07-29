# Pose Normalization Engine

参考图姿势不可作为模板。v2 先提取身份，再按商业肖像标准重新构图。

## 全局标准

- 躯干默认离开镜头 15°，允许 12–20°。
- 头部自然回到接近正面，旋转约 -5° 至 5°。
- 头部保持水平，倾斜约 -2° 至 2°。
- 相机与眼睛等高。
- 下巴轻微向前并向下。
- 肩膀放松、平衡、自然打开。
- 眼线直接朝向镜头。

## 审核

检查 `face_nearly_frontal`、`torso_angle_correct`、`head_level`、`chin_position_correct`、`shoulders_relaxed` 和 `not_passport_photo`。复制自拍角度、明显头歪、耸肩、塌陷或畸变透视必须淘汰。
