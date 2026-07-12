"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

// Schema definition
const signupSchema = zod
  .object({
    name: zod.string().min(2, "Name must be at least 2 characters"),
    email: zod.string().min(1, "Email is required").email("Invalid email address"),
    password: zod.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod.string().min(1, "Please confirm your password"),
    currency: zod.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupFields = zod.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFields>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      currency: "INR",
    },
  });

  const onSubmit = async (data: SignupFields) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Set profile name in Firebase Auth
      await updateProfile(user, { displayName: data.name });

      // 3. Initialize user document in firestore
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: data.name,
        currency: data.currency,
        themePreference: "dark",
        createdAt: new Date().toISOString(),
      });

      // 4. Redirect
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email address already exists.");
      } else {
        setError(`Failed to create account: ${err.message || err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnapshot = await getDoc(userDocRef);
      if (!userDocSnapshot.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          currency: "INR",
          themePreference: "dark",
          createdAt: new Date().toISOString(),
        });
      }
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(`Google login failed: ${err.message || err.code}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl transition-all duration-300">
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <img src="/logo.png" alt="Student Pocket Logo" className="h-12 w-12 object-contain rounded-xl shadow-lg bg-card" />
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Create account</h2>
        <p className="text-sm text-muted-foreground">
          Deploy your personal Student Pocket in seconds.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-slide-in">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              disabled={loading || googleLoading}
              placeholder="Alex Johnson"
              {...register("name")}
              className={`mt-1 block w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
                errors.name ? "border-destructive focus:ring-destructive" : "border-border"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              disabled={loading || googleLoading}
              placeholder="name@example.com"
              {...register("email")}
              className={`mt-1 block w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
                errors.email ? "border-destructive focus:ring-destructive" : "border-border"
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disabled={loading || googleLoading}
                  placeholder="••••••"
                  {...register("password")}
                  className={`block w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
                    errors.password ? "border-destructive focus:ring-destructive" : "border-border"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                disabled={loading || googleLoading}
                placeholder="••••••"
                {...register("confirmPassword")}
                className={`mt-1 block w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 ${
                  errors.confirmPassword ? "border-destructive focus:ring-destructive" : "border-border"
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground" htmlFor="currency">
              Primary Currency
            </label>
            <select
              id="currency"
              disabled={loading || googleLoading}
              {...register("currency")}
              className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
              <option value="CAD">CAD ($) - Canadian Dollar</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="mt-4 flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Deploy OS
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={loading || googleLoading}
        className="flex w-full items-center justify-center rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
      >
        {googleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.86-4.53-6.16-4.53z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            Google
          </>
        )}
      </button>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
