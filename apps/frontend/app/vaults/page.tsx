export default function VaultsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Vaults</h1>
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-600 text-lg mb-2">
          Enter a vault address to view NAV data
        </p>
        <p className="text-sm text-gray-400">
          Navigate to{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">
            /vaults/&#123;address&#125;
          </code>{" "}
          to view the latest NAV snapshot for a specific vault, or{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">
            /vaults/&#123;address&#125;/history
          </code>{" "}
          for historical data.
        </p>
      </div>
    </div>
  );
}
