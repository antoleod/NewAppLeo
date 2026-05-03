# 📝 Ejemplos de Uso de i18n

## Ejemplo 1: Home Screen

### Antes (Sin i18n)
```typescript
// app/(app)/(tabs)/home.tsx
export default function HomeScreen() {
  const { language } = useLocale();
  const locale = localeTag(language);
  
  return (
    <View>
      <Text>
        {language === 'fr' ? 'Bonjour' : language === 'es' ? 'Buenos días' : 'Good morning'}
      </Text>
      
      <Text>{language === 'fr' ? 'SANTÉ' : 'HEALTH'}</Text>
      
      <Text>{language === 'fr' ? 'ALIMENTATION' : 'FEEDING'}</Text>
      
      <ActionButton 
        label={language === 'fr' ? 'Comidas' : 'Food'} 
        icon="🍽️" 
      />
    </View>
  );
}
```

### Después (Con i18n)
```typescript
// app/(app)/(tabs)/home.tsx
import { useTranslation } from '@/hooks/useTranslation';

export default function HomeScreen() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('greeting.morning')}</Text>
      
      <Text>{t('health.status')}</Text>
      
      <Text>{t('food.status')}</Text>
      
      <ActionButton 
        label={t('entry.food')} 
        icon="🍽️" 
      />
    </View>
  );
}
```

## Ejemplo 2: Entry Form (Comidas)

### Antes
```typescript
<Input
  label={language === 'fr' ? 'Aliment' : 'Food'}
  placeholder={language === 'fr' ? 'Pomme, riz...' : 'Apple, rice...'}
/>

<Text>{language === 'fr' ? 'Quantité' : 'Quantity'}</Text>

<Pressable>
  <Text>{language === 'fr' ? 'Peu' : 'Little'}</Text>
</Pressable>
<Pressable>
  <Text>{language === 'fr' ? 'Moyen' : 'Medium'}</Text>
</Pressable>
<Pressable>
  <Text>{language === 'fr' ? 'Beaucoup' : 'Lots'}</Text>
</Pressable>
```

### Después
```typescript
const { t } = useTranslation();

<Input
  label={t('food.foodLabel')}
  placeholder={t('food.foodPlaceholder')}
/>

<Text>{t('food.quantityLabel')}</Text>

<Pressable>
  <Text>{t('food.little')}</Text>
</Pressable>
<Pressable>
  <Text>{t('food.medium')}</Text>
</Pressable>
<Pressable>
  <Text>{t('food.lots')}</Text>
</Pressable>
```

## Ejemplo 3: Vacunas

### Antes
```typescript
<Text>
  {language === 'fr' ? 'VACCINS PROGRAMMÉS' : 'SCHEDULED VACCINES'}
</Text>

<Text>
  {language === 'fr' ? 'Dose ' : 'Dose '}
  {vaccine.payload?.vaccineDose}
  {vaccine.payload?.hasReminder ? (language === 'fr' ? ' • 🔔 Rappel' : ' • 🔔 Reminder') : ''}
</Text>
```

### Después
```typescript
const { t } = useTranslation();

<Text>{t('vaccine.scheduled')}</Text>

<Text>
  {t('vaccine.dose')}
  {vaccine.payload?.vaccineDose}
  {vaccine.payload?.hasReminder ? ` • 🔔 ${t('vaccine.reminder')}` : ''}
</Text>
```

## Ejemplo 4: Mensajes Dinámicos

### Patrón 1: Conteos
```typescript
// JSON:
{
  "stats": {
    "foodCount": "Has dado {count} comidas hoy"
  }
}

// Componente:
const { format } = useTranslation();
<Text>{format('stats.foodCount', { count: 5 })}</Text>
// => "Has dado 5 comidas hoy"
```

### Patrón 2: Saludos Personalizados
```typescript
// JSON:
{
  "greetings": {
    "personal": "¡Hola {name}! ¡Qué día tan hermoso! ✨"
  }
}

// Componente:
const { format } = useTranslation();
const babyName = profile?.babyName || 'Leo';
<Text>{format('greetings.personal', { name: babyName })}</Text>
```

