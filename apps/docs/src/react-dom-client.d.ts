declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  type RootContainer = Element | Document | DocumentFragment | Comment;

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export interface RootOptions {
    identifierPrefix?: string;
    onRecoverableError?: (error: unknown, info: { componentStack: string }) => void;
  }

  export function createRoot(container: RootContainer, options?: RootOptions): Root;
}
