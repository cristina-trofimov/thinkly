"use client"

import * as React from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"

//const API_BASE = "http://127.0.0.1:8000"

const schema = z.object({
    to: z.string().min(3, "Enter at least one recipient (comma-separated)"),
    subject: z.string().min(1, "Subject is required"),
    text: z.string().min(1, "Text body is required"),
    sendAtLocal: z.string().optional(),
    sendInOneMinute: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

interface EmailPayload {
  to: string[];    // or string depending on our format
  subject: string;
  text: string;
}

function localToUTCZ(dtLocal?: string) {
    if (!dtLocal) return undefined
    const local = new Date(dtLocal)
    if (isNaN(local.getTime())) return undefined
    return new Date(local.getTime() - local.getTimezoneOffset() * 60000)
        .toISOString()
        .replace(".000Z", "Z")
}

function oneMinuteFromNowISO() {
    return new Date(Date.now() + 60_000).toISOString().replace(".000Z", "Z")
}

export default function SendEmailForm({ className }: { className?: string }) {
    const [submitting, setSubmitting] = React.useState(false)

    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            to: "",
            subject: "",
            text: "",
            sendAtLocal: "",
            sendInOneMinute: false,
        },
    })

    const onSubmit = async (values: FormValues) => {
        const toList = values.to.split(",").map(s => s.trim()).filter(Boolean)
        if (toList.length === 0) {
            form.setError("to", { message: "Provide at least one recipient" })
            return
        }

        const payload: EmailPayload = {
            to: toList,
            subject: values.subject,
            text: values.text,
        }

        const sendAt = values.sendInOneMinute
            ? oneMinuteFromNowISO()
            : localToUTCZ(values.sendAtLocal)
        if (sendAt) payload.sendAt = sendAt

        try {
            setSubmitting(true)
            const res = await fetch('http://127.0.0.1:8000/send-email', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            const body = await res.json().catch(() => ({}))

            if (!res.ok) {
                toast.error(body?.error || `Send failed (HTTP ${res.status})`, {
                    description: body?.detail && JSON.stringify(body.detail),
                })
                return
            }

            toast.success(sendAt ? "Email scheduled ✅" : "Email sent ✅", {
                description: sendAt
                    ? `Will send at ${sendAt} (UTC)`
                    : "Brevo accepted the message.",
            })

            form.reset({
                to: "",
                subject: "",
                text: "",
                sendAtLocal: "",
                sendInOneMinute: false,
            })
        } catch (e: unknown) {
            toast.error("Network error", { description: e?.message ?? String(e) })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={cn("w-full max-w-xl rounded-2xl border p-6", className)}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                        control={form.control}
                        name="to"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>To (comma-separated)</FormLabel>
                                <FormControl>
                                    <Input placeholder="alice@example.com, bob@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                    <Input placeholder="Subject" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="text"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                    <Textarea rows={6} placeholder="Write your message..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="sendInOneMinute"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-md border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Send in 1 minute</FormLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Overrides the custom schedule if enabled.
                                        </p>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sendAtLocal"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Schedule (local time, optional)</FormLabel>
                                    <FormControl>
                                        <Input type="datetime-local" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="bg-[#8065CD] w-full" disabled={submitting}>
                        {submitting ? "Sending…" : "Send"}
                    </Button>
                </form>
            </Form>
        </div>
    )
}
