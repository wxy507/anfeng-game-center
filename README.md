# 暗峰娱乐 · 包间管理系统

用于游戏店记录包间使用情况、计时收费、订单管理的单页应用。

## 功能

- **仪表盘** — 查看所有包间状态、今日营收概览
- **包间管理** — 添加/编辑/删除包间（PS5、PS4、Switch）
- **计时管理** — 开台、实时计时、自动计算费用
- **订单管理** — 快速添加商品（饮料、零食、配件等），支持自定义商品
- **历史记录** — 按日期查看结算记录和营收统计
- **数据导入/导出** — JSON 格式，便于备份和迁移

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（例如 `anfeng-game-center`）
2. 将项目推送到仓库：

```bash
git init
git add .
git commit -m "初始提交：暗峰娱乐包间管理系统"
git remote add origin https://github.com/你的用户名/anfeng-game-center.git
git branch -M main
git push -u origin main
```

3. 在仓库页面进入 **Settings → Pages**
4. 在「Branch」下拉选择 `main`，目录选择 `/ (root)`，点击 Save
5. 几分钟后即可通过 `https://你的用户名.github.io/anfeng-game-center/` 访问

## 使用说明

- 所有数据存储在浏览器的 **localStorage** 中，更换设备或清缓存会导致数据丢失，请定期点击侧边栏的「导出数据」备份
- 首次使用建议先在「包间管理」中调整好各包间的收费标准
- 开台后在「订单管理」中可实时为顾客添加商品消费
- 结账时会自动计算：计时费 + 商品费 - 押金 = 应收金额

## 数据安全

数据仅保存在当前浏览器的本地存储中。建议每天闭店前导出数据备份。

## 技术栈

- 纯 HTML + CSS + JavaScript
- 无任何外部依赖，无需构建工具
- 全中文界面
- 支持移动端

## 许可证

MIT
