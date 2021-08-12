import { findPatternAfterCursor } from "../augend.ts";
import { Augend, TextRange } from "../type.ts";

type AugendCases =
  | "camelCase"
  | "snake_case"
  | "kebab-case"
  | "SCREAMING_SNAKE_CASE";

export type AugendConfigCase = {
  cases: AugendCases[];
  cyclic?: boolean;
};

export const defaultAugendConfigCase: AugendConfigCase = {
  cases: ["camelCase", "snake_case"],
};

type CasePattern = {
  wordRegexp: RegExp;
  extractTerms: (word: string) => string[] | null;
  toIdentifier: (terms: string[]) => string;
};

const camelCasePattern: CasePattern = {
  wordRegexp: /\b([a-z][a-z0-9]*)([A-Z][a-z0-9]*)+\b/g,

  extractTerms(word) {
    const result = word.matchAll(this.wordRegexp).next().value as
      | string[]
      | undefined;
    if (result == undefined) {
      return null;
    }
    const terms = word.replace(/[A-Z]/g, (letter) => `,${letter.toLowerCase()}`)
      .split(",");
    return terms;
  },

  toIdentifier(terms) {
    const capitalizedTerms = terms.slice(1).map((s) =>
      [s[0].toUpperCase(), s.substr(1)].join("")
    );
    return [terms[0], ...capitalizedTerms].join("");
  },
};

const snakeCasePattern: CasePattern = {
  wordRegexp: /\b([a-z][a-z0-9]*)(_[a-z0-9]*)+\b/g,

  extractTerms(word) {
    const result = word.matchAll(this.wordRegexp).next().value as
      | string[]
      | undefined;
    if (result == undefined) {
      return null;
    }
    return word.split("_");
  },

  toIdentifier(terms) {
    return terms.join("_");
  },
};

const kebabCasePattern: CasePattern = {
  wordRegexp: /\b([a-z][a-z0-9]*)(-[a-z0-9]*)+\b/g,

  extractTerms(word) {
    const result = word.matchAll(this.wordRegexp).next().value as
      | string[]
      | undefined;
    if (result == undefined) {
      return null;
    }
    return word.split("-");
  },

  toIdentifier(terms) {
    return terms.join("-");
  },
};

const screamingSnakeCasePattern: CasePattern = {
  wordRegexp: /\b([A-Z][A-Z0-9]*)(_[A-Z0-9]*)+\b/g,

  extractTerms(word) {
    const result = word.matchAll(this.wordRegexp).next().value as
      | string[]
      | undefined;
    if (result == undefined) {
      return null;
    }
    return word.split("_").map((s) => s.toLowerCase());
  },

  toIdentifier(terms) {
    return terms.map((s) => s.toUpperCase()).join("_");
  },
};

const casePatternMap = {
  "camelCase": camelCasePattern,
  "snake_case": snakeCasePattern,
  "kebab-case": kebabCasePattern,
  "SCREAMING_SNAKE_CASE": screamingSnakeCasePattern,
};

export function augendCase(config: AugendConfigCase): Augend {
  const casePatterns = config.cases.map((c) => casePatternMap[c]);
  const lenPatterns = casePatterns.length;
  const cyclic = config.cyclic ?? true;

  return {
    async find(line, cursor) {
      const resultPromise = [];
      for (let idx = 0; idx < lenPatterns; ++idx) {
        resultPromise.push(
          findPatternAfterCursor(casePatterns[idx].wordRegexp)(line, cursor),
        );
      }
      const result = await Promise.all(resultPromise);
      const ranges = result.filter((x) => x != null).sort(
        (a, b) => {
          return (a as TextRange).from - (b as TextRange).from;
        },
      );
      return Promise.resolve(ranges[0] ?? null);
    },

    add(text, addend, _cursor) {
      let terms: string[] | null = null;

      let idx = 0;
      for (idx; idx < lenPatterns; idx++) {
        terms = casePatterns[idx].extractTerms(text);
        if (terms != null) {
          break;
        }
      }
      if (terms == null) {
        console.error("dps-dial error: Unreachable!");
        return Promise.resolve({});
      }
      let newIdx;
      if (cyclic) {
        newIdx = (lenPatterns + (idx + addend) % lenPatterns) % lenPatterns;
      } else {
        newIdx = idx + addend;
        if (newIdx < 0) newIdx = 0;
        if (newIdx >= lenPatterns) newIdx = lenPatterns - 1;
      }
      if (newIdx == idx) {
        return Promise.resolve({ cursor: text.length });
      }
      text = casePatterns[newIdx].toIdentifier(terms);
      return Promise.resolve({ text, cursor: text.length });
    },
  };
}
