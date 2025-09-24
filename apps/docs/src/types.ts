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
};

export type DocumentationIndex = {
  generatedAt: string;
  packages: PackageDoc[];
};
