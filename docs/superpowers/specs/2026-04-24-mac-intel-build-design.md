# macOS Intel 芯片构建支持

**日期**: 2026-04-24
**状态**: 已实施

## 背景

当前 GitHub Actions CI（`.github/workflows/build.yml`）的 macOS 构建使用 `macos-latest` runner（Apple Silicon），仅产出 ARM64 产物。Intel Mac 用户无法使用。

## 目标

- 同时产出 ARM64（M 系列）和 x64（Intel）两个 DMG 安装包
- 两个 DMG 都经过代码签名和公证
- 产物命名包含架构后缀，便于用户区分下载

## 方案

在 CI matrix 中新增第二行 macOS 构建，使用同一个 `macos-latest`（ARM）runner，通过 `--x64` 参数交叉编译 Intel 版本。项目全部依赖为纯 JS/TS（无 native modules），交叉编译可正常工作。

> **注意**: 原方案使用 `macos-13`（Intel runner），但 GitHub 已于 2025 年 12 月下线该 runner。

## 改动范围

### 1. `electron-builder.yml`

DMG 的 `artifactName` 加入 `${arch}`：

```yaml
dmg:
  artifactName: ${name}-${version}-${arch}.${ext}
```

### 2. `package.json`

新增 `build:mac-x64` 脚本用于交叉编译：

```json
"build:mac": "npm run build && dotenv electron-builder --mac",
"build:mac-x64": "npm run build && dotenv electron-builder --mac --x64",
```

### 3. `.github/workflows/build.yml`

matrix 中新增第二行 macOS 构建（交叉编译 x64）：

```yaml
strategy:
  matrix:
    include:
      - os: macos-latest
        build_cmd: build:mac
      - os: macos-latest
        build_cmd: build:mac-x64
      - os: ubuntu-latest
        build_cmd: build:linux
      - os: windows-latest
        build_cmd: build:win
```

## 技术细节

- 两行都使用 `macos-latest`（ARM runner），第一行原生构建 ARM64，第二行通过 `--x64` 交叉编译
- 项目无 native modules（所有依赖为纯 JS/TS），交叉编译可靠
- 签名和公证在交叉编译产物上同样有效，使用相同的 secrets

## 构建产物

| 文件 | 架构 | 说明 |
|------|------|------|
| `xianyu-kefu-{version}-arm64.dmg` | ARM64 | M 系列芯片 |
| `xianyu-kefu-{version}-x64.dmg` | x64 | Intel 芯片 |
| `xianyu-kefu-{version}-setup.exe` | x64 | Windows |
| `*.AppImage` | x64 | Linux |
| `*.deb` | x64 | Linux |

## 不涉及的改动

- 不需要新增 GitHub secrets
- 不涉及应用代码（preload / renderer / injected）修改

## CI 资源影响

- macOS 构建从 1 个 job 增加到 2 个（两个都在 `macos-latest` 上运行）
- 每次发版总构建 job 从 3 个增加到 4 个
