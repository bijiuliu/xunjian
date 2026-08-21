import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition active:scale-[.97] disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-blue-500 text-white shadow-lg shadow-blue-500/25", secondary: "bg-blue-50 text-blue-600", ghost: "bg-transparent text-slate-600" }, size: { default: "h-11 px-4", icon: "size-10" } }, defaultVariants: { variant: "default", size: "default" } })
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />)
Button.displayName = "Button"

