import type { Judge0Response } from '@/types/questions/Judge0Response'

const ConsoleOutput = ({logs}: {logs: Judge0Response[]}) => {
  return (
    <div data-testid="ConsoleOutput"
        className=' m-2 gap-6 overflow-y-auto overscroll-x-auto'
    >
        {logs.map((l, idx) => {
            const log = logs[logs.length - 1 - idx] // to reverse
            const status = log.status.description.toLowerCase() === "accepted" ? "Passed" : "Failed"
            const text_color = status === "Passed" ? "bg-green-500" : "bg-red-500"

            return <div data-testid={`log-${idx+1}`} key={`log-${idx+1}`}
                className='flex columns-2 gap-1.5 items-start'
            >
                <div className={`flex flex-col py-0.5 px-1 text-sm ${text_color}`} >
                    <div>{status}</div>
                    {log.time && (
                        <div data-testid='log-time' >
                            {log.time} s
                        </div> 
                    )}

                </div>
                <div className={`flex flex-col gap-0.5`} >
                    <div data-testid='log-status' >
                        Status: {log.status.description}
                    </div>
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
                    {log.message && (
                        <p data-testid='log-message' >
                            {log.message}
                        </p>
                    )}
                    {log.stderr && (
                        <p className='text-red-600' data-testid='log-stderr' >
                            {log.stderr}
                        </p>
                    )}
                </div>
            </div>
        })}
    </div>
  )
}

export default ConsoleOutput