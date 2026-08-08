/**
 * tiptap-markdown attaches a `markdown` entry to the editor's storage but
 * doesn't augment TipTap's Storage interface, so declare it here.
 */
import "@tiptap/core";

declare module "@tiptap/core" {
  interface Storage {
    markdown: {
      getMarkdown: () => string;
    };
  }
}
