import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function DownloadMenu({ txtLink, pdfLink, docLink }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  return (
    <div className="relative inline-block text-left mt-4">
      <button
        onClick={toggleDropdown}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none"
      >
        Download Options
        <ChevronDown className="ml-2 h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" onMouseLeave={closeDropdown}>
            <a
              href={txtLink}
              download
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Download as .txt
            </a>
            <a
              href={pdfLink}
              download
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Download as PDF
            </a>
            <a
              href={docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
            >
              View in Google Docs
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
