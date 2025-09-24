export type ParameterDoc = {
  name: string;
  description?: string;
  type?: string;
  optional?: boolean;
  defaultValue?: string;
};

export type MethodDoc = {
  name: string;
  signature: string;
  description?: string;
  parameters: ParameterDoc[];
  returns?: string;
  returnType: string;
  file: string;
};

export type TypeDoc = {
  kind: 'alias' | 'interface' | 'enum';
  name: string;
  description?: string;
  signature: string;
  file: string;
};

export type ClassDoc = {
  name: string;
  description?: string;
  file: string;
  methods: MethodDoc[];
};

export type PackageDoc = {
  slug: string;
  title: string;
  description?: string;
  classes: ClassDoc[];
  functions: MethodDoc[];
  types: TypeDoc[];
};

export type DocumentationIndex = {
  generatedAt: string;
  packages: PackageDoc[];
};

export type TypeReferenceIndex = Record<string, string>;
