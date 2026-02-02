export function useWorkshopProgress(workshopId: string) {
    const getKey = () => `workshop_progress_${workshopId}`;

    const getProgress = (): number => {
        if (typeof window === 'undefined') return 0;
        const stored = window.localStorage.getItem(getKey());
        return stored ? parseInt(stored, 10) : 0;
    };

    const saveProgress = (progress: number) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(getKey(), progress.toString());
    };

    const isComplete = () => getProgress() >= 100;

    return { getProgress, saveProgress, isComplete };
}