## Ejemplo 5: Lotes de Traducciones

```typescript
const { batch } = useTranslation();

// En lugar de hacer 10 llamadas a t()
const labels = batch([
  'food.foodLabel',
  'food.quantityLabel',
  'food.little',
  'food.medium',
  'food.lots',
  'food.allergy',
  'food.intolerance',
  'food.rash',
  'food.vomit',
  'food.diarrhea',
]);

// Usar después:
<Input label={labels['food.foodLabel']} />
<Text>{labels['food.quantityLabel']}</Text>
// etc...
```

## Ejemplo 6: Componentes Reutilizables

```typescript
// components/FoodForm.tsx
import { useTranslation } from '@/hooks/useTranslation';

interface FoodFormProps {
  onSubmit: (food: FoodEntry) => void;
}

export function FoodForm({ onSubmit }: FoodFormProps) {
  const { t } = useTranslation();
  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');

  return (
    <View>
      <Input
        label={t('food.foodLabel')}
        value={foodName}
        onChangeText={setFoodName}
        placeholder={t('food.foodPlaceholder')}
      />
      
      <View style={{ marginTop: 12 }}>
        <Text style={styles.label}>{t('food.quantityLabel')}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { key: 'little', label: t('food.little') },
            { key: 'medium', label: t('food.medium') },
            { key: 'lots', label: t('food.lots') },
          ].map(({ key, label }) => (
            <QuantityButton
              key={key}
              label={label}
              selected={quantity === key}
              onPress={() => setQuantity(key)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
```

## Ejemplo 7: Condiciones Multiidioma

```typescript
const { t, language } = useTranslation();

// Si necesitas lógica diferente por idioma:
const dateFormat = language === 'fr' ? 'DD/MM/YYYY' : 'MM/DD/YYYY';

// O con ternario simple:
<Text>{t(quantity === 'little' ? 'food.little' : 'food.medium')}</Text>
```

## Migración Paso a Paso

### Paso 1: Identificar Strings
```typescript
// Buscar estos patrones:
// - language === 'fr' ? ... : ...
// - language === 'es' ? ... : ...
// - ${language === ...}
```

### Paso 2: Agregar a JSON
```json
{
  "myFeature": {
    "title": "Mi título",
    "description": "Mi descripción"
  }
}
```

### Paso 3: Usar en Componente
```typescript
const { t } = useTranslation();
<Text>{t('myFeature.title')}</Text>
<Text>{t('myFeature.description')}</Text>
```

### Paso 4: Probar en Todos los Idiomas
- 🇫🇷 Cambiar a francés
- 🇪🇸 Cambiar a español
- 🇬🇧 Cambiar a inglés
- 🇳🇱 Cambiar a holandés

## Performance Tips

1. **Memoizar traducciones frecuentes**
```typescript
const foodLabels = useMemo(
  () => batch(['food.foodLabel', 'food.quantityLabel', 'food.little']),
  [language]
);
```

2. **Evitar llamadas en loops**
```typescript
// ❌ Malo
{items.map(item => <Text>{t(`items.${item}`)}</Text>)}

// ✅ Bueno
const itemLabels = batch(items.map(i => `items.${i}`));
{items.map(item => <Text>{itemLabels[`items.${item}`]}</Text>)}
```

3. **Usar variables locales para strings comunes**
```typescript
const { t } = useTranslation();
const save = t('common.save');
const cancel = t('common.cancel');

// Usa save y cancel múltiples veces...
```

## Testing

```typescript
import { getTranslation } from '@/lib/i18n';

describe('Translations', () => {
  it('should return spanish translation', () => {
    expect(getTranslation('es', 'food.history')).toBe('HISTORIAL DE COMIDAS');
  });

  it('should return default value if key not found', () => {
    expect(getTranslation('es', 'nonexistent.key', 'default')).toBe('default');
  });

  it('should format with variables', () => {
    expect(formatTranslation('es', 'greeting', { name: 'Juan' }))
      .toContain('Juan');
  });
});
```
