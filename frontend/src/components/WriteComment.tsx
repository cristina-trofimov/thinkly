import {
InputGroup,
InputGroupAddon,
InputGroupButton,
InputGroupTextarea,
} from "@/components/ui/input-group"
import { CodeXml, Link2, Send } from "lucide-react"
  
export function WriteComment() {
    return (
      <div className="grid w-full max-w-xl gap-4">
        <InputGroup>
          <InputGroupTextarea
            id="textarea-code-32"
            placeholder="Add to the discussion here..."
            className="min-h-[100px]"
          />
          <InputGroupAddon align="block-end" >
            <div className="flex flex-row" >
                <CodeXml size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
                <Link2 size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
            </div>
            <InputGroupButton size="sm" className="ml-auto bg-purple-600 text-white" >
              Comment
              <Send className="mt-[1px]" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    )
}
  