import { linkTypeText } from '@/lib/link-type-text';
import type { TypeDoc, TypeReferenceIndex } from '@/types';

export type TypeCardProps = {
  typeDoc: TypeDoc;
  anchorId: string;
  typeIndex: TypeReferenceIndex;
};

const getKindLabel = (kind: TypeDoc['kind']) => {
  switch (kind) {
    case 'interface':
      return 'Interface';
    case 'enum':
      return 'Enum';
    default:
      return 'Type';
  }
};

export const TypeCard = ({ typeDoc, anchorId, typeIndex }: TypeCardProps) => {
  const signatureContent = linkTypeText(typeDoc.signature, typeIndex, {
    skipIdentifiers: [typeDoc.name],
  });

  return (
    <article className="type-card" id={anchorId}>
      <header className="type-header">
        <div>
          <h4>{typeDoc.name}</h4>
          <span className="type-kind">{getKindLabel(typeDoc.kind)}</span>
        </div>
        <span className="file-path">{typeDoc.file}</span>
      </header>
      {typeDoc.description ? <p>{typeDoc.description}</p> : null}
      <pre className="type-signature">
        <code>{signatureContent}</code>
      </pre>
    </article>
  );
};
