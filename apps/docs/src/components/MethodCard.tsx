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
        const content = anchorId ? (
          <a className="type-badge type-badge--link" href={`#${anchorId}`}>
            <code>{trimmed}</code>
          </a>
        ) : (
          <span className="type-badge">
            <code>{trimmed}</code>
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
