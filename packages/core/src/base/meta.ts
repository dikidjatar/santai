// Copyright (c) [2025-2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

export const LANG_NAME        = "Santai"                                      as const;
export const LANG_DESCRIPTION = "Bahasa pemrograman dengan sintaks Indonesia" as const;
export const LANG_HOMEPAGE    = "https://github.com/dikidjatar/santai"        as const;

export const LANG_EXT       = ".santai" as const;
export const LANG_EXT_SHORT = ".st"     as const;

/**
 * All recognised source-file extensions
 */
export const LANG_EXTENSIONS: readonly string[] = [LANG_EXT, LANG_EXT_SHORT];

export const AUTHOR         = "Diki Djatar" as const;
export const COPYRIGHT_YEAR = "2025-2026"   as const;
export const LICENSE        = "MIT"         as const;
export const COPYRIGHT      = `Copyright (c) ${COPYRIGHT_YEAR} ${AUTHOR}` as const;

export interface SemVer {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly prerelease: string | undefined;
}

export const VERSION: SemVer = {
  major: 1,
  minor: 0,
  patch: 0,
  prerelease: undefined,
};

export const VERSION_STRING: string = (() => {
  const { major, minor, patch, prerelease } = VERSION;
  const base = `${major}.${minor}.${patch}`;
  return prerelease ? `${base}-${prerelease}` : base;
})();

declare const __BUILD_DATE__: string | undefined;
declare const __GIT_COMMIT__: string | undefined;

export const BUILD_DATE: string =
  typeof __BUILD_DATE__ !== "undefined" ? __BUILD_DATE__ : "dev";

export const GIT_COMMIT: string =
  typeof __GIT_COMMIT__ !== "undefined" ? __GIT_COMMIT__ : "dev";

export const VERSION_LINE = `${LANG_NAME} ${VERSION_STRING}`;

export const VERSION_FULL = (() => {
  if (BUILD_DATE === "dev" && GIT_COMMIT === "dev") return VERSION_LINE;
  return `${VERSION_LINE} (${GIT_COMMIT} · ${BUILD_DATE})`;
})();
