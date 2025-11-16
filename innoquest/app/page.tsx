'use client'

import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-br from-[#F5F5F5] to-[#E8D5D0] animate-[fadeIn_0.6s_ease-in]">
      <div className="bg-white rounded-3xl shadow-2xl shadow-[#E63946]/20 max-w-[480px] w-full p-12 animate-[slideUp_0.6s_ease-out]">
        <div className="text-center mb-8">
          <div className="font-['Poppins'] font-bold text-[32px] text-[#E63946] tracking-tight mb-2">
            InnoQuest
          </div>
          <div className="text-sm text-gray-600 font-medium">
            Startup Odyssey
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="font-['Poppins'] font-bold text-[28px] text-black mb-2">
            Welcome Back
          </h1>
          <p className="text-base text-gray-600 font-medium">
            Launch your startup journey
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/student/gameplay"
            className="w-full block py-4 px-6 bg-gradient-to-br from-[#E63946] to-[#C1121F] text-white rounded-xl font-['Poppins'] font-semibold text-base text-center transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E63946]/40 shadow-lg shadow-[#E63946]/30"
          >
            🚀 Start Student Gameplay
          </Link>
          <Link
            href="/admin/dashboard"
            className="w-full block py-4 px-6 bg-white text-[#E63946] border-2 border-[#E63946] rounded-xl font-['Poppins'] font-semibold text-base text-center transition-all hover:bg-[#FFF5F5] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#E63946]/20"
          >
            🎮 Admin Dashboard
          </Link>
        </div>

        <div className="text-center mt-8 text-[13px] text-gray-400">
          <p className="mb-2">🔓 Authentication disabled for prototype demo</p>
          <p>💻 Optimized for iPad and desktop devices</p>
        </div>
      </div>
    </div>
  )
}
