import type { Judge0Response } from '@/types/questions/Judge0Response'
import { useEffect, useRef } from 'react'

const ConsoleOutput = ({logs}: {logs: Judge0Response[]}) => {
    const scrollRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <div data-testid="ConsoleOutput" ref={scrollRef}
            className='h-full flex-1 overflow-y-auto mb-2 pb-4'
        >
            {logs.map((log, idx) => {
                const status = log.status.description.toLowerCase() === "accepted" ? "Passed" : "Failed"
                const text_color = status === "Passed"
                    ? "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400" 
                    : "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"

                return <div data-testid={`log-${idx+1}`} key={`log-${idx+1}`}
                    className='flex flex-col items-start mb-3' >
                    <div className={`w-full flex flex-row items-center justify-between gap-3 px-2 mb-1.5 text-sm rounded-md ${text_color}`} >
                        <div>{status}</div>
                        <div data-testid='log-status' className='text-base font-semibold' >
                            {log.status.description}
                        </div>
                        {log.time && (
                            <div data-testid='log-time' >
                                Time: {log.time} s
                            </div> 
                        )}

                    </div>
                    <div className={`flex flex-col gap-0.5 p-2 bg-muted/65 rounded-md`} >
                        {log.stdout && (
                            <div data-testid='log-stdout' >
                                stdout: {log.stdout.replaceAll('\n', String.raw`\n`)}
                            </div>
                        )}
                        {log.compile_output && (
                            <div data-testid='log-compile-output' >
                                Compilation output: {log.compile_output}
                            </div>
                        )}
                        {log.stderr && (
                            <p className='text-red-600' data-testid='log-stderr' >
                                {log.stderr}
                            </p>
                        )}
                        {log.message && (
                            <p data-testid='log-message' className='wrap-break-word w-full' >
                                {log.message}
                            </p>
                        )}
                    </div>
                </div>
            })}
        </div>
    )
}

export default ConsoleOutput