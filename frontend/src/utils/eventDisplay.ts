export type EventStatus = "Active" | "Upcoming" | "Completed";

export const getEventStatus = (
  eventStart: Date | string,
  eventEnd?: Date | string
): EventStatus => {
  const now = new Date();
  const start = new Date(eventStart);
  const end = eventEnd ? new Date(eventEnd) : start;

  if (Number.isNaN(start.getTime())) return "Upcoming";
  if (now < start) return "Upcoming";
  if (!Number.isNaN(end.getTime()) && now <= end) return "Active";
  return "Completed";
};

export const formatEventDate = (eventDate: Date | string) => {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString();
};

export const formatEventDateTime = (eventDate: Date | string) => {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatEventDateTimeLong = (eventDate: Date | string) => {
  const date = new Date(eventDate);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getAdminStatusBadgeClasses = (status: EventStatus) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-primary text-primary-foreground";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export const getPublicCompetitionStatusBadgeClasses = (status: EventStatus) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-700";
    case "Upcoming":
      return "bg-primary text-primary-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getPublicCompetitionCardBorderClasses = (status: EventStatus) => {
  switch (status) {
    case "Active":
      return "border-2 border-green-500/50";
    case "Upcoming":
      return "border-2 border-primary/50";
    default:
      return "border border-border opacity-70";
  }
};

export const getPublicCompetitionTitleClasses = (status: EventStatus) => {
  switch (status) {
    case "Active":
      return "text-green-600 dark:text-green-400";
    case "Upcoming":
      return "text-primary dark:text-primary-light";
    default:
      return "text-muted-foreground";
  }
};
