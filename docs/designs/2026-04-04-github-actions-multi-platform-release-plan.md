# GitHub Actions 多平台自动发布 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 配置 GitHub Actions CI/CD，推送到 main 分支时自动构建 macOS/Windows/Linux 三平台安装包并发布到 GitHub Releases。

**Architecture:** 三个独立 workflow（build-mac.yml、build-win.yml、build-linux.yml）由 main 推送并行触发。共享 composite action 处理公共构建步骤。macOS 包含代码签名和公证。通过 `gh release create` 幂等操作协调 Release 创建。

**Tech Stack:** GitHub Actions、electron-builder、pnpm、electron-vite

---

## 文件结构

```
.github/
├── actions/
│   └── setup-build/
│       └── action.yml          # Composite action：检出、Node、pnpm、构建
└── workflows/
    ├── build-mac.yml           # macOS 构建 + 签名 + 公证
    ├── build-win.yml           # Windows 构建
    └── build-linux.yml         # Linux 构建

electron-builder.yml            # 修改：publish 节改为 github provider
```

---

### Task 1: 修改 electron-builder.yml publish 配置

**Files:**
- Modify: `electron-builder.yml:41-43`

- [ ] **Step 1: 修改 publish 节**

将 `electron-builder.yml` 末尾的 `publish` 配置从 `generic` 改为 `github`：

```yaml
publish:
  provider: github
  owner: TheOne1006
  repo: electron-xianyu-kefu
```

同时移除 `notarize: false`，改为环境变量控制（当 `APPLE_ID` 存在时启用公证）：

```yaml
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSCameraUsageDescription: Application requests access to the device's camera.
    - NSMicrophoneUsageDescription: Application requests access to the device's microphone.
    - NSDocumentsFolderUsageDescription: Application requests access to the user's Documents folder.
    - NSDownloadsFolderUsageDescription: Application requests access to the user's Downloads folder.
```

完整的修改后 `electron-builder.yml`：

```yaml
appId: com.electron.app
productName: 闲鱼客服自动回复助手
directories:
  buildResources: build
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}'
  - '!{.env,.env.*,.npmrc,pnpm-lock.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
asarUnpack:
  - resources/**
win:
  executableName: 闲鱼客服自动回复助手
nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSCameraUsageDescription: Application requests access to the device's camera.
    - NSMicrophoneUsageDescription: Application requests access to the device's microphone.
    - NSDocumentsFolderUsageDescription: Application requests access to the user's Documents folder.
    - NSDownloadsFolderUsageDescription: Application requests access to the user's Downloads folder.
dmg:
  artifactName: ${name}-${version}.${ext}
linux:
  target:
    - AppImage
    - deb
  maintainer: electronjs.org
  category: Utility
appImage:
  artifactName: ${name}-${version}.${ext}
npmRebuild: false
publish:
  provider: github
  owner: TheOne1006
  repo: electron-xianyu-kefu
electronDownload:
  mirror: https://npmmirror.com/mirrors/electron/
```

- [ ] **Step 2: 提交**

```bash
git add electron-builder.yml
git commit -m "chore: 更新 electron-builder publish 配置为 github provider"
```

---

### Task 2: 创建 Composite Action

**Files:**
- Create: `.github/actions/setup-build/action.yml`

- [ ] **Step 1: 创建目录和文件**

创建 `.github/actions/setup-build/action.yml`：

```yaml
name: 'Setup Build'
description: '检出代码、安装依赖、构建 injected 脚本和 Electron 应用'

outputs:
  version:
    description: '从 package.json 读取的版本号'
    value: ${{ steps.get-version.outputs.version }}

runs:
  using: 'composite'
  steps:
    - name: 检出代码
      uses: actions/checkout@v4

    - name: 安装 Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: 安装 pnpm
      uses: pnpm/action-setup@v4

    - name: 安装依赖
      shell: bash
      run: pnpm install

    - name: 获取版本号
      id: get-version
      shell: bash
      run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"

    - name: 幂等创建 GitHub Release
      shell: bash
      env:
        GH_TOKEN: ${{ github.token }}
      run: |
        VERSION="${{ steps.get-version.outputs.version }}"
        TAG="v${VERSION}"
        if gh release view "${TAG}" >/dev/null 2>&1; then
          echo "Release ${TAG} already exists, skipping creation"
        else
          gh release create "${TAG}" \
            --title "${TAG}" \
            --notes "自动发布 ${TAG}" \
            --target main
        fi

    - name: 构建 injected 脚本
      shell: bash
      run: pnpm build:injected

    - name: 构建 Electron 应用
      shell: bash
      run: pnpm exec electron-vite build
```

- [ ] **Step 2: 提交**

```bash
git add .github/actions/setup-build/action.yml
git commit -m "ci: 添加 setup-build composite action"
```

---

### Task 3: 创建 macOS 构建 Workflow

**Files:**
- Create: `.github/workflows/build-mac.yml`

- [ ] **Step 1: 创建 workflow 文件**

创建 `.github/workflows/build-mac.yml`：

