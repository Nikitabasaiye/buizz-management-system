"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { BuizzLogo } from "@/components/brand/BuizzLogo";
import { useVerifyEmailMutation } from "@/store/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;
  
  const [verifyEmailMutation, { isLoading, isSuccess, isError, error }] = useVerifyEmailMutation();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (token) {
      verifyEmailMutation({ token })
        .unwrap()
        .then(() => {
          setMessage({ 
            text: "Email verified successfully! Redirecting...", 
            type: "success" 
          });
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        })
        .catch((err: any) => {
          setMessage({ 
            text: err.data?.message || "Verification failed. Please try again.", 
            type: "error" 
          });
        });
    }
  }, [token, router, verifyEmailMutation]);

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#ec1b72]/15">
            <BuizzLogo size="lg" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {isLoading ? (
            <div className="py-12">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-[#ec1b72] mb-4" />
              <p className="text-lg font-semibold text-slate-700">Verifying your email...</p>
            </div>
          ) : isSuccess ? (
            <div className="py-12">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Email Verified!</h2>
              <p className="text-slate-600">Your email has been successfully verified.</p>
            </div>
          ) : isError ? (
            <div className="py-12">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Verification Failed</h2>
              <p className="text-red-600">{message?.text || "Invalid or expired verification link."}</p>
            </div>
          ) : (
            <div className="py-12">
              <Loader2 className="w-16 h-16 animate-spin mx-auto text-[#ec1b72] mb-4" />
              <p className="text-lg font-semibold text-slate-700">Verifying your email...</p>
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-[#ec1b72] hover:text-[#d61a62]">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
