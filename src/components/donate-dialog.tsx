import { useCallback, useState, type ReactElement } from "react"
import { ArrowUpRight, Check, Copy, Heart, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/** Replace addresses, Trust Wallet links, and optional QR images before shipping. */
const DONATE_WALLETS = [
  {
    id: "btc",
    ticker: "BTC",
    name: "Bitcoin",
    address: "YOUR_BTC_ADDRESS",
    trustWalletUrl: "",
    qrSrc: "",
  },
  {
    id: "eth",
    ticker: "ETH",
    name: "Ethereum",
    address: "YOUR_ETH_ADDRESS",
    trustWalletUrl: "",
    qrSrc: "",
  },
  {
    id: "usdt",
    ticker: "USDT",
    name: "Tether",
    address: "YOUR_USDT_ADDRESS",
    trustWalletUrl: "",
    qrSrc: "",
  },
  {
    id: "sol",
    ticker: "SOL",
    name: "Solana",
    address: "YOUR_SOL_ADDRESS",
    trustWalletUrl: "",
    qrSrc: "",
  },
  {
    id: "bnb",
    ticker: "BNB",
    name: "BNB",
    address: "YOUR_BNB_ADDRESS",
    trustWalletUrl: "",
    qrSrc: "",
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Donate</DialogTitle>
          <DialogDescription>
            Social Wrapped is free, local-first, and built without ads or
            accounts. If it was useful, a crypto tip helps keep the lights on.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel>Cryptocurrency</FieldLabel>
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
            spacing={2}
            size="lg"
            className="grid w-full grid-cols-6 sm:flex sm:flex-wrap sm:justify-center"
            aria-label="Cryptocurrency"
          >
            {DONATE_WALLETS.map((item, index) => (
              <ToggleGroupItem
                key={item.id}
                value={item.id}
                aria-label={item.name}
                className={cn(
                  "col-span-2 flex h-auto min-h-20 w-full flex-col items-center justify-center rounded-xl px-1 py-2.5 whitespace-normal sm:size-20 sm:min-h-20 sm:w-20 sm:py-0",
                  index === 3 && "max-sm:col-start-2"
                )}
              >
                <img
                  src={`/images/crypto/${item.id}.svg`}
                  alt=""
                  draggable={false}
                  className="size-9 object-contain sm:size-8"
                />
                <span className="w-full truncate text-center text-xs leading-none text-muted-foreground">
                  {item.name}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            Send {wallet.name} ({wallet.ticker}) to the address below.
          </FieldDescription>
        </Field>

        {wallet.qrSrc ? (
          <img
            src={wallet.qrSrc}
            alt={`${wallet.name} payment QR code`}
            className="mx-auto size-36 rounded-xl object-contain ring-1 ring-foreground/10 sm:size-40"
          />
        ) : null}

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

        <DialogFooter className="sm:justify-stretch">
          <Button
            className="w-full"
            disabled={!wallet.trustWalletUrl}
            render={
              wallet.trustWalletUrl ? (
                <a
                  href={wallet.trustWalletUrl}
                  target="_blank"
                  rel="noreferrer"
                />
              ) : undefined
            }
          >
            <Wallet data-icon="inline-start" />
            Pay with Trust Wallet
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
