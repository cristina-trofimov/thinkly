export default function buildCompetitionEmail(
  formData: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }) {
  const { name: competitionName} = formData;
  if (!formData.name || !formData.date || !formData.startTime || !formData.endTime) {
    return "";
  }

  const start = new Date(`${formData.date}T${formData.startTime}`);
  const end = new Date(`${formData.date}T${formData.endTime}`);
  const durationMinutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000)
  );

  const formattedDate = start.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `You are invited to participate in the "${competitionName}" competition!

🗓 Date: ${formattedDate}
⏰ Start Time: ${formData.startTime}
⌛ Duration: ${durationMinutes} minutes
📍 Location: ${formData.location || "TBA"}

Please make sure to join on time and be prepared.
More details will be shared during the competition.

Good luck and have fun! 🚀`;
}