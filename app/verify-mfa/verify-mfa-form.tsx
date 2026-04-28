"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifyMfaAction } from "./actions";

const schema = z.object({
  code: z
    .string()
    .length(6, "Code must be 6 digits")
    .regex(/^\d+$/, "Code must be digits only"),
});

type FormValues = z.infer<typeof schema>;

export function VerifyMfaForm() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(data: FormValues) {
    startTransition(async () => {
      const result = await verifyMfaAction(data);
      if (result?.error) {
        toast.error(result.error);
        reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input
        id="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="000000"
        style={{
          width: "100%",
          textAlign: "center",
          fontSize: "30px",
          letterSpacing: "0.5em",
          padding: "14px 16px",
          paddingRight: 0,
          background: isPending ? "#fff" : "#EDEEF5",
          border: isPending ? "1.5px solid #00288E" : "1.5px solid transparent",
          borderRadius: "6px",
          outline: "none",
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          color: "#131B2E",
          transition: "border 0.12s, background 0.12s",
          display: "block",
        }}
        {...register("code")}
      />
      {errors.code && (
        <span className="text-[11px] text-destructive">{errors.code.message}</span>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Verifying…" : "Verify"}
      </Button>
    </form>
  );
}
