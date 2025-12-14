// Jest mock for uuid module (ESM compatibility)
export const v4 = jest.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7));

export default {
    v4,
};
