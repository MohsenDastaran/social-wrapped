import {
  Alert,
  AlertAction,
  AlertDescription,
} from "@/components/reui/alert"

import { Button } from "@/components/ui/button"
import { ShieldCheckIcon } from "lucide-react"

export function Pattern() {
  return (
    <Alert>
      <ShieldCheckIcon
      />
      <AlertDescription>Update your password and enable 2FA.</AlertDescription>
      <AlertAction>
        <Button variant="outline" size="xs">
          Dismiss
        </Button>
        <Button size="xs">Update</Button>
      </AlertAction>
    </Alert>
  )
}