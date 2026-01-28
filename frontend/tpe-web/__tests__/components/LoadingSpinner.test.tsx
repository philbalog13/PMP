import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

describe('LoadingSpinner', () => {
    it('renders with default size', () => {
        const { container } = render(<LoadingSpinner />);
        const spinner = container.firstChild;
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
