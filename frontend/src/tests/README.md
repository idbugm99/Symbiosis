# Testing Documentation

## Setup

The project uses [Vitest](https://vitest.dev/) for unit testing.

### Install Dependencies

```bash
npm install
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (reruns on file changes)
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test src/managers/storage-manager.test.js
```

## Test Structure

Tests are colocated with source files using the pattern `*.test.js`:

```
src/
├── managers/
│   ├── storage-manager.js
│   ├── storage-manager.test.js
│   ├── widget-manager.js
│   ├── widget-manager.test.js
│   ├── event-bus.js
│   └── event-bus.test.js
└── tests/
    ├── setup.js           # Global test setup
    └── README.md          # This file
```

## Test Coverage

Current test coverage:

- ✅ **EventBus** - 100% coverage
  - Event registration (on, once, off)
  - Event emission with data
  - Multiple handlers
  - Error handling
  - Utility methods (clear, getEventNames, etc.)

- ✅ **StorageManager** - ~95% coverage
  - Data persistence (localStorage)
  - Workspace CRUD operations
  - Widget instance management
  - Data enrichment (merge definitions with instances)
  - Import/export functionality

- ✅ **WidgetManager** - ~90% coverage
  - Widget CRUD operations
  - Cell occupation tracking
  - Widget placement validation
  - Available cell finding
  - Workspace switching
  - Event emission on changes

## Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyManager } from './my-manager.js';

describe('MyManager', () => {
  let manager;

  beforeEach(() => {
    // Reset state before each test
    manager = new MyManager();
  });

  describe('someMethod', () => {
    it('should do something', () => {
      const result = manager.someMethod();
      expect(result).toBe(expectedValue);
    });
  });
});
```

### Mocking Dependencies

```javascript
// Mock a module
vi.mock('../data/runtime/temp-data-file.js', () => ({
  default: { /* mock data */ }
}));

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');

// Spy on console methods
const consoleSpy = vi.spyOn(console, 'log');
expect(consoleSpy).toHaveBeenCalledWith('expected message');
```

### Testing EventBus Integration

```javascript
it('should emit events', () => {
  const handler = vi.fn();
  eventBus.on('some:event', handler);

  manager.doSomething();

  expect(handler).toHaveBeenCalledWith(expectedData);
});
```

## Best Practices

1. **One assertion per test** - Keep tests focused and easy to debug
2. **Use descriptive test names** - `should return null when widget not found`
3. **Reset state in beforeEach** - Ensure test isolation
4. **Mock external dependencies** - localStorage, fetch, etc.
5. **Test edge cases** - Empty arrays, null values, errors
6. **Test event emissions** - Verify managers communicate correctly

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage
```

## Future Tests Needed

- [ ] WorkspaceManager tests
- [ ] DrawerManager tests
- [ ] DockManager tests
- [ ] HotkeyManager tests
- [ ] DesktopManager integration tests
- [ ] End-to-end tests for full user workflows

## Troubleshooting

### Tests failing with "localStorage is not defined"

The test setup file (`src/tests/setup.js`) mocks localStorage. If you see this error, ensure Vitest is using the setup file (check `vitest.config.js`).

### Tests failing with module import errors

Ensure you're using ES modules syntax and that `package.json` has `"type": "module"`.

### Happy-DOM errors

If you encounter DOM-related errors, verify `happy-dom` is installed and `environment: 'happy-dom'` is set in `vitest.config.js`.
