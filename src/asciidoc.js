import React, { useMemo } from 'react';
import asciidoc from 'asciidoctor';

const asciidoctor = asciidoc();

export const AsiidocRenderer = ({ source }) => {
  const html = useMemo(() => {
    return asciidoctor.convert(source);
  }, [source]);

  if (!source) {
    return null;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};