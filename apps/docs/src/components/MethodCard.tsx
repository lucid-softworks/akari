import type { MethodDoc } from '@/types';

export type MethodCardProps = {
  method: MethodDoc;
  anchorId: string;
};

const renderReturnDescription = (value?: string) => {
  if (!value) {
    return <p className="placeholder">Return value documented in source.</p>;
  }

  return <p>{value}</p>;
};

export const MethodCard = ({ method, anchorId }: MethodCardProps) => {
  return (
    <article className="method-card" id={anchorId}>
      <div>
        <h4>{method.name}</h4>
        <code className="signature">{method.signature}</code>
      </div>
      {method.description ? (
        <p>{method.description}</p>
      ) : (
        <p className="placeholder">This member does not include additional documentation.</p>
      )}
      {method.parameters.length > 0 ? (
        <section className="parameter-list" aria-label="Parameters">
          {method.parameters.map((parameter) => (
            <div key={parameter.name} className="parameter-item">
              <header>
                <span>{parameter.name}</span>
                {parameter.type ? <span className="type">{parameter.type}</span> : null}
                <span className="meta">
                  {parameter.optional ? 'Optional' : 'Required'}
                  {parameter.defaultValue ? ` · default: ${parameter.defaultValue}` : ''}
                </span>
              </header>
              {parameter.description ? <p>{parameter.description}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
      <footer aria-label="Return value">{renderReturnDescription(method.returns)}</footer>
    </article>
  );
};
