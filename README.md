# Competitive Companion — Hydro 样例修复

基于 [Competitive Companion](https://github.com/jmerle/competitive-companion) **2.65.0** 的本地修复版，扩展名称为 **Competitive Companion (Hydro Fix)**，版本 **2.65.0.1**。

## 为什么有些题能导入，有些题没有样例？

原版 Hydro 解析器只识别 `.sample > pre > code`。部分 Hydro / SshiOJ 题面由 Markdown 导入，使用“样例输入 1 / 样例输出 1”标题和普通代码块（可能包在 Prism 的 `.code-toolbar` 中），没有 `.sample` 容器。因此原版会发送空的 `tests` 数组，CPH-NG 收到后没有样例可显示。

这个修复保留原生 Hydro 样例支持，并增加：

- 中文、英文样例标题的识别，以及按编号配对输入和输出。
- 对 Prism 工具栏包裹的代码块的支持。
- 跳过样例说明、输入格式和解法代码。
- 发现编号不匹配、缺少对应代码块时提示错误，避免该类题面被静默导入为空样例。
- 对 `192.168.8.236` 上 HTTP / HTTPS Hydro 题目地址的自动匹配。

保留原有 Daimayuan 回退逻辑，没有增加浏览器权限。此补丁针对上述 Hydro 结构，其他题面格式可能仍需单独适配。

## 安装和使用

1. 克隆本仓库，或在 GitHub 点击 **Code → Download ZIP** 并解压。
2. 在使用扩展的浏览器中打开 `chrome://extensions`，停用原版 Competitive Companion。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”，选择仓库中的 **`competitive-companion-fixed` 文件夹**。该文件夹内直接包含 `manifest.json`。
4. 在 VS Code 中启用 CPH-NG，并打开需要保存题目的工作区。
5. 刷新题目页面，等待题面加载完成，再点击修复版扩展的加号。

CPH-NG 默认端口 `27121` 已在 Competitive Companion 默认发送端口列表中。如果修改过接收端口，请在扩展设置中添加相应端口。

如果使用其他自建 Hydro 域名，可在扩展设置的 **Custom rules** 中为题目 URL 配置 `HydroProblemParser`。

本地加载版本不会随商店版自动更新。回退时停用本修复版，再重新启用原版。

## 开发与验证

需要 Node.js 18 或更高版本及 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm test
```

也可以使用 `npm install` 和 `npm test`。

`hydro-parser-fix.js` 是可读的补丁源码。`competitive-companion-original.js` 保留原版 2.65.0 内容脚本；`test-hydro-fix.mjs` 将补丁插入原版脚本，在 DOM 环境中运行原版和修复版解析器，验证中文 / 英文标题、原生组件、Prism、多组样例、无关代码块及不完整样例，全部通过后生成 `competitive-companion-fixed/js/content.js`。

测试采用合成题面，不包含本地题目数据、登录信息或 CPH-NG 元数据备份。

## 许可与来源

上游 Competitive Companion 由 Jasper van Merle 开发，采用 MIT 许可。上游代码、图标和构建产物的许可保留于 [`competitive-companion-fixed/LICENSE`](competitive-companion-fixed/LICENSE)。仓库修复部分采用根目录 [`LICENSE`](LICENSE) 中的 MIT 许可。本仓库是非官方修复版。
