import { Heart, MessageSquareReply, MessageSquareWarning } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupText } from './ui/input-group'
import { ItemMedia } from './ui/item'
import { Skeleton } from './ui/skeleton'

const ViewComment = () => {
  return (
    <InputGroup>
        <InputGroupAddon className='flex flex-row justify-start'>
            <ItemMedia variant="image">
                <Skeleton className="h-12 w-12 rounded-full" />
                    {/* <Image
                    src={`https://avatar.vercel.sh/${song.title}`}
                    alt={song.title}
                    width={32}
                    height={32}
                    className="object-cover grayscale"
                    /> */}
            </ItemMedia>
            <div className='flex flex-col'>
                <InputGroupText className='text-purple-600 font-semibold' >cndknck <span className='font-light text-gray-500' >- example@gmail.com</span> </InputGroupText>
                <InputGroupText>Some random comment</InputGroupText>
            </div>
          </InputGroupAddon>
          <InputGroupAddon align="block-end" >
            <div className="flex flex-row" >
                <Heart size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
                <MessageSquareReply size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
                <MessageSquareWarning size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
            </div>
        </InputGroupAddon>
    </InputGroup>
  )
}

export default ViewComment