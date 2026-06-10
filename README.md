# 简易图书管理系统

数据库原理课程大作业。项目实现中山大学深圳校区简易图书管理系统，包含 React Web 管理端、ASP.NET Core API、SQL Server 数据库脚本、WebView2 桌面壳和课程文档。

## 技术栈

- 前端：React + Vite + TypeScript
- 后端：ASP.NET Core 8 Web API + Dapper
- 数据库：SQL Server 2022 Docker
- 桌面壳：WinForms + WebView2

## 默认账号

- 管理员：`admin / admin123`
- 读者：`2024001 / reader123`

## 快速启动

以下命令均从项目根目录执行。请先启动 Docker Desktop，或在 Linux 环境中确认 Docker Engine 正在运行。

```powershell
cd deploy
docker compose up -d

cd ..\client
npm install
npm run build

cd ..\server
dotnet run
```

浏览器访问：`http://localhost:5297`

## Windows 桌面版

```powershell
dotnet run --project desktop\LibrarySystem.Desktop.csproj
```

桌面端会启动本地后端服务，并通过 WebView2 打开系统。

## 发布目录

```powershell
.\deploy\build-release.ps1
```

发布文件会生成到 `deploy/out`。如需安装包，可使用 Inno Setup 打开 `deploy/LibrarySystem.iss` 进行打包。

详细说明见 `docs/runbook.md`。
