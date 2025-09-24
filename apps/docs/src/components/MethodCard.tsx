import type { ReactNode } from 'react';

import { getTypeVariants, normalizeTypeText, resolveTypeAnchor } from '@/lib/type-format';
import type { MethodDoc, TypeReferenceIndex } from '@/types';

export type MethodCardProps = {
  method: MethodDoc;
  anchorId: string;
  typeIndex: TypeReferenceIndex;
};

const renderTypeBadges = (typeText: string | undefined, typeIndex: TypeReferenceIndex) => {
  const normalized = normalizeTypeText(typeText);
  const variants = getTypeVariants(normalized ?? typeText);
  if (variants.length === 0) {
    return null;
  }

  return (
    <ul className="type-badge-list" role="list">
      {variants.map((variant, index) => {
        const trimmed = variant.trim();
        if (!trimmed) {
          return null;
        }

        const anchorId = resolveTypeAnchor(trimmed, typeIndex);
        const isQuoted = /^(['"`]).*\1$/.test(trimmed);
        const label = isQuoted ? trimmed.slice(1, -1) : trimmed;
        const content = anchorId ? (
          <a className="type-badge type-badge--link" href={`#${anchorId}`}>
            <code>{label}</code>
          </a>
        ) : (
          <span className="type-badge">
            <code>{label}</code>
          </span>
        );

        return (
          <li key={`${variant}-${index}`}>
            {content}
          </li>
        );
      })}
    </ul>
  );
};

const renderReturnDescription = (value?: string) => {
  if (!value) {
    return null;
  }

  return <p>{value}</p>;
};

const buildSignatureContent = (signature: string, typeIndex: TypeReferenceIndex): ReactNode => {
  const sanitized = normalizeTypeText(signature) ?? signature;
  const linkedSegments: ReactNode[] = [];
  const identifierPattern = /[A-Za-z_$][A-Za-z0-9_$]*/g;
  let lastIndex = 0;
  let hasLinkedType = false;
  let match: RegExpExecArray | null;

  while ((match = identifierPattern.exec(sanitized)) !== null) {
    const [identifier] = match;
    const anchorId = resolveTypeAnchor(identifier, typeIndex);

    if (!anchorId) {
      continue;
    }

    hasLinkedType = true;

    if (match.index > lastIndex) {
      linkedSegments.push(sanitized.slice(lastIndex, match.index));
    }

    linkedSegments.push(
      <a key={`${identifier}-${match.index}`} className="signature-link" href={`#${anchorId}`}>
        {identifier}
      </a>,
    );

    lastIndex = match.index + identifier.length;
  }

  if (!hasLinkedType) {
    return sanitized;
  }

  if (lastIndex < sanitized.length) {
    linkedSegments.push(sanitized.slice(lastIndex));
  }

  return linkedSegments;
};

export const MethodCard = ({ method, anchorId, typeIndex }: MethodCardProps) => {
  const signatureContent = buildSignatureContent(method.signature, typeIndex);

  return (
    <article className="method-card" id={anchorId}>
      <header className="method-header">
        <div>
          <h4>{method.name}</h4>
          <code className="signature">{signatureContent}</code>
        </div>
      </header>
      {method.description ? <p>{method.description}</p> : null}
      {method.parameters.length > 0 ? (
        <section className="parameter-list" aria-label="Parameters">
          {method.parameters.map((parameter) => {
            const itemClassName = parameter.optional
              ? 'parameter-item parameter-optional'
              : 'parameter-item parameter-required';

            return (
              <div key={parameter.name} className={itemClassName}>
                <div className="parameter-heading">
                  <span className="parameter-name">{parameter.name}</span>
                  {renderTypeBadges(parameter.type, typeIndex)}
                </div>
                <div className="parameter-meta">
                  <span className={parameter.optional ? 'parameter-pill optional' : 'parameter-pill required'}>
                    {parameter.optional ? 'Optional' : 'Required'}
                  </span>
                  {parameter.defaultValue ? (
                    <span className="parameter-pill default">Default: {parameter.defaultValue}</span>
                  ) : null}
                </div>
                {parameter.description ? <p>{parameter.description}</p> : null}
              </div>
            );
          })}
        </section>
      ) : null}
      <section className="method-returns" aria-label="Return value">
        <header>
          <span>Returns</span>
          {renderTypeBadges(method.returnType, typeIndex)}
        </header>
        {renderReturnDescription(method.returns)}
      </section>
    </article>
  );
};
