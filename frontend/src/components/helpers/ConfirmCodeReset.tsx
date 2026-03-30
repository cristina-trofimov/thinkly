import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const ResetCode = ({
    isOpen, setClose, setReset, setNoReset
}: {
    isOpen: boolean, setClose: () => void,
    setReset: () => void, setNoReset: () => void
}) => {
    const handleClose = (confirm: boolean) => {
        if (confirm) {
            setReset()
        } else {
            setNoReset()
        }
        setClose()
    }

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent data-testid="confirm-code-reset">
                <AlertDialogHeader>
                    <AlertDialogTitle>Reset your code?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will delete the code you already wrote and restore the original template. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel data-testid="cancel-reset-btn" onClick={() => handleClose(false)}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        data-testid="reset-btn"
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => handleClose(true)}
                    >
                        Reset
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default ResetCode