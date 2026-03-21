function App() {
  return (
    <div className="h-screen bg-gray-100 text-gray-900">
      <div className="flex h-full">
        {/* Future Sidebar */}
        <div className="w-64 bg-white border-r p-4">
          Sidebar
        </div>

        {/* Chat */}
        <div className="flex-1 p-4">
          Chat area
        </div>
      </div>
    </div>
  );
}

export default App;