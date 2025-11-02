import { Button } from "./ui/button";
import { useNavigate } from 'react-router-dom';

const ErrorPage = () => {
    const navigate = useNavigate();
    return (
        <section className="p-20 lg:p-40 bg-background relative flex flex-col items-center overflow-hidden" >
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16" >
                <div className="flex flex-1 flex-col gap-6 lg:gap-8" >
                    <div className="flex flex-col gap-y-4" >
                        <h1 className="text-6xl text-primary font-bold" >
                            404<span className="text-5xl ml-3" >(☉⁠｡⁠☉⁠)⁠!</span>
                        </h1>
                        <h2 className="text-2xl text-primary font-semibold" >
                            Page not found
                        </h2>
                        <p className="text-muted-foreground text-lg lg:text-xl" >
                            Not sure what you're looking for, but we don't have it ಥ⁠‿⁠ಥ
                            <br/>
                            <span className="italic text-base" >Sorryyy pookie ♪⁠～⁠(⁠´⁠ε⁠｀⁠ ⁠)</span>
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row" >
                        <Button onClick={() => navigate('/home')}
                        className="inline-flex items-center justify-center gap-2 rounded-md
                                    text-sm font-medium bg-primary text-primary-foreground
                                    hover:bg-primary/90 h-9 px-4 py-2 whitespace-nowrap
                                    shrink-0 transition-all outline-none focus-visible:ring-[3px]
                                    focus-visible:border-ring focus-visible:ring-ring/50" >
                            Go back home
                        </Button>
                    </div>
                </div>
                <div data-testid="logo" className="w-full flex-1 bg-primary" >
                    <div className="relative w-full pb-[100%]" >
                        <div className="absolute top-0 right-0 bottom-0 left-0" >
                            <img decoding="async" data-nimg="fill"
                                className="h-full w-full rounded-xl object-cover
                                        absolute left-0 top-0 right-0 bottom-0 bg-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ErrorPage