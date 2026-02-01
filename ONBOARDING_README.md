# User Onboarding Implementation

## Mga Features na Naidagdag

### 1. OnboardingContext (`src/contexts/OnboardingContext.tsx`)
- Nag-track kung first-time user ba
- May control para sa onboarding flow (start, next, skip, complete)
- Naka-save sa AsyncStorage para hindi na ulit lumabas after completion

### 2. OnboardingTour Component (`src/components/OnboardingTour.tsx`)
- Visual tour na nagpapakita ng bawat tab navigation
- May animated highlights at tooltips
- 5 steps total: Home → Media → Progress → Settings → Add Routine
- May "Skip" button at step indicator (1/5, 2/5, etc.)

### 3. OnboardingOverlay Component (`src/components/OnboardingOverlay.tsx`)
- Simple overlay para sa highlighting

## Paano Gumana ang Flow

1. **First Login**: Kapag nag-login ang user sa unang pagkakataon
2. **Home Screen Load**: Pagdating sa Home tab, automatic na mag-trigger ang onboarding
3. **Tour Sequence**: 
   - Step 0: Highlights Home tab
   - Step 1: Highlights Media tab
   - Step 2: Highlights Progress tab
   - Step 3: Highlights Settings tab
   - Step 4: Highlights Add Routine (floating button)
4. **Completion**: After step 4 o pag nag-skip, naka-save na sa AsyncStorage na tapos na

## Paano I-test

### Option 1: I-reset ang Onboarding
Dagdag ng button sa Settings screen para ma-trigger ulit:

```typescript
import { useOnboarding } from '../../src/contexts/OnboardingContext';

// Sa loob ng Settings component:
const { resetOnboarding } = useOnboarding();

// Button:
<TouchableOpacity onPress={resetOnboarding}>
  <Text>Reset Onboarding Tour</Text>
</TouchableOpacity>
```

### Option 2: I-clear ang AsyncStorage Manually
Sa terminal, run sa simulator/device:
```javascript
// Sa React Native Debugger console:
import AsyncStorage from '@react-native-async-storage/async-storage';
AsyncStorage.removeItem('@ritmo_onboarding_completed');
```

### Option 3: Fresh Install
1. Uninstall ang app
2. Reinstall
3. Login - automatic na lalabas ang onboarding

## Customization

### I-edit ang Messages (Tagalog)
Sa `src/components/OnboardingTour.tsx`, hanapin ang `getStepConfig()` function:

```typescript
case 0: // Home
  return {
    title: 'Home',
    description: 'Dito mo makikita ang lahat ng iyong routines...',
    // ...
  };
```

### I-adjust ang Position
Same file, sa `getStepConfig()`, i-edit ang `highlightPosition`:
```typescript
highlightPosition: {
  left: leftOffset,
  bottom: tabBarBottom,
  width: tabWidth,
  height: scaleHeight(85),
}
```

### I-customize ang Colors
Sa `src/components/OnboardingTour.tsx` styles:
- `backgroundColor`: '#5DD4B4' - highlight color
- `borderColor`: '#5DD4B4' - border ng highlight

## Mga Kondisyon para Lumabas

- ✅ First-time user (walang `@ritmo_onboarding_completed` sa AsyncStorage)
- ✅ Walang parental lock enabled (para makita ang 5 tabs)
- ✅ Naka-focus sa Home screen

## Notes

- Ang onboarding ay lalabas lang once per user
- Hindi lalabas kung may parental lock (kasi limited ang tabs)
- Automatic delay ng 500ms para smooth ang transition
- May pulse animation sa highlighted tab
- Responsive sa lahat ng screen sizes (phone at tablet)
