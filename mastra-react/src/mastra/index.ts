import { chatRoute } from "@mastra/ai-sdk";
import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { VercelDeployer } from "@mastra/deployer-vercel";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import {
  DefaultExporter,
  Observability,
  SensitiveDataFilter,
} from "@mastra/observability";
import { solanaAgent } from "./agents/solana-agent";
import { resolveStorageConfig } from "./config";

const storageConfig = resolveStorageConfig();
const isProduction = storageConfig.isProduction;
const isLambda = storageConfig.isLambda;

/**
 * LibSQL ストレージ設定。
 * - 本番（Vercel + Turso）または Lambda では LibSQLStore を使用
 * - 開発時はローカルファイル DB + DuckDB の CompositeStore を使用
 * DuckDB は Lambda 非対応のため動的インポートで条件付き読み込み。
 */
let storage: LibSQLStore | MastraCompositeStore;
if (isProduction) {
  storage = new LibSQLStore({
    id: "mastra-storage",
    url: storageConfig.url,
    ...(storageConfig.authToken && { authToken: storageConfig.authToken }),
  });
} else {
  const { DuckDBStore } = await import("@mastra/duckdb");
  storage = new MastraCompositeStore({
    id: "composite-storage",
    default: new LibSQLStore({
      id: "mastra-storage",
      url: storageConfig.url,
    }),
    domains: {
      observability: await new DuckDBStore().getStore("observability"),
    },
  });
}

/**
 * Observability エクスポーター設定。
 * - Lambda: DefaultExporter（CloudWatch Logs へコンソール出力）
 * - Vercel 本番: CloudExporter のみ（DuckDB 非対応のため）
 * - ローカル開発: DefaultExporter + CloudExporter
 * CloudExporter (gRPC/OTLP) は Lambda で不要なため動的インポートでコールドスタートを回避。
 */
let exporters: (DefaultExporter | InstanceType<Awaited<typeof import("@mastra/observability")>["CloudExporter"]>)[];
if (isLambda) {
  // Lambda: コールドスタート最小化のため DefaultExporter のみ（gRPC モジュールロードを避ける）
  exporters = [new DefaultExporter()];
} else {
  const { CloudExporter } = await import("@mastra/observability");
  exporters = isProduction
    ? [new CloudExporter()]
    : [new DefaultExporter(), new CloudExporter()];
}

/**
 * Mastra インスタンス
 */
export const mastra = new Mastra({
  agents: { solanaAgent },
  server: {
    apiRoutes: [
      chatRoute({
        path: "/chat/:agentId",
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
  // VercelDeployer は Vercel 本番のみ適用。Lambda / ローカルでは不使用。
  ...(isProduction && !isLambda && {
    deployer: new VercelDeployer({ maxDuration: 60 }),
  }),
});
