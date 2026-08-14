import { useCallback, useState, type ReactElement } from "react"
import { Check, Heart, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

/** Replace these with your live receive addresses before shipping. */
const DONATE_WALLETS = [
  {
    id: "btc",
    ticker: "BTC",
    name: "Bitcoin",
    address: "YOUR_BTC_ADDRESS",
  },
  {
    id: "eth",
    ticker: "ETH",
    name: "Ethereum",
    address: "YOUR_ETH_ADDRESS",
  },
  {
    id: "usdt",
    ticker: "USDT",
    name: "Tether",
    address: "YOUR_USDT_ADDRESS",
  },
  {
    id: "sol",
    ticker: "SOL",
    name: "Solana",
    address: "YOUR_SOL_ADDRESS",
  },
  {
    id: "bnb",
    ticker: "BNB",
    name: "BNB",
    address: "YOUR_BNB_ADDRESS",
  },
] as const

type WalletId = (typeof DONATE_WALLETS)[number]["id"]

interface DonateDialogProps {
  /**
   * Trigger element. Pass `null` when opening only via `open` / `onOpenChange`.
   * Defaults to the Donate button.
   */
  trigger?: ReactElement | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const DEFAULT_TRIGGER = (
  <Button variant="outline" className="gap-1.5 rounded-full">
    <Heart data-icon="inline-start" />
    Donate
  </Button>
)

export function DonateDialog({
  trigger = DEFAULT_TRIGGER,
  open,
  onOpenChange,
}: DonateDialogProps) {
  const [walletId, setWalletId] = useState<WalletId>(DONATE_WALLETS[0].id)
  const [copied, setCopied] = useState(false)

  const wallet =
    DONATE_WALLETS.find((item) => item.id === walletId) ?? DONATE_WALLETS[0]

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be denied; the address stays visible to copy manually.
    }
  }, [wallet.address])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Donate</DialogTitle>
          <DialogDescription>
            Social Wrapped is free, local-first, and built without ads or
            accounts. If it was useful, a crypto tip helps keep the lights on.
          </DialogDescription>
        </DialogHeader>

        <ToggleGroup
          value={[walletId]}
          onValueChange={(groupValue) => {
            const next = groupValue[0]
            if (DONATE_WALLETS.some((item) => item.id === next)) {
              setWalletId(next as WalletId)
              setCopied(false)
            }
          }}
          variant="outline"
          spacing={0}
          size="sm"
          className="w-full"
          aria-label="Cryptocurrency"
        >
          {DONATE_WALLETS.map((item) => (
            <ToggleGroupItem
              key={item.id}
              value={item.id}
              aria-label={item.name}
              className="flex-1 px-2"
            >
              {item.ticker}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="donate-wallet" className="sr-only">
              {wallet.name} wallet address
            </Label>
            <InputGroup className="h-9">
              <InputGroupInput
                id="donate-wallet"
                value={wallet.address}
                readOnly
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  aria-label={copied ? "Address copied" : "Copy address"}
                  onClick={copyAddress}
                >
                  {copied ? <Check /> : <Copy />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
