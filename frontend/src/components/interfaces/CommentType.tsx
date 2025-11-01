export type CommentType = {
    senderName: string,
    senderEmail: string,
    senderPP: string,
    liked: boolean,
    comment: string,
    replies: CommentType[],
}