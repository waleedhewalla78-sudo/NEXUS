/* eslint-disable no-secrets/no-secrets */
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noSecrets from "eslint-plugin-no-secrets";

const eslintConfig = defineConfig([
  {
    plugins: { "no-secrets": noSecrets },
    rules: {
      "no-secrets/no-secrets": [
        "error",
        {
          "ignore": [
            "[REDACTED_EMAIL]",
            "mock_signature",
            "media-assets/<workspaceId>/<uniqueId>_originalName",
            "<workspaceId>/<timestamp>_originalName",
            "fetchStagingDBLogs('test_workspace_id');",
            "sha256=mock_signature"
          ]
        }
      ],
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-require-imports": "off"
    }
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**"
  ]),
  {
    files: ["load-tests/**/*.js"],
    rules: {
      "no-secrets/no-secrets": "off"
    }
  },
  {
    // Disable anonymous default export for load-tests
    files: ["load-tests/**/*.js"],
    rules: {
      "import/no-anonymous-default-export": "off"
    }
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "no-secrets/no-secrets": "off"
    }
  }
]);

export default eslintConfig;
