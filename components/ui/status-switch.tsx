"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const StatusSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, checked, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-7 w-20 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-green-600" : "bg-red-500",
      className
    )}
    checked={checked}
    {...props}
    ref={ref}
  >
    <div className={"absolute flex w-20 items-center justify-between checked:ps-0 checked:pe-2 text-[10px] font-bold text-white uppercase select-none pointer-events-none"+(checked?" px-2":" ps-6")}>
      {checked && <span className={cn("transition-opacity duration-200", checked ? "opacity-100" : "opacity-0")}>Active</span>}
     <span className={cn("transition-opacity duration-200", !checked ? "opacity-100" : "opacity-0")}>Inactive</span>
    </div>
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200",
        checked ? "translate-x-[50px]" : "translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
))
StatusSwitch.displayName = "StatusSwitch"

export { StatusSwitch }