import type { ReactNode } from 'react';

import { normalizeTypeText, resolveTypeAnchor } from '@/lib/type-format';
import type { TypeReferenceIndex } from '@/types';

type LinkTypeTextOptions = {
  skipIdentifiers?: Iterable<string>;
};

const IDENTIFIER_PATTERN = /[A-Za-z_$][A-Za-z0-9_$]*/g;

export const linkTypeText = (
  value: string | undefined,
  typeIndex: TypeReferenceIndex,
  options?: LinkTypeTextOptions,
): ReactNode => {
  if (!value) {
    return value;
  }

  const sanitized = normalizeTypeText(value) ?? value;
  const skip = new Set(options?.skipIdentifiers ?? []);
  const linkedSegments: ReactNode[] = [];
  let lastIndex = 0;
  let hasLinkedType = false;
  let match: RegExpExecArray | null;

  while ((match = IDENTIFIER_PATTERN.exec(sanitized)) !== null) {
    const [identifier] = match;
    if (skip.has(identifier)) {
      continue;
    }

    const anchorId = resolveTypeAnchor(identifier, typeIndex);
    if (!anchorId) {
      continue;
    }

    if (match.index > lastIndex) {
      linkedSegments.push(sanitized.slice(lastIndex, match.index));
    }

    linkedSegments.push(
      <a key={`${identifier}-${match.index}`} className="signature-link" href={`#${anchorId}`}>
        {identifier}
      </a>,
    );

    lastIndex = match.index + identifier.length;
    hasLinkedType = true;
  }

  if (!hasLinkedType) {
    return sanitized;
  }

  if (lastIndex < sanitized.length) {
    linkedSegments.push(sanitized.slice(lastIndex));
  }

  return linkedSegments;
};
