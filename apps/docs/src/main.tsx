import docsData from '@/data/docs.json';
import type { DocumentationIndex } from '@/types';
import { renderDocsApp } from './render-docs-app';
import './index.css';

const docs = docsData as DocumentationIndex;

renderDocsApp({
  docs,
  siteTitle: 'Akari API Docs',
  introduction:
    'Explore the generated documentation for the Akari API clients or jump into a dedicated package build.',
  dedicatedBuilds: [
    { href: './bluesky.html', label: 'Bluesky API' },
    { href: './clearsky.html', label: 'ClearSky API' },
    { href: './tenor.html', label: 'Tenor API' },
    { href: './libretranslate.html', label: 'LibreTranslate API' },
  ],
});
