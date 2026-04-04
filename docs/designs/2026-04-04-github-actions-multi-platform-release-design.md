# GitHub Actions 多平台自动发布设计

## 概述

为 electron-xianyu-kefu 项目配置 GitHub Actions CI/CD，实现每次推送到 main 分支时自动构建 macOS、Windows、Linux 三平台安装包，并发布到 GitHub Releases。

## 需求

- **触发方式**：推送到 main 分支自动触发
- **版本管理**：手动维护 `package.json` 中的版本号
- **代码签名**：macOS 签名 + 公证，Windows 和 Linux 不签名
- **Release 命名**：使用版本号（如 `v0.3.0`）
- **平台产物**：
  - macOS：DMG + zip（arm64）
  - Windows：NSIS 安装程序（exe）
  - Linux：AppImage + deb

## 架构

### 整体流程

```
push to main
    ├── build-mac.yml    → 构建 macOS (DMG + zip) + 签名 + 公证 → 上传到 Release
    ├── build-win.yml    → 构建 Windows (NSIS exe)               → 上传到 Release
    └── build-linux.yml  → 构建 Linux (AppImage + deb)            → 上传到 Release
```

三个独立的 workflow，均由 main 分支推送触发，并行执行。通过 `gh release create` 的幂等操作协调，确保只创建一个 Release。

### 协调机制

1. 每个 workflow 读取 `package.json` 的 `version` 字段
2. 使用幂等逻辑创建 Release（检查是否已存在，不存在则创建）
3. 各自构建完成后上传产物到同一 Release

```bash
if gh release view "v${VERSION}" >/dev/null 2>&1; then
  echo "Release v${VERSION} already exists, skipping creation"
else
  gh release create "v${VERSION}" --title "v${VERSION}" --notes "自动发布 v${VERSION}" --target main
fi
```

### 防重复发布

每次推送 main 都会触发构建。如果版本号未变，需要跳过创建重复 Release。幂等逻辑确保：
- 首个完成的 workflow 创建 Release
- 后续 workflow 检测到已存在则跳过创建
- 所有 workflow 都会上传产物（覆盖模式 `--clobber`）

## 文件结构

```
.github/
├── actions/
│   └── setup-build/
│       └── action.yml          # Composite action：共享构建步骤
└── workflows/
    ├── build-mac.yml           # macOS 构建流程
    ├── build-win.yml           # Windows 构建流程
    └── build-linux.yml         # Linux 构建流程
```

## 详细设计

### Composite Action：`.github/actions/setup-build/action.yml`

复用的公共构建步骤，供三个 workflow 调用：

1. 检出代码（`actions/checkout@v4`）
2. 安装 Node.js（`actions/setup-node@v4`，node 20）
3. 安装 pnpm（`pnpm/action-setup@v4`）
4. `pnpm install`
5. 读取 `package.json` 版本号，设置为环境变量
6. 幂等创建 GitHub Release
7. 构建 injected 脚本（`pnpm build:injected`）
8. 构建 Electron 应用（`pnpm exec electron-vite build`）

**Why 分离 composite action**：三个平台共享 90% 的前置步骤，提取后修改一处即可。electron-vite build 在所有平台都执行，但跳过 typecheck（CI 中 typecheck 作为独立步骤更清晰）。

### build-mac.yml

**Runner**：`macos-latest`（arm64）

**步骤**：
1. 调用 setup-build composite action
2. 导入 Apple 证书到 Keychain
   ```bash
   echo "${{ secrets.APPLE_CERTIFICATE }}" | base64 --decode > certificate.p12
   security create-keychain -p actions_temp build.keychain
   security import certificate.p12 -k build.keychain -P "${{ secrets.APPLE_CERTIFICATE_PASSWORD }}" -T /usr/bin/codesign
   security list-keychains -s build.keychain
   security unlock-keychain -p actions_temp build.keychain
   ```
3. 运行 `pnpm exec electron-builder --mac --publish never`
4. 上传产物到 Release
   ```bash
   gh release upload "v${VERSION}" dist/mac-arm64/*.dmg dist/mac-arm64/*.zip --clobber
   ```
5. 清理 Keychain

**签名配置**：通过环境变量传递给 electron-builder：
- `CSC_LINK`：base64 编码的证书（或直接用文件路径）
- `CSC_KEY_PASSWORD`：证书密码
- `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`：用于公证

**产物**：
- `electron-xianyu-kefu-{version}.dmg`
- `闲鱼客服自动回复助手-{version}-arm64-mac.zip`

### build-win.yml

**Runner**：`windows-latest`

**步骤**：
1. 调用 setup-build composite action
2. 运行 `pnpm exec electron-builder --win --publish never`
3. 上传产物到 Release

**产物**：
- `闲鱼客服自动回复助手 Setup {version}.exe`

### build-linux.yml

**Runner**：`ubuntu-latest`

**步骤**：
1. 调用 setup-build composite action
2. 安装 Linux 打包依赖
   ```bash
   sudo apt-get update && sudo apt-get install -y libarchive-dev
   ```
3. 运行 `pnpm exec electron-builder --linux --publish never`
4. 上传产物到 Release

**产物**：
- `electron-xianyu-kefu-{version}.AppImage`
- `electron-xianyu-kefu_{version}_amd64.deb`

## GitHub Secrets 配置

| Secret | 说明 | 获取方式 |
|--------|------|----------|
| `APPLE_CERTIFICATE` | base64 编码的 Developer ID Application .p12 证书 | Apple Developer → Certificates → 导出 .p12 → `base64 -i cert.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | .p12 证书导出时设置的密码 | 导出时设定 |
| `APPLE_ID` | Apple ID 邮箱 | Apple 账号邮箱 |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password（用于 notarytool） | appleid.apple.com → 登录 → App 专用密码 |
| `APPLE_TEAM_ID` | Apple Team ID | Apple Developer → Membership → Team ID |

## electron-builder.yml 调整

需要修改以下配置：

1. **publish 节**：将 `provider: generic` 改为 `provider: github`，添加 `owner` 和 `repo`
2. **mac.notarize**：改为条件启用（CI 环境变量控制）
3. **mac.target**：确保支持 arm64 架构

```yaml
publish:
  provider: github
  owner: TheOne
  repo: electron-xianyu-kefu
```

## 使用流程

1. 本地修改 `package.json` 中的 `version` 字段
2. 提交并推送到 main：`git add package.json && git commit -m "chore: bump version to x.y.z" && git push`
3. GitHub Actions 自动触发三个并行构建
4. 构建完成后在 GitHub Releases 页面查看产物

## 注意事项

- **版本号必须更新**：如果版本号未变，产物会上传到已有的 Release（`--clobber` 覆盖）
- **macOS 公证耗时**：通常 2-5 分钟，整个 macOS 构建约 10-15 分钟
- **Windows 构建无签名**：用户安装时可能看到 SmartScreen 警告
- **资源文件**：`build/` 目录下的图标文件（icon.icns、icon.ico、icon.png）必须存在于仓库中
- **Electron 镜像**：当前使用国内镜像 `npmmirror.com`，CI 中 GitHub runners 可直接从 GitHub 下载，但保留镜像配置作为 fallback
