import { Link } from "react-router"

import { Button } from "@/components/ui/button"

/** Unknown URL. Stays on this address so crawlers do not record a redirect. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-1 py-8 text-center">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        This address is not part of Social Wrapped.
      </p>
      <Button render={<Link to="/" />} nativeButton={false}>
        Home
      </Button>
    </div>
  )
}
