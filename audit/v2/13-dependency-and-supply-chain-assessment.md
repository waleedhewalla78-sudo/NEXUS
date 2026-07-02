# Dependency and Supply Chain Assessment

This document assesses package version pinning, unpinned dependencies, and security compliance of libraries across the repository.

## Critical Dependency Profile

| Library | Package.json Version | Lockfile Version | Pinning Style | Supply Chain Risk |
| :--- | :--- | :--- | :--- | :--- |
| **next** | `16.2.9` | `16.2.9` | Direct Match | **HIGH** (Refers to a non-existent/pre-release version of Next.js, indicating severe configuration anomalies) |
| **react** | `19.2.4` | `19.2.4` | Direct Match | **MEDIUM** (Uses React 19, which may have package incompatibilities with older React components) |
| **@supabase/supabase-js** | `^2.108.2` | `2.108.2` | Caret Range | **MEDIUM** (Unpinned minor updates; could introduce runtime changes) |
| **stripe** | `^22.2.1` | `22.2.1` | Caret Range | **MEDIUM** (Bypasses version lock inside server files) |
| **reactflow** | `^11.11.4` | `11.11.4` | Caret Range | **LOW** |
| **recharts** | `^3.8.1` | `3.8.1` | Caret Range | **LOW** |
| **ioredis** | `^5.11.1` | `5.11.1` | Caret Range | **LOW** |

---

## Supply Chain Audit Findings

### 1. Next.js Version Anomaly (Critical Risk)
The dependency version for Next.js is set to `"next": "16.2.9"`. Since Next.js 16 is not yet released (Next 15 is current), this indicates a manual config manipulation or package registry spoofing. This could trigger compilation failures or package installation crashes on standard node package managers.

### 2. Unpinned Caret Ranges
Major business libraries (including `@supabase/supabase-js`, `stripe`, and `ioredis`) are declared with caret (`^`) prefixes instead of exact version numbers. This permits package managers to retrieve newer minor or patch versions during container builds in CI, exposing the production environment to vendor-side bugs.

### 3. Deprecated React 19 Package Integrations
The project integrates React 19 and Next.js 16. However, several dependencies (like `react-grid-layout` and `react-resizable`) are older packages that do not natively support React 19's fiber ref architecture. This may cause React reconciliation warnings or crashes on dashboard pages.
