import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders with default size', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getAnonymous({ hidden: true });
        expect(spinner).toBeInTheDocument();
    });

    it('renders in fullscreen mode', () => {
        const { container } = render(<LoadingSpinner fullScreen />);
        expect(container.querySelector('.fixed')).toBeInTheDocument();
    });

    it('applies correct size class', () => {
        const { container, rerender } = render(<LoadingSpinner size="sm" />);
        expect(container.querySelector('.w-4')).toBeInTheDocument();

        rerender(<LoadingSpinner size="lg" />);
        expect(container.querySelector('.w-12')).toBeInTheDocument();
    });

    it('applies correct color class', () => {
        const { container } = render(<LoadingSpinner color="green" />);
        expect(container.querySelector('.border-green-500')).toBeInTheDocument();
    });
});
