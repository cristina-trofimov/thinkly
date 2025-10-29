import { Heart, MessageSquareReply, MessageSquareWarning } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupText } from './ui/input-group'
import { ItemMedia } from './ui/item'
import { Skeleton } from './ui/skeleton'
import type { CommentType } from './interfaces/CommentType'

const ViewComment = ({comment}: {comment: CommentType}) => {
    const likeUnlike = () => {
        comment.liked = !comment.liked
    }

    return (
        <InputGroup>
            <InputGroupAddon className='w-full flex justify-start items-center gap-2'>
                <ItemMedia variant="image" >
                    <Skeleton className="h-12 w-12 rounded-full" />
                </ItemMedia>
                <div className='flex-col items-start'>
                    <InputGroupText
                        className='text-purple-600 font-semibold' >
                        {comment.senderName}
                        <span className='font-light text-gray-500' >- {comment.senderEmail}</span>
                    </InputGroupText>
                    <InputGroupText
                        className='text-base leading-6 break-words overflow-scroll whitespace-normal'
                    >
                        {comment.comment}
                    </InputGroupText>
                </div>
            </InputGroupAddon>
            <InputGroupAddon align="block-end" >
                <div className="flex flex-row" >
                    {comment.liked
                        ? <Heart size={20} fill='purple' onClick={() => likeUnlike()}
                            className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200 border-0"
                            />
                        : <Heart size={20} onClick={() => likeUnlike()}
                            className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200"
                            />
                    }

                    <MessageSquareReply size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
                    <MessageSquareWarning size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-gray-200" />
                </div>
            </InputGroupAddon>
        </InputGroup>
    )
}

export default ViewComment