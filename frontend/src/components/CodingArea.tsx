import { Maximize2, Play, RotateCcw } from "lucide-react";
import type { CodeItem } from "./interfaces/CodeItem";
import { SandboxCodeEditor } from "./ui/shadcn-io/sandbox";
import { Button } from "./ui/button";


const CodingArea = ({ CodeItem }: { CodeItem: CodeItem[] }) => {
  return (
    <div>
        <div className="w-full rounded-none h-10 bg-muted flex flex-row items-center justify-between
                        border-b border-border/75 dark:border-border/50 py-1.5 px-4"
        >
            <span className="text-lg font-medium" >Code</span>
            <div className="grid grid-cols-3 gap-0.5">
                {/* Size buttons */}
                <Button className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                    <Play size={22} color="green" />
                </Button>
                <Button className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                    <RotateCcw size={22} color="black" />
                </Button>
                <Button className="shadow-none bg-muted rounded-full hover:bg-gray-200" >
                    <Maximize2 size={22} color="black" />
                </Button>
            </div>
        </div>
        <SandboxCodeEditor showTabs showLineNumbers showInlineErrors />
    </div>
  );
};

export default CodingArea;