```yaml
name: Build macOS

on:
  push:
    branches: [main]

jobs:
  build-mac:
    runs-on: macos-latest
    steps:
      - name: Setup Build
        id: setup
        uses: ./.github/actions/setup-build

      - name: 导入 Apple 证书
        env:
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
        run: |
          # 将 base64 证书解码为 p12 文件
          echo "$APPLE_CERTIFICATE" | base64 --decode > certificate.p12

          # 创建临时 Keychain
          KEYCHAIN_PATH="$RUNNER_TEMP/build.keychain"
          KEYCHAIN_PASSWORD="actions_temp_$(date +%s)"

          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
          security import certificate.p12 \
            -k "$KEYCHAIN_PATH" \
            -P "$APPLE_CERTIFICATE_PASSWORD" \
            -T /usr/bin/codesign
          security list-keychains -s "$KEYCHAIN_PATH"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

          # 设置 Keychain 搜索列表，确保证书可被找到
          security set-key-partition-list -S apple-tool:,apple:,codesign: \
            -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

      - name: 构建 macOS 应用
        env:
          CSC_LINK: ${{ secrets.APPLE_CERTIFICATE }}
          CSC_KEY_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: pnpm exec electron-builder --mac --publish never

      - name: 上传产物到 Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          VERSION="${{ steps.setup.outputs.version }}"
          TAG="v${VERSION}"
          gh release upload "${TAG}" dist/*.dmg dist/*.zip --clobber

      - name: 清理 Keychain
        if: always()
        run: |
          KEYCHAIN_PATH="$RUNNER_TEMP/build.keychain"
          if [ -f "$KEYCHAIN_PATH" ]; then
            security delete-keychain "$KEYCHAIN_PATH"
          fi
          rm -f certificate.p12
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/build-mac.yml
git commit -m "ci: 添加 macOS 构建 workflow（签名 + 公证）"
```

---

### Task 4: 创建 Windows 构建 Workflow

**Files:**
- Create: `.github/workflows/build-win.yml`

- [ ] **Step 1: 创建 workflow 文件**

创建 `.github/workflows/build-win.yml`：

```yaml
name: Build Windows

on:
  push:
    branches: [main]

jobs:
  build-win:
    runs-on: windows-latest
    steps:
      - name: Setup Build
        id: setup
        uses: ./.github/actions/setup-build

      - name: 构建 Windows 应用
        run: pnpm exec electron-builder --win --publish never

      - name: 上传产物到 Release
        env:
          GH_TOKEN: ${{ github.token }}
        shell: bash
        run: |
          VERSION="${{ steps.setup.outputs.version }}"
          TAG="v${VERSION}"
          gh release upload "${TAG}" dist/*.exe --clobber
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/build-win.yml
git commit -m "ci: 添加 Windows 构建 workflow"
```

---

### Task 5: 创建 Linux 构建 Workflow

**Files:**
- Create: `.github/workflows/build-linux.yml`

- [ ] **Step 1: 创建 workflow 文件**

创建 `.github/workflows/build-linux.yml`：

```yaml
name: Build Linux

on:
  push:
    branches: [main]

jobs:
  build-linux:
    runs-on: ubuntu-latest
    steps:
      - name: Setup Build
        id: setup
        uses: ./.github/actions/setup-build

      - name: 安装打包依赖
        run: sudo apt-get update && sudo apt-get install -y libarchive-dev

      - name: 构建 Linux 应用
        run: pnpm exec electron-builder --linux --publish never

      - name: 上传产物到 Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          VERSION="${{ steps.setup.outputs.version }}"
          TAG="v${VERSION}"
          gh release upload "${TAG}" dist/*.AppImage dist/*.deb --clobber
```

- [ ] **Step 2: 提交**

```bash
git add .github/workflows/build-linux.yml
git commit -m "ci: 添加 Linux 构建 workflow"
```

---

### Task 6: 配置 GitHub Secrets

此任务需要你手动在 GitHub 仓库设置页面操作，无法通过代码自动化。

**操作步骤：**

1. 打开 `https://github.com/TheOne1006/electron-xianyu-kefu/settings/secrets/actions`
2. 逐个添加以下 Secrets：

| Secret 名称 | 值的来源 |
|---|---|
| `APPLE_CERTIFICATE` | 在终端运行 `base64 -i 你的证书.p12 | pbcopy`，粘贴到 Secret 值中 |
| `APPLE_CERTIFICATE_PASSWORD` | 导出 .p12 时设置的密码 |
| `APPLE_ID` | 你的 Apple ID 邮箱 |
| `APPLE_APP_SPECIFIC_PASSWORD` | 前往 appleid.apple.com → 登录 → App 专用密码 → 生成 |
| `APPLE_TEAM_ID` | Apple Developer → Membership → Team ID（10 位字母数字） |

**验证方式：** 推送一个版本号更新到 main，观察 macOS workflow 是否成功完成签名和公证。

- [ ] **Step 1: 确认 Secrets 已配置**

---

### Task 7: 验证完整流程

- [ ] **Step 1: 更新版本号触发构建**

```bash
# 在 package.json 中更新版本号（例如从 0.3.0 到 0.3.1）
git add package.json
git commit -m "chore: bump version to 0.3.1"
git push origin main
```

- [ ] **Step 2: 检查 GitHub Actions 运行状态**

打开 `https://github.com/TheOne1006/electron-xianyu-kefu/actions`，确认三个 workflow 都已触发并开始运行。

- [ ] **Step 3: 检查 Release 产物**

构建完成后，打开 `https://github.com/TheOne1006/electron-xianyu-kefu/releases`，确认：
- Release `v0.3.1` 已创建
- 包含 `.dmg` 和 `.zip`（macOS）
- 包含 `.exe`（Windows）
- 包含 `.AppImage` 和 `.deb`（Linux）

---

## 注意事项

- 如果 Apple Secrets 未配置，macOS workflow 会在签名步骤失败。Windows 和 Linux 不受影响。
- `build/` 目录中的图标文件（icon.icns、icon.ico、icon.png）已在仓库中，无需额外处理。
- `resources/injected.bundle.js` 是 `.gitignore` 的，但 composite action 中的 `pnpm build:injected` 会重新生成它。
- electron-builder 的 `--publish never` 参数确保构建产物只上传到 GitHub Release，不会触发 electron-builder 自身的发布逻辑。
