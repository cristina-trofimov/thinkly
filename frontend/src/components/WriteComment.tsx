import {
InputGroup,
InputGroupAddon,
InputGroupButton,
InputGroupTextarea,
} from "@/components/ui/input-group"
import { CodeXml, Link2, Send } from "lucide-react"
  
export function WriteComment() {
    return (
      <div className="grid max-w-xl gap-4">
        <InputGroup>
          <InputGroupTextarea
            id="textarea-code-32"
            placeholder="Add to the discussion here..."
            className="min-h-[100px] placeholder:text-primary/75"
          />
          <InputGroupAddon align="block-end" >
            <div className="flex flex-row" >
                <CodeXml size={20} className="ml-auto w-8 h-7 p-1 rounded-lg hover:bg-primary/15" />
                <Link2 size={20} className="ml-auto w-8 h-7 p-1 rounded-lg hover:bg-primary/15" />
            </div>
            <InputGroupButton size="sm" className="ml-auto bg-primary text-white font-semibold hover:bg-primary/25" >
              Comment
              <Send className="mt-[1px]" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    )
}
  