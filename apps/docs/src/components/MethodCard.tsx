import type { ReactNode } from 'react';

import { linkTypeText } from '@/lib/link-type-text';
import { getTypeVariants, normalizeTypeText, resolveTypeAnchor } from '@/lib/type-format';
import type { MethodDoc, ParameterDoc, TypeReferenceIndex } from '@/types';

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

const SIGNATURE_KEYWORDS = new Set([
  'async',
  'static',
  'public',
  'private',
  'protected',
  'readonly',
  'abstract',
  'get',
  'set',
]);

const renderSignatureModifiers = (prefix: string): ReactNode => {
  if (!prefix) {
    return null;
  }

  const segments: ReactNode[] = [];
  const tokenPattern = /(\s+)|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(prefix)) !== null) {
    const [token] = match;

    if (match[1]) {
      segments.push(token);
      continue;
    }

    const normalized = token.trim();

    if (SIGNATURE_KEYWORDS.has(normalized)) {
      segments.push(
        <span key={`keyword-${match.index}`} className="signature-token signature-token--keyword">
          {normalized}
        </span>,
      );
    } else {
      segments.push(
        <span key={`modifier-${match.index}`} className="signature-token signature-token--modifier">
          {normalized}
        </span>,
      );
    }
  }

  return segments;
};

const renderParameterSignature = (
  parameter: ParameterDoc,
  typeIndex: TypeReferenceIndex,
  methodName: string,
): ReactNode => {
  const content: ReactNode[] = [];
  const isRest = parameter.name.startsWith('...');
  const rawName = isRest ? parameter.name.slice(3) : parameter.name;

  if (isRest) {
    content.push(
      <span key="rest" className="signature-token signature-token--rest">
        ...
      </span>,
    );
  }

  content.push(
    <span key="name" className="signature-token signature-token--param-name">
      {rawName}
    </span>,
  );

  if (parameter.optional) {
    content.push(
      <span key="optional" className="signature-token signature-token--optional">?</span>,
    );
  }

  if (parameter.type) {
    content.push(
      <span key="type-separator" className="signature-token signature-token--punctuation">: </span>,
    );
    content.push(
      <span key="type" className="signature-type">
        {linkTypeText(parameter.type, typeIndex, { skipIdentifiers: [methodName, rawName] })}
      </span>,
    );
  }

  if (parameter.defaultValue) {
    content.push(
      <span key="default-separator" className="signature-token signature-token--punctuation"> = </span>,
    );
    content.push(
      <span key="default" className="signature-token signature-token--default">{parameter.defaultValue}</span>,
    );
  }

  return content;
};

const renderSignatureParameters = (
  parameters: ParameterDoc[],
  typeIndex: TypeReferenceIndex,
  methodName: string,
): ReactNode => {
  if (parameters.length === 0) {
    return null;
  }

  const items: ReactNode[] = [];

  parameters.forEach((parameter, index) => {
    if (index > 0) {
      items.push(
        <span key={`comma-${parameter.name}-${index}`} className="signature-token signature-token--punctuation">, </span>,
      );
    }

    items.push(
      <span key={`parameter-${parameter.name}-${index}`} className="signature-parameter">
        {renderParameterSignature(parameter, typeIndex, methodName)}
      </span>,
    );
  });

  return items;
};

const renderSignatureContent = (method: MethodDoc, typeIndex: TypeReferenceIndex): ReactNode => {
  const sanitizedSignature = normalizeTypeText(method.signature) ?? method.signature;
  const methodIndex = sanitizedSignature.indexOf(method.name);
  const prefix = methodIndex > 0 ? sanitizedSignature.slice(0, methodIndex) : '';

  return (
    <>
      {renderSignatureModifiers(prefix)}
      <span className="signature-token signature-token--name">{method.name}</span>
      <span className="signature-token signature-token--punctuation">(</span>
      {renderSignatureParameters(method.parameters, typeIndex, method.name)}
      <span className="signature-token signature-token--punctuation">)</span>
      {method.returnType ? (
        <>
          <span className="signature-token signature-token--punctuation">: </span>
          <span className="signature-type signature-type--return">
            {linkTypeText(method.returnType, typeIndex, { skipIdentifiers: [method.name] })}
          </span>
        </>
      ) : null}
    </>
  );
};

export const MethodCard = ({ method, anchorId, typeIndex }: MethodCardProps) => {
  const signatureContent = renderSignatureContent(method, typeIndex);

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
