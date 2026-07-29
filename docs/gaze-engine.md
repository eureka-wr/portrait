# Gaze Engine

Gaze Engine 保留眼球、眼睑、眼距和自然不对称，只调整目光的情绪质量。

## 目标

- 稳定、直接、专注、完全在场。
- 有信心但不攻击，有温度但不软弱。
- 不放大眼睛，不改变眼型，不制造人工凝视。

## 参数

`stability`、`confidence`、`focus`、`warmth`、`curiosity`、`intensity`、`aggression`，部分 DNA 还使用 `authority`。

## 审核

检查直视镜头、稳定性、不怯弱、不过柔、不过凶和眼部结构自然。严重怯弱、攻击性凝视或眼睛异常放大属于 hard failure；普通偏柔可记录 `gaze_too_soft` 并重做。
