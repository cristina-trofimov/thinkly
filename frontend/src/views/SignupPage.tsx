import thinkly from "../../public/assets/thinkly_logo.png"
import scsLogo from "../../public/assets/logo.png"
import { SignupForm } from "@/components/forms/SignupForm";

export default function SignupPage() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="#" className="flex items-center gap-2 font-medium">
                        <div className="text-primary-foreground flex size-10 items-center justify-center rounded-md">
                            <img src={thinkly} alt="Your icon" className="size-10" />
                        </div>
                        <span className="font-semibold">Thinkly</span>
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs">
                        <SignupForm />
                    </div>
                </div>
            </div>
            <div className="bg-primary relative hidden lg:block">
                <div className="absolute inset-0 flex items-center justify-center">
                    <img
                        src={scsLogo}
                        alt="logo of scs"
                        className="max-w-md object-cover dark:brightness-[0.2] dark:grayscale"
                    />
                </div>
            </div>
        </div>
    )
}
