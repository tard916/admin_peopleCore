"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await loginAction(data);
      if (result?.error) {
        toast.error(result.error);
      }
      // On success, the server action redirects — no client-side nav needed
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[5px]">
        <label htmlFor="email" className="text-[12px] font-medium text-foreground tracking-[-0.01em]">Email</label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@224tech.com"
          {...register("email")}
          className={errors.email ? "border-destructive" : ""}
        />
        {errors.email && (
          <span className="text-[11px] text-destructive">{errors.email.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-[5px]">
        <label htmlFor="password" className="text-[12px] font-medium text-foreground tracking-[-0.01em]">Password</label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
          className={errors.password ? "border-destructive" : ""}
        />
        {errors.password && (
          <span className="text-[11px] text-destructive">{errors.password.message}</span>
        )}
      </div>

      <Button type="submit" className="w-full mt-1" size="lg" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in →"}
      </Button>
    </form>
  );
}
