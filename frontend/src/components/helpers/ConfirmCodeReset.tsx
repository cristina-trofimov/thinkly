import { Dialog, DialogClose, DialogContent, DialogOverlay, DialogTitle } from '@radix-ui/react-dialog'
import { DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { IconExclamationMark } from '@tabler/icons-react'
import { XIcon } from 'lucide-react'


const ResetCode = ({ 
    isOpen, setClose, setConfirmReset
}: {
    isOpen: boolean, setClose: any, setConfirmReset: any
} ) => {

    const handleClose = (confirm: boolean) => {
        setClose(false)
        setConfirmReset(confirm)
    }

    return (
        <Dialog open={isOpen} >
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogOverlay className='fixed inset-0 z-9998 bg-black/40 backdrop-blur-sm' data-testid="confirm-code-reset"  >
                <DialogContent onEscapeKeyDown={() => handleClose(false)}
                    // onPointerDownOutside={() => handleClose(false)}
                    className='bg-transparent z-9999 border-none
                        fixed inset-0 flex justify-center items-center'
                >
                    <div className='h-75 bg-accent flex flex-col gap-4 px-8 py-6 
                        justify-center rounded-lg shadow-lg font-medium'
                    >
                        <DialogClose onClick={() => handleClose(false)} >
                            <XIcon />
                        </DialogClose>
                        <div className='text-primary flex flex-row gap-4 px-8 py-6 
                            items-center justify-center font-medium'
                        >
                            <IconExclamationMark />
                            <div className='flex flex-col' >
                                <p className='wrap-break-word' >
                                    Are you sure you want to continue this action?
                                </p>
                                <p className='wrap-break-word' >
                                    It will delete the code you already wrote
                                </p>
                            </div>
                        </div>
                        <DialogFooter className='px-6 pb-6 flex justify-between' >
                            <Button className='bg-red-700 hover:bg-red-700/75'
                                onClick={() => handleClose(false)} >
                                Cancel
                            </Button>
                            <Button className='bg-primary hover:bg-primary/75'
                                onClick={() => handleClose(true)} >
                                Continue
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </DialogOverlay>
        </Dialog>
    )
}

export default ResetCode