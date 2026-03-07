export const TimeAgoFormat = (dateSTR: string) => {
    const diffMs = Date.now() - Date.parse(dateSTR)

    const seconds = Math.floor(diffMs / 1000)
    const minutes = Math.floor(diffMs / (1000 * 60))
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // let displayTime = ''
    if (days > 0) {
        return `${days} day${days > 1 ? "s" : ""} ago`
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? "s" : ""} ago`
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
    } else {
        return `${seconds} second${seconds === 1 ? "" : "s"} ago`
    }
}