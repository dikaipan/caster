import React from 'react';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
    });

    it('renders as disabled when disabled prop is passed', () => {
        render(<Button disabled>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeDisabled();
    });
});
