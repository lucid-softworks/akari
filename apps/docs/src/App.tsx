import { useMemo, useState } from 'react';

import { MethodCard } from '@/components/MethodCard';
import { TypeCard } from '@/components/TypeCard';
import { slugify } from '@/lib/slugify';
import type { DocumentationIndex, PackageDoc, TypeReferenceIndex } from '@/types';

type DocsAppProps = {
  docs: DocumentationIndex;
  siteTitle: string;
  introduction?: string;
};

const formatGeneratedAt = (value: string) => {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

type NavigationProps = {
  packages: PackageDoc[];
};

const SidebarNavigation = ({ packages }: NavigationProps) => {
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});

  const togglePackage = (slug: string) => {
    setExpandedPackages((current) => ({
      ...current,
      [slug]: !current[slug],
    }));
  };

  const ensureExpanded = (slug: string) => {
    setExpandedPackages((current) => {
      if (current[slug]) {
        return current;
      }

      return {
        ...current,
        [slug]: true,
      };
    });
  };

  return (
    <nav aria-label="Documentation navigation" className="sidebar-navigation">
      <ul className="sidebar-package-list">
        {packages.map((pkg) => {
          const isExpanded = Boolean(expandedPackages[pkg.slug]);
          const sectionId = `${pkg.slug}-navigation`;

          return (
            <li key={pkg.slug} className="sidebar-package">
              <div className="sidebar-package-header">
                <button
                  type="button"
                  className="sidebar-toggle"
                  aria-expanded={isExpanded}
                  aria-controls={sectionId}
                  onClick={() => togglePackage(pkg.slug)}
                >
                  <span aria-hidden>{isExpanded ? '−' : '+'}</span>
                  <span className="sr-only">Toggle {pkg.title}</span>
                </button>
                <a
                  href={`#${pkg.slug}`}
                  className="sidebar-package-link"
                  onClick={() => ensureExpanded(pkg.slug)}
                >
                  {pkg.title}
                </a>
              </div>
              <ul
                id={sectionId}
                className={isExpanded ? 'sidebar-entry-list sidebar-entry-list--expanded' : 'sidebar-entry-list'}
              >
                {pkg.classes.length > 0 ? (
                  <>
                    <li className="sidebar-subheading" aria-hidden>
                      Classes
                    </li>
                    {pkg.classes.map((classDoc) => (
                      <li key={`${pkg.slug}-${classDoc.name}`} className="sidebar-entry">
                        <a className="sidebar-entry-link" href={`#${pkg.slug}-${slugify(classDoc.name)}`}>
                          <span className="sidebar-entry-icon" aria-hidden>
                            C
                          </span>
                          <span>{classDoc.name}</span>
                        </a>
                      </li>
                    ))}
                  </>
                ) : null}
                {pkg.types.length > 0 ? (
                  <>
                    <li className="sidebar-subheading" aria-hidden>
                      Types
                    </li>
                    {pkg.types.map((typeDoc) => (
                      <li key={`${pkg.slug}-type-${typeDoc.name}`} className="sidebar-entry">
                        <a className="sidebar-entry-link" href={`#${pkg.slug}-type-${slugify(typeDoc.name)}`}>
                          <span className="sidebar-entry-icon sidebar-entry-icon--type" aria-hidden>
                            T
                          </span>
                          <span>{typeDoc.name}</span>
                        </a>
                      </li>
                    ))}
                  </>
                ) : null}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

const buildTypeIndex = (packages: PackageDoc[]): TypeReferenceIndex => {
  const index: TypeReferenceIndex = {};

  for (const pkg of packages) {
    for (const classDoc of pkg.classes) {
      index[classDoc.name] = `${pkg.slug}-${slugify(classDoc.name)}`;
    }

    for (const typeDoc of pkg.types) {
      index[typeDoc.name] = `${pkg.slug}-type-${slugify(typeDoc.name)}`;
    }
  }

  return index;
};

const App = ({ docs, siteTitle, introduction }: DocsAppProps) => {
  const { packages, generatedAt } = docs;
  const typeIndex = useMemo(() => buildTypeIndex(packages), [packages]);

  if (packages.length === 0) {
    return (
      <div className="app-shell">
        <aside className="sidebar">
          <h1>{siteTitle}</h1>
          {introduction ? <p>{introduction}</p> : null}
        </aside>
        <main className="content">
          <header className="header">
            <h2>Autogenerated from JSDoc comments</h2>
            <time dateTime={generatedAt}>Generated on {formatGeneratedAt(generatedAt)}</time>
          </header>
          <p className="empty-state">No public exports were discovered for this package.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>{siteTitle}</h1>
        {introduction ? <p>{introduction}</p> : null}
        <SidebarNavigation packages={packages} />
      </aside>
      <main className="content">
        <header className="header">
          <h2>Autogenerated from JSDoc comments</h2>
          <time dateTime={generatedAt}>Generated on {formatGeneratedAt(generatedAt)}</time>
        </header>
        {packages.map((pkg) => (
          <section key={pkg.slug} id={pkg.slug} className="package-section">
            <div className="package-header">
              <h2>{pkg.title}</h2>
              {pkg.description ? <p>{pkg.description}</p> : null}
            </div>
            {pkg.classes.map((classDoc) => (
              <section
                key={`${pkg.slug}-${classDoc.name}`}
                id={`${pkg.slug}-${slugify(classDoc.name)}`}
                className="class-section"
              >
                <div className="class-card">
                  <div className="class-header">
                    <h3>{classDoc.name}</h3>
                    <span className="file-path">{classDoc.file}</span>
                    {classDoc.description ? <p>{classDoc.description}</p> : null}
                  </div>
                  <div className="method-list">
                    {classDoc.methods.map((method) => (
                      <MethodCard
                        key={`${classDoc.name}-${method.name}`}
                        method={method}
                        typeIndex={typeIndex}
                        anchorId={`${pkg.slug}-${slugify(classDoc.name)}-${slugify(method.name)}`}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))}
            {pkg.types.length > 0 ? (
              <section className="types-section" aria-label="Type definitions">
                <h3>Type definitions</h3>
                <div className="type-list">
                  {pkg.types.map((typeDoc) => (
                    <TypeCard
                      key={`${pkg.slug}-type-${typeDoc.name}`}
                      typeDoc={typeDoc}
                      anchorId={`${pkg.slug}-type-${slugify(typeDoc.name)}`}
                      typeIndex={typeIndex}
                    />
                  ))}
                </div>
              </section>
            ) : null}
            <div className="section-divider" />
          </section>
        ))}
      </main>
    </div>
  );
};

export default App;
