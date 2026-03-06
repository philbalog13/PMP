import { redirect } from 'next/navigation';

export default async function UaIndexPage({
    params,
}: {
    params: Promise<{
        cursusId: string;
        moduleId: string;
    }>;
}) {
    const { cursusId, moduleId } = await params;
    redirect(`/student/cursus/${cursusId}/${moduleId}`);
}
