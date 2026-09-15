"use client";

import React, { useState } from "react";
import MetallicCheckbox from "../util/custom-checkbox";
import GoogleLoginModal from "./google-login";

// --- SVG Icons Components (Embedded to avoid external dependencies) ---

const Icons = {
  Google: () => (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  ),
  Apple: () => (
    <svg
      className="w-5 h-5 text-gray-200"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.36-3.14-2.6C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.49.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.68-.83 1.14-1.96 1.07-3.17-1 .05-2.28.74-2.95 1.64-.64.85-1.17 2.01-1.08 3.22 1.05.13 2.3-.73 2.96-1.69z" />
    </svg>
  ),
  Github: () => (
    <svg
      className="w-5 h-5 text-gray-200"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  ),
  Facebook: () => (
    <svg
      className="w-5 h-5 text-[#1877F2]"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.197 21.5h5.606v-8.54h3.604l.537-4.21h-4.14v-2.46c0-1.113.36-1.87 1.726-1.87l1.718-.001v-2.91c-2.928-.307-5.896-.307-8.757 0v2.41h-3.29v4.21h3.29v8.54z" />
    </svg>
  ),
  Lock: () => (
    <svg
      className="w-5 h-5 text-[#d4b21d]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  ),
  Email: () => (
    <svg
      className="w-5 h-5 text-[#d4b21d]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  Eye: () => (
    <svg
      className="w-5 h-5 text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  EyeSlash: () => (
    <svg
      className="w-5 h-5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  ),
  Logo: () => (
    <svg
      className="w-8 h-8 text-cyan-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
      />
    </svg>
  ),
  Copyright: () => (
    <svg
      className="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
      <path d="M8.5 13.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm7 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm-3.5 3c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z" />
    </svg>
  ),
};

// --- Reusable Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const MetalInput = ({ label, error, type = "text", ...props }: InputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-300 mb-1.5 ml-1 tracking-wide">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {label === "Password" ? <Icons.Lock /> : <Icons.Email />}
        </div>
        <input
          type={inputType}
          className={`block w-full pl-10 pr-10 py-3 
            bg-linear-to-br from-gray-800 to-gray-900 
            border ${error ? "border-red-500/50" : "border-gray-700"} 
            text-white placeholder-gray-500 
            rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.5)] 
            focus:outline-none hover:border-amber-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500
            transition-all duration-300`}
          placeholder={`Enter your ${label.toLowerCase()}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 cursor-pointer
                    flex items-center hover:text-cyan-400 transition-colors"
          >
            {showPassword ? <Icons.EyeSlash /> : <Icons.Eye />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-400 ml-1 animate-pulse">{error}</p>
      )}
    </div>
  );
};

// --- Main Login Component ---
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      alert(
        `Login Simulation: \n✅Email: ${email}\n✅Password: ${password}\n${agreeToTerms ? "✅" : "❌"}Agree to terms: ${agreeToTerms} `,
      );
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Background Metallic Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-200 h-200 bg-linear-to-r from-cyan-900/20 to-purple-900/20 rounded-full blur-[120px] animate-pulse" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-md mx-4 z-10">
        <div className="bg-[#1a1a1a] border border-gray-700/50 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Top Glow Accent */}
          <div className="h-1 w-full bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-60"></div>

          {/* Header */}
          <div className="p-8 pb-6 border-b border-gray-800 bg-linear-to-b from-[#252525] to-[#1a1a1a] text-center relative">
            <div className="mx-auto w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-black border border-gray-700">
              <Icons.Logo />
            </div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-white to-gray-400 tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400 text-sm">
              Sign in to access the features
            </p>
          </div>

          {/* Social Login Section - CORRECTED SPACING */}
          <div className="px-8 pb-10">
            <div className="grid grid-cols-2 gap-4 mb-8 mt-8">
              <button
                className="flex items-center justify-center gap-3 px-4 py-3 bg-[#2d2d2d] hover:bg-[#333] border border-gray-600/50 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#1877F2]/20 hover:-translate-y-0.5 group cursor-pointer"
                onClick={() => setIsGoogleModalOpen(true)}
              >
                <Icons.Google />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Google
                </span>
              </button>

              <button className="flex items-center justify-center gap-3 px-4 py-3 bg-[#2d2d2d] hover:bg-[#333] border border-gray-600/50 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#1877F2]/20 hover:-translate-y-0.5 group cursor-pointer">
                <Icons.Github />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Github
                </span>
              </button>

              <button className="flex items-center justify-center gap-3 px-4 py-3 bg-[#2d2d2d] hover:bg-[#333] border border-gray-600/50 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#1877F2]/20 hover:-translate-y-0.5 group cursor-pointer">
                <Icons.Apple />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Apple
                </span>
              </button>

              <button className="flex items-center justify-center gap-3 px-4 py-3 bg-[#2d2d2d] hover:bg-[#333] border border-gray-600/50 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#1877F2]/20 hover:-translate-y-0.5 group cursor-pointer">
                <Icons.Facebook />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                  Facebook
                </span>
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700/60"></div>
              </div>
              <span className="relative px-4 text-xs text-gray-500 uppercase tracking-wider bg-[#1a1a1a]">
                Or continue with
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 pt-6">
            <MetalInput
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <MetalInput
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between mt-4 mb-8">
              <MetallicCheckbox
                label="Remember me"
                checked={agreeToTerms}
                onChange={setAgreeToTerms}
                id={"remember"}
              />

              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg 
                         text-sm font-semibold text-black bg-linear-to-r from-cyan-400 to-cyan-600 
                         hover:from-cyan-300 hover:to-cyan-500 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 
                         focus:ring-offset-gray-900
                         transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-black"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-gray-800 text-center">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <a
                  href="#"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                >
                  Create an account
                </a>
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-[#151515] p-4 text-center border-t border-gray-800">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Icons.Copyright />
              <span>{new Date().getFullYear()} Metal Corp.</span>
              <span className="mx-1.5 opacity-50">•</span>
              <a href="#" className="hover:text-gray-400 transition-colors">
                Privacy
              </a>
              <span className="mx-1.5 opacity-50">•</span>
              <a href="#" className="hover:text-gray-400 transition-colors">
                Terms
              </a>
            </div>
          </div>
        </div>
      </div>
      <GoogleLoginModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
      />
    </div>
  );
}
