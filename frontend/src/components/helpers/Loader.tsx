import { Dialog, DialogContent, DialogOverlay } from '@radix-ui/react-dialog'
import { Spinner } from '../ui/spinner'

const Loader = ({ isOpen, msg }: { isOpen: boolean, msg: string } ) => {
  if (!msg) {
    msg  = "Loading"
  }

    msg = `${msg}♥♥♥`

  return (
    <Dialog open={isOpen} >
        <DialogOverlay className='fixed inset-0 z-9998 bg-black/40 backdrop-blur-sm' data-testid="Loader"  >
          <DialogContent  onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            className='bg-transparent z-9999 border-none
              fixed inset-0 flex justify-center items-center'
          >
            <div className='h-75 bg-accent text-primary flex flex-row gap-4 px-8 py-6 
                items-center justify-center rounded-lg shadow-lg font-medium'
            >
              <Spinner className='size-4 md:size-6 lg:size-8 animate-caret-fade' />
              {msg.split('').map((c, idx) => {
                const startDelay = 0
                const delay = 150
                const style = c === '.' ? 'text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-2xl lg:text-3xl'

                return <span style={{ animationDelay: `${startDelay + delay * idx}ms` }}
                  className={`${style} animate-[bounce_1s_infinite_ease-in-out,pulse_2s_infinite_ease-in-out]`}
                >
                  {c}
                </span>

              })}
            </div>
          </DialogContent>
        </DialogOverlay>
    </Dialog>
  )
}

export default Loader