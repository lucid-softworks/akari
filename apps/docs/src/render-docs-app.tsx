import React from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import type { DocumentationIndex } from './types';

type RenderDocsAppOptions = {
  docs: DocumentationIndex;
  siteTitle: string;
};

export const renderDocsApp = ({ docs, siteTitle }: RenderDocsAppOptions) => {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Unable to find the root element for the documentation site.');
  }

  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <App
        docs={docs}
        siteTitle={siteTitle}
      />
    </React.StrictMode>,
  );
};
