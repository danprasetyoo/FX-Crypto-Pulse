import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataBadge } from './DataBadge';

describe('DataBadge', () => {
  it('normal menampilkan teks khusus', () => {
    render(
      <DataBadge
        env={{ updatedAt: '2026-10-10T07:05:00Z', stale: false, source: 'cache' }}
        normalText="Kurs ECB per 10 Okt 2026"
        testId="b"
      />,
    );
    expect(screen.getByTestId('b')).toHaveTextContent('Kurs ECB per 10 Okt 2026');
    expect(screen.getByTestId('b')).toHaveAttribute('data-state', 'live');
  });
  it('stale menampilkan pesan sumber tidak tersedia', () => {
    render(
      <DataBadge
        env={{ updatedAt: '2026-10-10T07:05:00Z', stale: true, source: 'cache' }}
        testId="b"
      />,
    );
    expect(screen.getByTestId('b')).toHaveAttribute('data-state', 'stale');
    expect(screen.getByTestId('b')).toHaveTextContent('Sumber sedang tidak tersedia');
  });
});
