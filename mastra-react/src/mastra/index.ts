import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { VercelDeployer } from "@mastra/deployer-vercel";
import { DuckDBStore } from "@mastra/duckdb";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import {
  CloudExporter,
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { solanaAgent } from "./agents/solana-agent";
import { resolveStorageConfig } from "./config";

const storageConfig = resolveStorageConfig();
const isProduction = storageConfig.isProduction;

/**
 * LibSQL ストレージ設定。
 * 本番（Vercel + Turso）では Turso Cloud URL を使用し、
 * 開発時はローカルファイル DB + DuckDB の CompositeStore を使用する。
 */
const storage = isProduction
  ? new LibSQLStore({
      id: "mastra-storage",
      url: storageConfig.url,
      ...(storageConfig.authToken && { authToken: storageConfig.authToken }),
    })
  : new MastraCompositeStore({
      id: "composite-storage",
      default: new LibSQLStore({
        id: "mastra-storage",
        url: storageConfig.url,
      }),
      domains: {
        observability: await new DuckDBStore().getStore("observability"),
      },
    });

/**
 * Observability エクスポーター設定。
 * Vercel 本番では DuckDB が非対応のため CloudExporter のみ使用する。
 */
const exporters = isProduction
  ? [new CloudExporter()]
  : [new DefaultExporter(), new CloudExporter()];

/**
 * Mastra インスタンス
 */
export const mastra = new Mastra({
  agents: { solanaAgent },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/api/chat/:agentId",
      }),
    ],
  },
  storage,
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters,
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
  ...(isProduction && {
    deployer: new VercelDeployer({ maxDuration: 60 }),
  }),
});
