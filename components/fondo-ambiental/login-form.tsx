"use client"

import { useState, type FormEvent } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginForm() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const email = String(data.get("email") ?? "").trim().toLowerCase()
    const password = String(data.get("password") ?? "")

    setPending(true)
    setError(null)
    const { error: authError } = await createClient().auth.signInWithPassword({ email, password })
    setPending(false)

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("invalid")
          ? "El correo o la contraseña no coinciden. Revisalos e intentá de nuevo."
          : "No pudimos iniciar sesión. Intentá de nuevo en unos segundos.",
      )
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-xl">Fondo Ambiental</CardTitle>
          <CardDescription className="leading-relaxed">
            Ingresá con el mismo correo y contraseña que usás en el panel institucional.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder="nombre@cba.gov.ar" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm leading-relaxed text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Ingresando
              </>
            ) : (
              "Ingresar"
            )}
          </Button>

          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            Si todavía no tenés una cuenta, pedile a un administrador que te dé de alta.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
