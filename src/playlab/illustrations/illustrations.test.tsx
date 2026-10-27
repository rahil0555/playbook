import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Illustration } from './Illustration';

describe('the mango illustration', () => {
  it('draws a yellow fruit with a brown stem and a green leaf, in mango colours', () => {
    const { container } = render(<Illustration name="mango" label="Mango" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Mango');
    expect(container.querySelector('path[fill="#f5b82e"]'), 'mango body').not.toBeNull();
    expect(container.querySelector('path[stroke="#8a5a3b"]'), 'stem').not.toBeNull();
    expect(container.querySelector('path[fill="#3fae5a"]'), 'leaf').not.toBeNull();
  });

  it('is drawn with shapes only, not text or an emoji', () => {
    const { container } = render(<Illustration name="mango" label="Mango" />);
    expect(container.querySelector('svg')!.textContent).toBe('');
  });
});
