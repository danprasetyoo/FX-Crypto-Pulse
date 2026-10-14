import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChangeCell } from './ChangeCell';

describe('ChangeCell', () => {
  it('kenaikan memakai panah dan tanda plus', () => {
    render(<ChangeCell value={0.42} testId="c" />);
    const el = screen.getByTestId('c');
    expect(el).toHaveTextContent('▲ +0,42%');
    expect(el).toHaveAttribute('data-trend', 'up');
  });
  it('penurunan memakai panah bawah dan minus', () => {
    render(<ChangeCell value={-0.18} testId="c" />);
    expect(screen.getByTestId('c')).toHaveTextContent('▼ -0,18%');
  });
  it('nilai kosong menjadi strip', () => {
    render(<ChangeCell value={null} testId="c" />);
    expect(screen.getByTestId('c')).toHaveTextContent('—');
  });
});
