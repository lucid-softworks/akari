import docsData from '@/data/libretranslate-api.json';
import type { DocumentationIndex } from '@/types';
import { renderDocsApp } from './render-docs-app';
import './index.css';

const docs = docsData as DocumentationIndex;
const [pkg] = docs.packages;

renderDocsApp({
  docs,
  siteTitle: pkg?.title ?? 'LibreTranslate API Docs',
  introduction: pkg?.description,
});
