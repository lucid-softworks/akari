import type { TypeDoc } from '@/types';

export type TypeCardProps = {
  typeDoc: TypeDoc;
  anchorId: string;
};

const getKindLabel = (kind: TypeDoc['kind']) => {
  switch (kind) {
    case 'interface':
      return 'Interface';
    case 'enum':
      return 'Enum';
    default:
      return 'Type alias';
  }
};

export const TypeCard = ({ typeDoc, anchorId }: TypeCardProps) => {
  return (
    <article className="type-card" id={anchorId}>
      <header className="type-header">
        <div>
          <h4>{typeDoc.name}</h4>
          <span className="type-kind">{getKindLabel(typeDoc.kind)}</span>
        </div>
        <span className="file-path">{typeDoc.file}</span>
      </header>
      {typeDoc.description ? (
        <p>{typeDoc.description}</p>
      ) : (
        <p className="placeholder">This type does not include additional documentation.</p>
      )}
      <pre className="type-signature">
        <code>{typeDoc.signature}</code>
      </pre>
    </article>
  );
};
