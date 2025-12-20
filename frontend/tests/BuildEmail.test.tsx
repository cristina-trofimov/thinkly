import buildCompetitionEmail from '../src/components/manageCompetitions/BuildEmail';

describe('buildCompetitionEmail', () => {
  it('generates an email with correct details', () => {
    const formData = {
      name: 'Math Challenge',
      date: '2025-12-25',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Auditorium',
    };

    const email = buildCompetitionEmail(formData);

    expect(email).toContain('Math Challenge');
    expect(email).toContain('🗓 Date:');
    expect(email).toContain('⏰ Start Time: 10:00');
    expect(email).toContain('⌛ Duration: 120 minutes');
    expect(email).toContain('📍 Location: Auditorium');
  });

  it('returns empty string if required fields are missing', () => {
    const incompleteData = {
      name: '',
      date: '',
      startTime: '',
      endTime: '',
    };

    expect(buildCompetitionEmail(incompleteData)).toBe('');
  });

  it('defaults location to TBA if missing', () => {
    const formData = {
      name: 'Science Contest',
      date: '2025-12-26',
      startTime: '09:00',
      endTime: '10:30',
    };

    const email = buildCompetitionEmail(formData);

    expect(email).toContain('📍 Location: TBA');
  });
});