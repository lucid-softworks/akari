import { Fragment } from 'react';

import { getTypeVariants } from '@/lib/type-format';
import type { MethodDoc, TypeReferenceIndex } from '@/types';

export type MethodCardProps = {
  method: MethodDoc;
  anchorId: string;
  typeIndex: TypeReferenceIndex;
};

const renderTypeSegment = (segment: string, typeIndex: TypeReferenceIndex, key: string) => {
  const anchorId = typeIndex[segment];

  if (anchorId) {
    return (
      <a key={key} href={`#${anchorId}`} className="type-link">
        {segment}
      </a>
    );
  }

  return (
    <Fragment key={key}>
      {segment}
    </Fragment>
  );
};

const renderTypeVariant = (variant: string, typeIndex: TypeReferenceIndex) => {
  const segments = variant.split(/([A-Za-z_$][A-Za-z0-9_$]*)/g);

  return segments.map((segment, index) => {
    if (!segment) {
      return null;
    }

    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)) {
      return renderTypeSegment(segment, typeIndex, `${segment}-${index}`);
    }

    return (
      <Fragment key={`${segment}-${index}`}>
        {segment}
      </Fragment>
    );
  });
};

const renderTypeBadges = (typeText: string | undefined, typeIndex: TypeReferenceIndex) => {
  const variants = getTypeVariants(typeText);
  if (variants.length === 0) {
    return null;
  }

  return (
    <ul className="type-badge-list" role="list">
      {variants.map((variant, index) => (
        <li key={`${variant}-${index}`}>
          <code>{renderTypeVariant(variant, typeIndex)}</code>
        </li>
      ))}
    </ul>
  );
};

const renderReturnDescription = (value?: string) => {
  if (!value) {
    return <p className="placeholder">Return value documented in source.</p>;
  }

  return <p>{value}</p>;
};

export const MethodCard = ({ method, anchorId, typeIndex }: MethodCardProps) => {
  return (
    <article className="method-card" id={anchorId}>
      <header className="method-header">
        <div>
          <h4>{method.name}</h4>
          <code className="signature">{method.signature}</code>
        </div>
      </header>
      {method.description ? (
        <p>{method.description}</p>
      ) : (
        <p className="placeholder">This member does not include additional documentation.</p>
      )}
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
