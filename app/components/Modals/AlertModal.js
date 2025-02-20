export default function AlertModal({ message, onClose, type = "info" }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-[90vw]">
        <div className="mb-4">
          <h3 className={`text-xl font-semibold mb-2 ${
            type === "error" ? "text-red-600" : 
            type === "success" ? "text-green-600" : 
            "text-blue-600"
          }`}>
            {type === "error" ? "Error" : 
             type === "success" ? "Success" : 
             "Notice"}
          </h3>
          <p className="text-gray-700">{message}</p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 