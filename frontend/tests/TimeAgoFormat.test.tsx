import { TimeAgoFormat } from "../src/components/helpers/TimeAgoFormat";
import { describe } from 'node:test'

describe("timeFormat", () => {
    it('displays correct relative time for submissions', async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-10-28T10:00:00Z'));

        expect(TimeAgoFormat(new Date('2025-10-27T10:00:00Z').toISOString())).toBe('1 day ago');
        expect(TimeAgoFormat(new Date('2025-10-28T08:00:00Z').toISOString())).toBe('2 hours ago');
        expect(TimeAgoFormat(new Date('2025-10-28T09:59:00Z').toISOString())).toBe('1 minute ago');
        expect(TimeAgoFormat(new Date('2025-10-28T09:59:50Z').toISOString())).toBe('> 1 min ago');
        expect(TimeAgoFormat(new Date('2025-10-28T09:59:59Z').toISOString())).toBe('> 1 min ago');
    })
})