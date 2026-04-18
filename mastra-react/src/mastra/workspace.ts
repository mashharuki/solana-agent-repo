import { LocalSkillSource, Workspace } from "@mastra/core/workspace";

/**
 * Solana AI Agent のワークスペース。
 * src/mastra/skills/ 配下の SKILL.md ファイルからドメイン知識を読み込み、
 * エージェントが Solana の概念・ツール・エラーコードを正確に把握できるようにする。
 */
export const solanaWorkspace = new Workspace({
  name: "Solana AI Agent Workspace",
  skills: ["src/mastra/skills"],
  skillSource: new LocalSkillSource({ basePath: process.cwd() }),
});
