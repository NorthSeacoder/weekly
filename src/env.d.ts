/// <reference path="../.astro/types.d.ts" />

declare global {
    namespace Astro {
      interface CollectionEntryMap {
        // 与 src/content.config.ts 中的集合名称保持一致
        weekly: import('../content.config').weekly;
      }
    }
  }
