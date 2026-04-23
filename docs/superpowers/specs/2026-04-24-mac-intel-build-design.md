# macOS Intel 芯片构建支持

**日期**: 2026-04-24
**状态**: 待实施

## 背景

当前 GitHub Actions CI（`.github/workflows/build.yml`）的 macOS 构建使用 `macos-latest` runner，GitHub 已将 `macos-latest` 切换为 Apple Silicon (M 系列) 机器。Intel Mac 用户无法使用当前构建产物。

## 目标

- 同时产出 ARM64（M 系列）和 x64（Intel）两个 DMG 安装包
- 两个 DMG 都经过代码签名和公证
- 产物命名包含架构后缀，便于用户区分下载

## 方案

在 CI matrix 中将 macOS 构建拆为两行，分别使用 ARM 和 Intel runner。

## 改动范围

### 1. `electron-builder.yml`

DMG 的 `artifactName` 加入 `${arch}`：

```yaml
# 改前
dmg:
  artifactName: ${name}-${version}.${ext}

# 改后
dmg:
  artifactName: ${name}-${version}-${arch}.${ext}
```

### 2. `.github/workflows/build.yml`

matrix 的 macOS 行拆分为两行：

```yaml
strategy:
  matrix:
    include:
      - os: macos-latest      # M 系列芯片 (ARM64)
        build_cmd: build:mac
      - os: macos-13          # Intel 芯片 (x64)
        build_cmd: build:mac
      - os: ubuntu-latest
        build_cmd: build:linux
      - os: windows-latest
        build_cmd: build:win
```

## 技术细节

- **`macos-13`** 是 GitHub Actions 最后一个提供 Intel (x64) 架构的 macOS runner（macOS Ventura）
- `build:mac` 命令（`dotenv electron-builder --mac`）在两种 runner 上都能正常工作，electron-builder 自动检测当前架构
- 签名（CSC_LINK、CSC_KEY_PASSWORD）和公证（APPLE_ID、APPLE_APP_SPECIFIC_PASSWORD、APPLE_TEAM_ID）在 Intel runner 上使用相同 secrets，无需额外配置

## 构建产物

构建完成后 Release 草稿中包含：

| 文件 | 架构 | 说明 |
|------|------|------|
| `xianyu-kefu-{version}-arm64.dmg` | ARM64 | M 系列芯片 |
| `xianyu-kefu-{version}-x64.dmg` | x64 | Intel 芯片 |
| `xianyu-kefu-{version}-setup.exe` | x64 | Windows |
| `*.AppImage` | x64 | Linux |
| `*.deb` | x64 | Linux |

## 不涉及的改动

- `package.json` 中的 `build:mac` 脚本无需修改
- 不需要新增 GitHub secrets
- 不涉及应用代码（preload / renderer / injected）修改

## CI 资源影响

- macOS 构建从 1 个 job 增加到 2 个
- 每次发版总构建 job 从 3 个增加到 4 个
- CI 运行时间增加约一个 macOS 构建的时间
