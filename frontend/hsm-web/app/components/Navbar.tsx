import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="bg-gray-900 text-white p-4 shadow-md">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                    HSM Console
                </Link>
                <div className="space-x-4">
                    <Link href="/" className="hover:text-gray-300">Dashboard</Link>
                    <Link href="/keys" className="hover:text-gray-300">Keys</Link>
                    <Link href="/logs" className="hover:text-gray-300">Logs</Link>
                    <Link href="/vuln" className="text-red-400 hover:text-red-300">Vulnerabilities</Link>
                </div>
            </div>
        </nav>
    );
}
