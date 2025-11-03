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
            <InputGroupAddon className='flex flex-row justify-start items-center'>
                <ItemMedia variant="image" >
                    <Skeleton className="h-12 w-12 rounded-full" />
                </ItemMedia>
                <div className='flex flex-col items-start gap-3'>
                    <InputGroupText
                        className='font-semibold text-primary' >
                        {comment.senderName}
                        <span className='font-light text-gray-500' >- {comment.senderEmail}</span>
                    </InputGroupText>
                    <InputGroupText
                        className='text-s max-h-12 leading-3 break-words overflow-scroll whitespace-normal'
                    >
                        {comment.comment}
                    </InputGroupText>
                </div>
            </InputGroupAddon>
            <InputGroupAddon align="block-end" >
                <div className="flex flex-row" >
                    {comment.liked
                        ? <Heart size={20} onClick={() => likeUnlike()}
                            className="ml-auto w-8 h-7 p-1 rounded-lg bg-background text-primary
                                    fill-current hover:fill-transparent hover:bg-primary/15"
                            />
                        : <Heart size={20} onClick={() => likeUnlike()}
                            className="ml-auto w-8 h-7 p-1 rounded-lg bg-background text-primary
                                    fill-transparent hover:fill-current hover:bg-primary/15"
                            />
                    }

                    <MessageSquareReply size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-primary/15" />
                    <MessageSquareWarning size={20} className="ml-auto w-8 h-7 p-1 rounded-lg bg-background hover:bg-primary/15" />
                </div>
            </InputGroupAddon>
        </InputGroup>
    )
}

export default ViewComment