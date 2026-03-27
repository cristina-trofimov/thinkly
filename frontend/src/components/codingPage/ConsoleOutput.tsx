import type { Judge0Response } from '@/types/questions/Judge0Response'

const ConsoleOutput = ({logs}: {logs: Judge0Response[]}) => {
  return (
    <div data-testid="ConsoleOutput" className='w-full h-full flex flex-col-reverse gap-2 overflow-y-scroll overscroll-x-contain' >
        {logs.map((log, idx) => {
            const stat = log.status.description === "Accepted" ? "Passed" : "Failed"
            const bgColor =
              log.status.description === "Accepted" ? "bg-green-100" : "bg-red-100"
            const textColor =
              log.status.description === "Accepted" ? "text-green-700" : "text-red-700"

            return <div data-testid={`log-${idx+1}`} key={`log-${idx+1}`}
                className='flex columns-2 gap-1.5 items-start'
            >
                <div
                    className={`flex items-center justify-center py-1 px-2 text-sm font-medium rounded-md ${bgColor} ${textColor}`}
                >
                    {stat}
                </div>
                <div className={`flex flex-col gap-0.5`} >
                    <div data-testid='log-status' >
                        Status: {log.status.description}
                    </div>
                    {log.time && (
                        <div data-testid='log-time' >
                            {log.time} s
                        </div> 
                    )}
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