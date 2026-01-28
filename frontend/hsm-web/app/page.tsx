export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Status Card */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
        <h2 className="text-xl font-semibold mb-2">System Status</h2>
        <p className="text-3xl font-bold text-green-600">ONLINE</p>
        <p className="text-sm text-gray-500 mt-2">Port: 3004</p>
      </div>

      {/* Keys Card */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
        <h2 className="text-xl font-semibold mb-2">Keys Loaded</h2>
        <p className="text-3xl font-bold text-blue-600">3</p>
        <p className="text-sm text-gray-500 mt-2">LMK, ZPK, CVK</p>
      </div>

      {/* Operations Card */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
        <h2 className="text-xl font-semibold mb-2">Operations</h2>
        <p className="text-3xl font-bold text-purple-600">0</p>
        <p className="text-sm text-gray-500 mt-2">Since Startup</p>
      </div>
    </div>
  );
}
