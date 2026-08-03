import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type WhatsAppIdentityPickerProps = {
  open: boolean
  chatName: string
  senders: string[]
  onConfirm: (meName: string) => void
  onCancel: () => void
}

/** Modal list for picking which WhatsApp sender is “you”. */
export function WhatsAppIdentityPicker({
  open,
  chatName,
  senders,
  onConfirm,
  onCancel,
}: WhatsAppIdentityPickerProps) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        // Reset selection when remounted via key from parent.
      >
        <DialogHeader>
          <DialogTitle className="text-base">Who are you?</DialogTitle>
          <DialogDescription>
            {chatName
              ? `Select your name so sent vs received stats are accurate (${chatName}).`
              : "Select your name so sent vs received stats are accurate."}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto py-1">
          {senders.map((sender) => {
            const active = selected === sender
            return (
              <li key={sender}>
                <button
                  type="button"
                  onClick={() => setSelected(sender)}
                  className={cn(
                    "flex w-full items-center rounded-lg px-3 py-2.5 text-start text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground hover:bg-muted"
                  )}
                >
                  {sender}
                </button>
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (selected) onConfirm(selected)
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
