import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'test-user-id' } }, error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { first_name: 'Test', last_name: 'User', role: 'ADMIN' }, error: null })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
        in: vi.fn(() => ({
            order: vi.fn(() => ({
                range: vi.fn(async () => ({ data: [], error: null }))
            }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 'new-id' }, error: null }))
        }))
      })),
    })),
    channel: vi.fn(() => ({
        on: vi.fn(() => ({
            subscribe: vi.fn()
        })),
        send: vi.fn(),
        track: vi.fn(),
        presenceState: vi.fn(() => ({})),
    })),
    removeChannel: vi.fn(),
  })),
}))

// Mock window items
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
