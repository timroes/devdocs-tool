import { extractContent } from './utils';

describe('utils', () => {
  describe('extractContent', () => {
    it('should extract simple content at the end', () => {
      const markdown = `
## Some issue

Lorem ipsum foo bar

# Dev-Docs

This should be extracted correctly.
      `;

      expect(extractContent(markdown)).toBe('This should be extracted correctly.');
    });

    it('should extract with another section after it', () => {
      const markdown = `
## Some issue

Lorem ipsum foo bar

### Dev-Docs

This should be extracted correctly.

### Another section

This should not be part anymore.
      `;

      expect(extractContent(markdown)).toBe('This should be extracted correctly.');
    });

    it('should extract with another higher section after it', () => {
      const markdown = `
## Some issue

Lorem ipsum foo bar

### Dev-Docs

This should be extracted correctly.

#### Including this

subsection

# Another section

This should not be part anymore.
      `;

      expect(extractContent(markdown)).toBe(`This should be extracted correctly.\n\n#### Including this\n\nsubsection`);
    });
  });
});