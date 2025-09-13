import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { FileDisplay } from './FileUpload';

describe('FileDisplay', () => {
  it('renders file name and optional remove button', () => {
    const onRemove = vi.fn();
    render(
      <FileDisplay
        fileName="example.pdf"
        blobName="container/example.pdf"
        onRemove={onRemove}
        showRemove={true}
      />
    );

    expect(screen.getByText('example.pdf')).toBeInTheDocument();
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });
});
