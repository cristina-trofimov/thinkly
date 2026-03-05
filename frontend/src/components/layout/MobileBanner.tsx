import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";

const MOBILE_BREAKPOINT = 768; // px

export function MobileBanner() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile) return null;

  return (
    <>
      {/* Blurred backdrop */}
      <div className="fixed inset-0 z-50 backdrop-blur-md bg-black/40" />

      {/* Banner card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center pointer-events-auto">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 p-4 rounded-full">
              <Monitor className="text-blue-600 w-8 h-8" />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Desktop Required
          </h2>

          <p className="text-gray-500 text-sm leading-relaxed">
            This application is optimized for desktop use. Please open it on
            your computer for the best experience.
          </p>
        </div>
      </div>
    </>
  );
}