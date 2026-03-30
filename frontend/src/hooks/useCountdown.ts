// hooks/useCountdown.ts
import { useEffect, useState } from 'react'

export function useCountdown(endTime: string | Date | null | undefined) {
    const getRemaining = () => {
        if (!endTime) return null
        return Math.max(0, new Date(endTime).getTime() - Date.now())
    }

    const [remaining, setRemaining] = useState<number | null>(getRemaining)

    useEffect(() => {
        if (!endTime) return
        const id = setInterval(() => {
            const ms = Math.max(0, new Date(endTime).getTime() - Date.now())
            setRemaining(ms)
            if (ms === 0) clearInterval(id)
        }, 1000)
        return () => clearInterval(id)
    }, [endTime])

    return remaining
}