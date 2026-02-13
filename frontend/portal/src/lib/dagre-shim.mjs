// Shim for @dagrejs/dagre that resolves the @dagrejs/graphlib dependency.
// dagre v2 wraps require('@dagrejs/graphlib') in a dynamic function that
// webpack cannot statically analyze, resulting in a broken context module.
// This shim imports graphlib explicitly (a static import webpack CAN resolve)
// and injects it into globalThis before dagre tries to load it.
import * as graphlib from '@dagrejs/graphlib';

// Make graphlib available for dagre's dynamic require
if (typeof globalThis !== 'undefined') {
  globalThis.__dagrejs_graphlib = graphlib;
}

// Re-export everything from dagre
// Use the ESM entry which will now find graphlib via the patched require
export { default } from '@dagrejs/dagre/dist/dagre.esm.js';
export * from '@dagrejs/dagre/dist/dagre.esm.js';
