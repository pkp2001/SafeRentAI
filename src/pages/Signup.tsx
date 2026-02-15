import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Shield, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

const signupSchema = z
  .object({
    full_name: z.string().min(2, "Name is required"),
    email: z.string().email("Please enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeTerms: z.boolean().refine((v) => v, "You must agree to the terms"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormData = z.infer<typeof signupSchema>;

const passwordChecks = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains number", test: (p: string) => /\d/.test(p) },
  { label: "Contains special character", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

export default function Signup() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { agreeTerms: false },
  });

  const password = watch("password", "");

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      await signUp(data.email, data.password);
      toast.success("Account created! Check your email to verify.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account. Please try again.");
    }
    setIsLoading(false);
  };

  const passwordStrength = passwordChecks.filter((c) => c.test(password)).length;
  const strengthColors = ["bg-danger-500", "bg-warning-500", "bg-warning-400", "bg-success-500"];
  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-primary-50/30 to-white dark:from-dark-900 dark:via-dark-800/30 dark:to-dark-900 px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-100/40 dark:bg-primary-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success-100/30 dark:bg-success-700/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold dark:text-white">SafeRent AI</span>
          </Link>
          <h1 className="text-2xl font-bold dark:text-dark-100">Create your account</h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">Start renting safely in minutes</p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl border border-dark-100 dark:border-dark-700 shadow-xl shadow-dark-900/5 dark:shadow-dark-900/20 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 dark:text-dark-500" />
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="John Smith"
                  className="pl-10"
                />
              </div>
              {errors.full_name && (
                <p className="text-xs text-danger-500">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 dark:text-dark-500" />
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="you@example.com"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-danger-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 dark:text-dark-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:text-dark-500 dark:hover:text-dark-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength */}
              {password && (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-dark-100 dark:bg-dark-700"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-dark-500 dark:text-dark-400">
                    {passwordStrength > 0 && strengthLabels[passwordStrength - 1]}
                  </p>
                  <div className="space-y-1">
                    {passwordChecks.map((check) => (
                      <div key={check.label} className="flex items-center gap-2 text-xs">
                        {check.test(password) ? (
                          <Check className="w-3 h-3 text-success-500" />
                        ) : (
                          <X className="w-3 h-3 text-dark-300 dark:text-dark-500" />
                        )}
                        <span className={check.test(password) ? "text-success-600 dark:text-success-400" : "text-dark-400 dark:text-dark-500"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {errors.password && (
                <p className="text-xs text-danger-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 dark:text-dark-500" />
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-danger-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                checked={agreeTerms}
                onCheckedChange={(checked) => {
                  const val = checked === true;
                  setAgreeTerms(val);
                  setValue("agreeTerms", val, { shouldValidate: true });
                }}
              />
              <label
                className="text-sm text-dark-500 dark:text-dark-400 cursor-pointer leading-tight"
                onClick={() => {
                  const val = !agreeTerms;
                  setAgreeTerms(val);
                  setValue("agreeTerms", val, { shouldValidate: true });
                }}
              >
                I agree to the{" "}
                <span className="text-primary-500 hover:underline">Terms of Service</span> and{" "}
                <span className="text-primary-500 hover:underline">Privacy Policy</span>
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="text-xs text-danger-500">{errors.agreeTerms.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-dark-500 dark:text-dark-400 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

