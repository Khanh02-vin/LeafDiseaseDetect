# OrangeDetect Repository Guidelines for Agentic Agents

## Build, Test, and Development Commands
- `npm install` - Install dependencies (rerun after adding native modules)
- `npm start` / `npm run dev` - Launch Expo dev server with QR pairing
- `npm run ios` / `npm run android` - Build and install native shell via expo run
- `npm test` - Run Jest with React Native Testing Library
- `npm test -- --testPathPattern="filename.test.ts"` - Run single test file
- `npm test -- --testNamePattern="test name"` - Run tests by name pattern
- `npx tsc --noEmit` - TypeScript type checking without compilation

## Code Style & Architecture
- **TypeScript**: Strict mode enabled, share interfaces via `src/models/`
- **Components**: Functional React components, 2-space indentation, `PascalCase` filenames
- **Hooks/Utils**: `camelCase` naming for hooks, helpers, and Zustand selectors
- **Styles**: Co-locate with `StyleSheet.create`, reuse from `src/constants/colors.ts`
- **Import Order**: React → React Native → third-party → local modules
- **Services**: Use singleton pattern with `getInstance()` method
- **Async Work**: Keep inside services or hooks, use promises with typed responses

## Error Handling & Logging
- Use try-catch blocks with Logger utility for consistent logging
- Import Logger: `import { Logger, LogCategory } from '../utils/Logger'`
- Log levels: `Logger.debug()`, `Logger.info()`, `Logger.warn()`, `Logger.error()`, `Logger.success()`
- Categories: `LogCategory.APP`, `LogCategory.ML`, `LogCategory.INIT`, etc.
- Never use emojis in code, comments, or variable names

## Testing Guidelines
- Place tests beside features: `src/services/__tests__/ServiceName.test.ts`
- Mock native modules with `jest.mock()` for camera, filesystem, TFLite APIs
- Test error scenarios, edge cases, and performance critical paths
- Use `@testing-library/react-native` for component testing
- Mock dependencies in test files, not in shared test setup

## Critical Performance Rules
- Memory: Use `Uint8Array.from(atob(), c => c.charCodeAt(0))` for base64 conversion
- Async: Always `await` initialization before using services
- Images: Use `expo-image-manipulator` for resizing, avoid manual pixel loops
- ML: Implement adaptive confidence thresholds (0.4-0.8 range) based on image quality

## Security & Configuration
- Store secrets in `.env.local`, never commit API keys or model weights
- Update `app.json` and `assets/model/` together for OTA compatibility
- Run `npx expo-doctor` before release branches