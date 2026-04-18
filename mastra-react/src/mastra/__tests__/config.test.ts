import { describe, expect, it } from "vitest";
import { resolveStorageConfig } from "../config";

describe("resolveStorageConfig", () => {
  it("returns local file URL when MASTRA_LIBSQL_URL is not set", () => {
    const config = resolveStorageConfig({});
    expect(config.url).toBe("file:./mastra.db");
  });

  it("sets isProduction to false when MASTRA_LIBSQL_URL is not set", () => {
    const config = resolveStorageConfig({});
    expect(config.isProduction).toBe(false);
  });

  it("returns the Turso URL when MASTRA_LIBSQL_URL is set", () => {
    const tursoUrl = "libsql://my-db.turso.io";
    const config = resolveStorageConfig({ MASTRA_LIBSQL_URL: tursoUrl });
    expect(config.url).toBe(tursoUrl);
  });

  it("sets isProduction to true when MASTRA_LIBSQL_URL is set", () => {
    const config = resolveStorageConfig({
      MASTRA_LIBSQL_URL: "libsql://my-db.turso.io",
    });
    expect(config.isProduction).toBe(true);
  });

  it("includes authToken when MASTRA_LIBSQL_AUTH_TOKEN is also set", () => {
    const config = resolveStorageConfig({
      MASTRA_LIBSQL_URL: "libsql://my-db.turso.io",
      MASTRA_LIBSQL_AUTH_TOKEN: "token-abc",
    });
    expect(config.authToken).toBe("token-abc");
  });

  it("leaves authToken undefined when only MASTRA_LIBSQL_URL is set", () => {
    const config = resolveStorageConfig({
      MASTRA_LIBSQL_URL: "libsql://my-db.turso.io",
    });
    expect(config.authToken).toBeUndefined();
  });

  it("ignores MASTRA_LIBSQL_AUTH_TOKEN when URL is not set", () => {
    const config = resolveStorageConfig({
      MASTRA_LIBSQL_AUTH_TOKEN: "orphan-token",
    });
    expect(config.url).toBe("file:./mastra.db");
    expect(config.authToken).toBeUndefined();
    expect(config.isProduction).toBe(false);
  });
});
