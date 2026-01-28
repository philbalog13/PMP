interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: 'blue' | 'green' | 'white';
    fullScreen?: boolean;
}

export function LoadingSpinner({
    size = 'md',
    color = 'blue',
    fullScreen = false
}: LoadingSpinnerProps) {
    const sizeClass = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
    }[size];

    const colorClass = {
        blue: 'border-blue-500 border-t-transparent',
        green: 'border-green-500 border-t-transparent',
        white: 'border-white border-t-transparent',
    }[color];

    const spinner = (
        <div className={`${sizeClass} ${colorClass} rounded-full animate-spin`} />
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
                <div className="bg-white p-6 rounded-lg shadow-xl">
                    {spinner}
                </div>
            </div>
        );
    }

    return spinner;
}
