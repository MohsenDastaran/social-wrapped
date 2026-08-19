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

const DONATE_WALLETS = [
  {
    id: "btc",
    ticker: "BTC",
    name: "Bitcoin",
    network: "Bitcoin",
    logo: "btc",
    address: "bc1q7xxhed3j8k8d3x0tzz4rvwh6nrpl05856utmc6",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=0&address=bc1q7xxhed3j8k8d3x0tzz4rvwh6nrpl05856utmc6",
  },
  {
    id: "eth",
    ticker: "ETH",
    name: "Ethereum",
    network: "Ethereum",
    logo: "eth",
    address: "0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=60&address=0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC",
  },
  {
    id: "usdt-ethereum",
    ticker: "USDT",
    name: "Tether",
    network: "Ethereum",
    logo: "usdt",
    address: "0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=60&address=0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC&token_id=0xdAC17F958D2ee523a2206206994597C13D831ec7",
  },
  {
    id: "usdt-trc20",
    ticker: "USDT",
    name: "Tether",
    network: "TRC-20",
    logo: "usdt",
    address: "TLgV4aKQ2Gjx4M3hY8t8N3F1ENh7XRhok1",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=195&address=TLgV4aKQ2Gjx4M3hY8t8N3F1ENh7XRhok1&token_id=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
  {
    id: "sol",
    ticker: "SOL",
    name: "Solana",
    network: "Solana",
    logo: "sol",
    address: "6R2R1YfhaFuPpH2hzyvRtLD9WJ9DDcJJKXn5GhUNcNzR",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=501&address=6R2R1YfhaFuPpH2hzyvRtLD9WJ9DDcJJKXn5GhUNcNzR",
  },
  {
    id: "bnb",
    ticker: "BNB",
    name: "BNB",
    network: "BSC",
    logo: "bnb",
    address: "0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC",
    trustWalletUrl:
      "https://link.trustwallet.com/send?coin=20000714&address=0xA9C3daE9306aD99D735B27478E9Cfb804830a1eC",
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
            Social Wrapped is free and open-source. Your exports stay on your
            device — no accounts, no data uploads. Desktop and Android apps work
            fully offline. If it was useful, a crypto tip helps keep the lights
            on.
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
            spacing={1}
            size="sm"
            className="grid w-full grid-cols-3 sm:grid-cols-6"
            aria-label="Cryptocurrency"
          >
            {DONATE_WALLETS.map((item) => (
              <ToggleGroupItem
                key={item.id}
                value={item.id}
                aria-label={`${item.name} · ${item.network}`}
                className="flex h-auto min-h-0 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 whitespace-normal"
              >
                <img
                  src={`/images/crypto/${item.logo}.svg`}
                  alt=""
                  draggable={false}
                  className="size-7 object-contain"
                />
                <span className="text-[0.625rem] leading-none font-medium">
                  {item.ticker}
                </span>
                <span
                  className="w-full truncate text-center text-[0.625rem] leading-none text-muted-foreground"
                  title={item.network}
                >
                  {item.network}
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>
            Send {wallet.ticker} on {wallet.network}.
          </FieldDescription>
        </Field>

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
