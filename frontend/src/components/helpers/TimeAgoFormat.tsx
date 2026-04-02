export const TimeAgoFormat = (dateSTR: string) => {
    const diffMs = Date.now() - Date.parse(dateSTR)

    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""} ago`
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else {
        return `> 1 min ago`
    }
}